# MOVIEAI Recommendation Engine

Content-based + personalized hybrid recommender for the MOVIEAI catalogue (4,803 movies), exposed through a FastAPI service the existing React frontend can call later. **The frontend is not touched by this project.** The legacy engine (`src/recommender.py`) is preserved unchanged and is used as the evaluation baseline.

> The engine only returns movie *information* (metadata, posters paths, reasons). It never plays movies; trailers remain a frontend concern.

## 1. Project tree

```
movieai-recommendation-engine/
├── data/MOVIEAI_Movies_Enriched_For_Recommendation.csv   # unmodified copy of your CSV (never written to)
├── movieai/
│   ├── config.py            # all weights / TF-IDF / personalization constants, env overrides
│   ├── data_loader.py       # load + validate + startup quality report
│   ├── preprocessor.py      # text, title, genre, director normalisation
│   ├── feature_builder.py   # TF-IDF (plot), multi-label genres, directors; artifact save/load
│   ├── similarity_engine.py # component similarities + weighted content score (formula documented)
│   ├── search.py            # title search + ambiguity resolution (lexical, independent of ranking)
│   ├── recommender.py       # similar / profile / seed / multi_seed / discovery, MMR diversity
│   ├── personalization.py   # likes, dislikes, ratings, favorites, watchlist, history -> preference
│   ├── explanations.py      # evidence-based reasons
│   ├── schemas.py           # Pydantic v2 request/response models
│   ├── main.py              # FastAPI app factory
│   ├── cli.py               # command line
│   └── evaluation.py        # repeatable evaluation + ranking metrics
├── src/recommender.py       # LEGACY engine, unchanged (baseline)
├── scripts/legacy_evaluate.py
├── tests/                   # 80 tests (small fixtures + real-data integration)
├── artifacts/               # fitted TF-IDF/matrices + manifest (generated; safe to delete)
├── reports/                 # evaluation CSVs, summary JSON, comparison report
├── requirements.txt  requirements-dev.txt  .env.example  pytest.ini
```

## 2. Setup (Windows / PowerShell)

Python 3.10+ is required.

```powershell
cd E:\Desktop\MovieRecommendation\movieai-recommendation-engine
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python -m pytest                      # 80 tests
python -m movieai.cli validate        # dataset report
python -m movieai.evaluation          # regenerates reports/
uvicorn movieai.main:app --reload --port 8000
```

Interactive API docs: <http://localhost:8000/docs>.

Safe adoption: extract the zip into a **new folder** (or merge it; the only file it overwrites is a byte-identical CSV). `src/recommender.py` is left as your original, so nothing existing breaks.

## 3. How the model works

For a pair of movies the content score is a weighted mix of three independent, separately reported signals:

| signal | representation | default weight |
|---|---|---|
| plot | TF-IDF (1–2 grams, `max_features=50000`, `min_df=2`, `sublinear_tf`) over cleaned synopses, English function words removed only from English text | 0.70 |
| genre | multi-label vector over the **complete** `Genres` list (20 genres), IDF-weighted, L2-normalised cosine (so extra labels never add similarity) | 0.25 |
| director | one-hot director (`\|` separates co-directors; commas stay inside names such as "George Tillman, Jr.") | 0.05 |

```
content = (Σ_k w_k·a_k·s_k) / W_pair · (W_pair / W_seed)^γ
```
`a_k` = both movies have signal *k*; `W_pair` = weight backed by data for the pair; `W_seed` = weight the seed could ever use; `γ = 1` by default.
* A seed with no synopsis is scored on genre + director only and **no candidate is penalised for it**.
* A *candidate* with no synopsis earns no plot credit (otherwise a movie with no data and matching genres would score ~0.8 on genre alone).
* **Plot calibration** — raw TF-IDF cosine between related synopses is ~0.1–0.3 while genre cosine reaches 1.0, which is why the legacy "65/30/5" engine was effectively genre-driven (59 % of its recommendations had almost no plot overlap). The plot cosine is divided by a corpus reference (95th percentile of each movie's best neighbour, ≈0.305) and clipped to [0,1]. The raw cosine is always returned as `plot_raw`. Consequently `Similarity_Score` is a *calibrated* score, not a raw cosine; 1.0 does not mean "identical".

Everything is sparse; there is no n×n matrix. Fitted features are built once and cached in `artifacts/` (manifest = dataset SHA-256 + model parameters + library versions). Startup ≈2 s cold, <1 s from cache; a query takes ≈10 ms.

Optional re-ranking signals (all **off** by default, each visible in `Ranking_Components`): Bayesian quality, popularity, vote count, year proximity, language match, runtime proximity (`RankingConfig` in `config.py`). MMR diversity: `diversity_lambda` ∈ [0,1], 1 = off (default).

**Explanations** are generated only from computed evidence: shared TF-IDF terms, shared genre labels, matching director, the specific liked movie a recommendation resembles, configured favorite genres/languages. Weak matches say so.

## 4. Search & title resolution

`Inception` auto-resolves only because exactly one record has that exact title. `Avengers` returns candidates (*The Avengers (2012)*, *Avengers: Age of Ultron (2015)*) — it is **never** guessed. `Batman` returns both 1966 and 1989 films; `Batman (1989)` resolves. Tiers: exact → article/punctuation-insensitive → prefix → all words → substring → typo tolerance. Similarity is never used to pick a movie. All later calls use `Movie_ID`.

CLI default-match policy: auto-select only for a unique exact title (or a `(YYYY)` hint); otherwise list candidates and prompt (interactive) or exit with code 2 (scripts). `--first-match` is an explicit opt-in convenience that prints what it picked.

## 5. CLI examples

```powershell
python -m movieai.cli validate
python -m movieai.cli build --force                      # rebuild artifacts
python -m movieai.cli search "avengers"
python -m movieai.cli recommend "Inception" --top 10 --components
python -m movieai.cli recommend avengers --pick 1
python -m movieai.cli recommend "Batman (1989)"
python -m movieai.cli recommend --movie-id 27205 --diversity-lambda 0.7
python -m movieai.cli recommend avengers --first-match
```

## 6. API

| method | path | purpose |
|---|---|---|
| GET | `/health` | readiness, dataset/model info |
| GET | `/movies/search?q=avengers&limit=10` | candidates (`auto_resolved`, `resolved_movie_id`) |
| GET | `/movies/{movie_id}` | metadata |
| GET | `/recommendations/movie/{movie_id}?limit=10&diversity_lambda=1&language=&exclude_seen=false&seen=1&seen=2` | similar movies. `exclude_seen` uses the `seen` IDs the client supplies (the server stores no user data) |
| POST | `/recommendations/personalized` | personalized recs from a profile in the body |

Errors: 404 unknown `Movie_ID`, 422 invalid input (blank query, `limit` outside 1–100, contradictory like+dislike, rating out of range, unknown mode…), 503 engine not ready.

`GET /movies/search?q=avengers`
```json
{"query":"avengers","auto_resolved":false,"resolved_movie_id":null,
 "results":[{"Movie_ID":24428,"Title":"The Avengers","Release_Year":2012,"Genres":"Science Fiction|Action|Adventure",
             "Poster_Web_Path":"/posters/The_Avengers_24428.jpg","poster_path":"/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg","Match_Type":"exact_normalized"},
            {"Movie_ID":99861,"Title":"Avengers: Age of Ultron","Release_Year":2015,"Match_Type":"prefix","...":"..."}]}
```

`GET /recommendations/movie/27205?limit=2` (first result shown)
```json
{"mode":"similar","seed_movie_id":27205,"count":2,"fallback_reason":null,"warnings":[],"excluded_count":0,
 "results":[{"Movie_ID":10133,"Title":"Cypher","Release_Year":2002,"Genres":"Thriller|Science Fiction|Mystery",
   "Director":"Vincenzo Natali","Vote_Average":6.7,"Poster_Web_Path":"/posters/Cypher_10133.jpg","poster_path":"/7wYwmDuCbdKF7sAcLj7eqrNaiam.jpg",
   "Similarity_Score":0.5459838861173383,
   "Score_Components":{"content":0.545984,"plot":0.486216,"plot_raw":0.148198,"genre":0.82253,"director":0.0},
   "Ranking_Components":{},
   "Recommendation_Reasons":["Similar plot themes (shared terms: corporate espionage)","Shared genres: Thriller, Science Fiction, Mystery"]}]}
```

`POST /recommendations/personalized`
```powershell
$body = '{"profile":{"likes":[27205,155],"dislikes":[862],"ratings":{"603":5},"watch_history":[19995],"favorite_genres":["Science Fiction"]},"mode":"profile","limit":2}'
Invoke-RestMethod -Method Post -Uri http://localhost:8000/recommendations/personalized -ContentType "application/json" -Body $body
```
Response (first result): `Title: "The Dark Knight Rises"`, `Score_Components: {"preference":0.667,"item_preference":0.800,"favorite_genre_match":0.0}`, `Recommendation_Reasons: ["Similar to “The Dark Knight”, which you liked (shared terms: dent batman, attorney harvey, harvey dent)"]`.

Request fields: `profile{likes,dislikes,favorites,watchlist,watch_history,ratings,favorite_genres,preferred_languages}`, `mode` (`profile` | `seed` | `multi_seed` | `discovery`), `seed_movie_id`, `seed_movie_ids`, `limit`, `exclude_watched` (default true), `exclude_watchlist` (false), `exclude_disliked` (true), `override_exclusions`, `language`, `diversity_lambda`.

### Personalization rules
* like +1.0, favorite +1.5, dislike −1.5, rating centred on the scale midpoint (3/5 = neutral, 0.5–5 default), **watch history +0.1 and watchlist +0.2 only** (exposure/intent, not taste). Per-movie sum clipped to ±2. All constants in `PersonalizationConfig`.
* Preference = 0.7·best match to a liked movie + 0.3·weighted mean, minus a bounded (≤0.5×) similarity to disliked movies, so dislikes can never empty the profile. Multi-taste users are not averaged into one blob.
* `seed` mode = 70 % content similarity to the seed + 30 % preference. `profile` = preference only. `discovery` = preference + genre novelty with a quality gate. `multi_seed` = several explicit seeds.
* Watched = history ∪ likes ∪ favorites ∪ rated. Watchlist is **not** watched. Unknown IDs are ignored with a warning; no history → content-only fallback (with `fallback_reason`); no seed and no history → quality-ranked fallback, clearly labelled.

## 7. Rebuilding artifacts

Artifacts rebuild automatically when the CSV, TF-IDF/model settings or scikit-learn/numpy versions change. To force:
```powershell
python -m movieai.cli build --force      # or delete artifacts\features.joblib
```
Never edit the CSV in place; replace it, then rebuild and re-run `python -m movieai.evaluation` and compare with `reports/` to catch regressions.

## 8. Evaluation: old vs new (same 10 movies, same CSV)

Generated by `python -m movieai.evaluation` → `reports/evaluation_top10.csv` (required columns + `Plot_Similarity_Calibrated`), `reports/baseline_legacy_top10.csv`, `reports/evaluation_summary.json`, `reports/evaluation_report.md` (side-by-side lists).

**There are no ground-truth relevance labels, so no precision/recall/NDCG is claimed.** Precision@K, Recall@K, NDCG@K and MRR are implemented and unit-tested; supply `--labels file.csv` (`Source_Movie_ID,Relevant_Movie_ID[,Relevance]`) to compute them. What was measured instead are label-free diagnostics:

| diagnostic (mean of 10 lists) | legacy | new |
|---|---|---|
| recommendations with weak plot overlap (raw cosine < 0.05) | 59 % | 7 % |
| mean raw plot cosine to the seed | 0.058 | 0.113 |
| mean genre cosine to the seed | 0.957 | 0.694 |
| intra-list diversity (1 − mean pairwise similarity) | 0.725 | 0.776 |
| title-based franchise proxy found (10 franchise titles exist) | 6 | 8 |
| top-10 overlap between engines (Jaccard) | 0.28 | |

Caveats: the plot yardstick is the new engine's own TF-IDF (biased toward it); the franchise proxy is a title-containment heuristic with false positives (*Raise the Titanic*). Integrity: 100 rows, 0 self-recommendations, 0 duplicates, 0 non-finite scores, 0 failed queries; ≈9 ms per query; MMR experiment: λ=0.8 raises diversity 0.776→0.808 for −0.006 mean content score; λ=0.6 → 0.844 for −0.026 (default remains off).

**Qualitative review (my reading of the top-10 lists; subjective, not a metric):**
* Better: *The Dark Knight* (Batman family + *Law Abiding Citizen*, vs. legacy's generic crime thrillers), *Deadpool* (Fantastic Four/Spider-Man vs. MacGruber/Wild Hogs comedies), *Titanic* (*Raise the Titanic*, *The Notebook*, *Shadowlands* vs. *Fifty Shades*), *The Conjuring*, *Toy Story* (sequels first, no Garfield tail), *The Notebook* (*The Longest Ride* first).
* Weaker or mixed: *The Matrix* (*Matrix Reloaded* is #5, legacy had it #1; *Revolutions* absent), *The Avengers* (*Independence Day: Resurgence* above *Age of Ultron*), *Inception* (*Open Road*, *Stone Cold* are weak; no *Interstellar*/Nolan), *The Notebook* (*Two Brothers*, *Easy Money* are lexical noise), *Toy Story* ranks 5–10 (*Man on the Moon*, *For Your Consideration*) are weak, *Interstellar* misses *The Martian*, which legacy found.
* The plot reference quantile (0.95) and γ were chosen by reviewing these same 10 lists, so they are **tuned on the evaluation set**; treat them as a starting point, not validated optima.

## 9. Known limitations / next improvements

1. No labelled relevance data → no formal accuracy numbers. Next: collect clicks/likes or hand-label ~50 seeds, then run `--labels` and tune weights/calibration on a held-out split.
2. TF-IDF is lexical: it misses paraphrased themes (Interstellar ↔ The Martian) and is noisy on ~300-character synopses. Next: evaluate a sentence-embedding plot backend against this baseline (not implemented here: it could not be measured in this environment).
3. Franchise handling relies on shared synopsis wording and director; there is no franchise/collection field. No titles are special-cased.
4. Only three content signals; cast, keywords, studio and country are unused. `Genre_Group`, `Recommendation_Text` columns are ignored on purpose.
5. 28 movies have no genres and 4 no description (reported at startup); they are ranked on the remaining signals.
6. Personalization is stateless: the client sends the profile. No database, no collaborative filtering yet. When interaction data exists, add a per-movie `collaborative` score array and blend it through `RankingConfig`; the hook is not implemented.
7. Dislike/like constants, MMR default and optional ranking signals are untuned.
8. Tests were run on Linux (Python 3.12) against two dependency sets (pandas 3.0/numpy 2.4/sklearn 1.8 and pandas 2.2/numpy 1.26/sklearn 1.5). The code avoids OS-specific APIs but **has not been executed on Windows/PowerShell** by me.
9. No authentication or rate limiting on the API; add both before any public deployment.

## 10. Connecting the React frontend later (no frontend changes now)

1. Run the API (`uvicorn movieai.main:app --port 8000`) and allow your dev origin: `$env:MOVIEAI_CORS_ORIGINS="http://localhost:5173"` (Vite) — or proxy `/api` to `http://localhost:8000` in `vite.config`.
2. Search box → `GET /movies/search?q=…`. If `auto_resolved` is true use `resolved_movie_id`; otherwise show `results` and let the user choose.
3. Selected `Movie_ID` → `GET /recommendations/movie/{id}?limit=10`. Field names match the CSV (`Title`, `Poster_Web_Path`, `poster_path`, …); show `Recommendation_Reasons` under each card; `Score_Components` is for debugging.
4. When the frontend tracks likes/ratings, send them to `POST /recommendations/personalized`.

```js
const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export async function search(q) { return (await fetch(`${API}/movies/search?q=${encodeURIComponent(q)}`)).json(); }
export async function similar(id, limit = 10) { return (await fetch(`${API}/recommendations/movie/${id}?limit=${limit}`)).json(); }
```
