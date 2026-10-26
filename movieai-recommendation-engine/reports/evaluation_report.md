# MOVIEAI evaluation report

> **No ground-truth relevance labels exist for this dataset.** Numbers below are label-free diagnostics, not precision/accuracy. Judge quality from the top-10 lists (qualitative).

## Data quality

| check | value |
|---|---|
| source_sha256 | 1eb1746aef9fb614f5941cf34270f62c89a283afc29a69a402f1fff5987ef674 |
| raw_rows | 4803 |
| records | 4803 |
| unique_movie_ids | 4803 |
| duplicate_ids | 0 |
| invalid_id_rows_dropped | 0 |
| missing_descriptions | 4 |
| missing_genres | 28 |
| genres_from_fallback | 0 |
| missing_directors | 30 |
| invalid_or_missing_years | 1 |
| valid_poster_paths | 4526 |
| non_english_descriptions | 2 |
| duplicate_titles | 6 |

## Integrity & runtime

```
{
  "integrity_new": {
    "self_recommendations": 0,
    "duplicate_recommendations": 0,
    "non_finite_scores": 0,
    "rows": 100
  },
  "runtime": {
    "build_seconds": 1.222,
    "query_ms_mean": 4.59,
    "query_ms_max": 5.83,
    "legacy_build_seconds": 2.18
  },
  "failed_queries": []
}
```

## Score distribution (new engine, top-10 lists)

```
{
  "Similarity_Score": {
    "count": 100,
    "mean": 0.43360488,
    "std": 0.13253297628041708,
    "min": 0.291867,
    "p25": 0.35031625,
    "median": 0.391273,
    "p75": 0.48863850000000003,
    "max": 1.0
  },
  "Plot_Similarity": {
    "count": 100,
    "mean": 0.11328764999999999,
    "std": 0.0623129453335942,
    "min": 0.035055,
    "p25": 0.06972,
    "median": 0.102157,
    "p75": 0.141196,
    "max": 0.419166
  },
  "Genre_Similarity": {
    "count": 100,
    "mean": 0.69440648,
    "std": 0.2603544532646784,
    "min": 0.0,
    "p25": 0.543469,
    "median": 0.7378175,
    "p75": 0.90617775,
    "max": 1.0
  },
  "Director_Similarity": {
    "count": 100,
    "mean": 0.07,
    "std": 0.25514701644346144,
    "min": 0.0,
    "p25": 0.0,
    "median": 0.0,
    "p75": 0.0,
    "max": 1.0
  }
}
```

## Legacy vs new (means over the 10 source movies)

| diagnostic | legacy | new |
|---|---|---|
| mean_plot_raw | 0.058 | 0.113 |
| weak_plot_share | 0.590 | 0.070 |
| genre_only_share | 0.590 | 0.070 |
| mean_genre | 0.957 | 0.694 |
| intra_list_diversity | 0.725 | 0.776 |

Mean Jaccard overlap of the two top-10 lists: **0.28**

`mean_plot_raw` uses the new engine's TF-IDF as yardstick, so it favours the new engine; `weak_plot_share` = share of recommendations whose raw plot cosine is below 0.05; `genre_only_share` = weak plot AND genre cosine >= 0.5.

### Franchise proxy (title-only heuristic, not ground truth)

| source | franchise titles in dataset | found (legacy) | found (new) |
|---|---|---|---|
| Inception | 0 | 0 | 0 |
| Deadpool | 0 | 0 | 0 |
| The Notebook | 0 | 0 | 0 |
| The Avengers | 1 | 1 | 1 |
| The Dark Knight | 2 | 1 | 2 |
| Titanic | 2 | 0 | 1 |
| Interstellar | 0 | 0 | 0 |
| Toy Story | 2 | 2 | 2 |
| The Matrix | 2 | 1 | 1 |
| The Conjuring | 1 | 1 | 1 |

## Diversity (MMR) experiment

```
{
  "1.0": {
    "mean_content_score": 0.43360488,
    "mean_intra_list_diversity": 0.775858218114676,
    "mean_plot_raw": 0.11328763879835606
  },
  "0.8": {
    "mean_content_score": 0.42775104999999997,
    "mean_intra_list_diversity": 0.8083783872234379,
    "mean_plot_raw": 0.11036819567903874
  },
  "0.6": {
    "mean_content_score": 0.40775459999999997,
    "mean_intra_list_diversity": 0.8439173100405697,
    "mean_plot_raw": 0.10576080383732915
  }
}
```

## Top-10 lists (legacy | new)

### Inception

| # | legacy | new | new reasons |
|---|---|---|---|
| 1 | Cypher | Cypher | Similar plot themes (shared terms: corporate espionage) | Shared genres: Thriller, Science Fiction, Mystery |
| 2 | Sky Captain and the World of Tomorrow | Renaissance | Similar plot themes (shared terms: corporate espionage) | Shared genres: Action, Science Fiction |
| 3 | Paycheck | Source Code | Some plot overlap (shared terms: another person, life) | Shared genres: Thriller, Science Fiction, Mystery |
| 4 | Minority Report | Minority Report | Some plot overlap (shared terms: targets, another) | Shared genres: Action, Thriller, Science Fiction, Mystery |
| 5 | Congo | Mission: Impossible - Rogue Nation | Some plot overlap (shared terms: skilled, impossible) | Shared genres: Action, Thriller, Adventure |
| 6 | Knowing | The Net | Some plot overlap (shared terms: another person, target, life) | Shared genres: Action, Thriller, Mystery |
| 7 | Oblivion | Open Road | Some plot overlap (shared terms: old life) | Shared genres: Action, Thriller |
| 8 | The Maze Runner | Tinker Tailor Soldier Spy | Some plot overlap (shared terms: espionage, skilled, life) | Shared genres: Thriller, Mystery |
| 9 | Star Trek II: The Wrath of Khan | Stone Cold | Some plot overlap (shared terms: infiltrating) | Shared genres: Action, Thriller |
| 10 | Source Code | Transformers: Revenge of the Fallen | Shared genres: Action, Science Fiction, Adventure |

### Deadpool

| # | legacy | new | new reasons |
|---|---|---|---|
| 1 | MacGruber | Fantastic Four | Some plot overlap (shared terms: new abilities, turned, former) | Shared genres: Action, Adventure |
| 2 | Charlie's Angels: Full Throttle | Spider-Man 2 | Some plot overlap (shared terms: alter ego, leaves, man) | Shared genres: Action, Adventure |
| 3 | The Golden Child | Silent Trigger | Similar plot themes (shared terms: former special, special forces, armed) | Shared genres: Action |
| 4 | The Dukes of Hazzard | Babylon A.D. | Some plot overlap (shared terms: turned mercenary, new) | Shared genres: Action, Adventure |
| 5 | Johnny English | MacGruber | Shared genres: Action, Adventure, Comedy |
| 6 | The Last Dragon | Valley of the Wolves: Iraq | Some plot overlap (shared terms: special forces, life) | Shared genres: Action, Adventure |
| 7 | Wild Hogs | Spider-Man 3 | Some plot overlap (shared terms: alter ego, man, new) | Shared genres: Action, Adventure |
| 8 | Hudson Hawk | The Amazing Spider-Man | Some plot overlap (shared terms: alter ego, powers, former, man, life) | Shared genres: Action, Adventure |
| 9 | Airborne | Bronson | Some plot overlap (shared terms: alter ego, man) | Shared genres: Action |
| 10 | All About the Benjamins | Monkeybone | Some plot overlap (shared terms: alter ego) | Shared genres: Action, Adventure, Comedy |

### The Notebook

| # | legacy | new | new reasons |
|---|---|---|---|
| 1 | The Longest Ride | The Longest Ride | Some plot overlap (shared terms: older man, couple, love) | Shared genres: Romance, Drama |
| 2 | The Reader | The Switch | Similar plot themes (shared terms: seven years, years later, woman, old) | Shared genres: Romance, Drama |
| 3 | Love in the Time of Cholera | Two Brothers | Similar plot themes (shared terms: years later, reunited, separated, taken) | Shared genres: Drama |
| 4 | Iris | Easy Money | Similar plot themes (shared terms: story centered, centered around, man) | Shared genres: Drama |
| 5 | The Age of Innocence | The Hundred-Foot Journey | Similar plot themes (shared terms: story centered, centered around) | Shared genres: Drama |
| 6 | Before Sunrise | Proud | Similar plot themes (shared terms: war ii, world war, story) | Shared genres: Drama |
| 7 | The Switch | Cradle Will Rock | Similar plot themes (shared terms: centered around, story) | Shared genres: Drama |
| 8 | Lovely, Still | Love Ranch | Similar plot themes (shared terms: story couple) | Shared genres: Drama |
| 9 | Y Tu Mamá También | Love in the Time of Cholera | Some plot overlap (shared terms: old man, love, war, years) | Shared genres: Romance, Drama |
| 10 | Mao's Last Dancer | The Reader | Some plot overlap (shared terms: years later, older, war, story, woman) | Shared genres: Romance, Drama |

### The Avengers

| # | legacy | new | new reasons |
|---|---|---|---|
| 1 | Avengers: Age of Ultron | Independence Day: Resurgence | Similar plot themes (shared terms: back brink, world back) | Shared genres: Science Fiction, Action, Adventure |
| 2 | Independence Day: Resurgence | Avengers: Age of Ultron | Some plot overlap (shared terms: peacekeeping, emerges, global, unexpected) | Shared genres: Science Fiction,  |
| 3 | John Carter | Allegiant | Some plot overlap (shared terms: agency known, world) | Shared genres: Science Fiction, Adventure |
| 4 | Allegiant | Superman IV: The Quest for Peace | Some plot overlap (shared terms: spanning, global, known, world) | Shared genres: Science Fiction, Action, Adv |
| 5 | Superman IV: The Quest for Peace | Captain America: The Winter Soldier | Shared genres: Science Fiction, Action, Adventure |
| 6 | Serenity | Timecop | Some plot overlap (shared terms: agency, security) | Shared genres: Science Fiction, Action |
| 7 | Captain America: The Winter Soldier | TRON: Legacy | Shared genres: Science Fiction, Action, Adventure |
| 8 | The Blood of Heroes | Snowpiercer | Some plot overlap (shared terms: globe, global) | Shared genres: Science Fiction, Action |
| 9 | TRON: Legacy | The Blood of Heroes | Shared genres: Science Fiction, Action, Adventure |
| 10 | Fantastic Four | John Carter | Shared genres: Science Fiction, Action, Adventure |

### The Dark Knight

| # | legacy | new | new reasons |
|---|---|---|---|
| 1 | The Dark Knight Rises | The Dark Knight Rises | Similar plot themes (shared terms: dent batman, attorney harvey, harvey dent, district attorney, gotham) | Sha |
| 2 | Batman Begins | Batman Forever | Similar plot themes (shared terms: attorney harvey, harvey dent, district attorney, batman, gotham) | Shared g |
| 3 | Kiss of Death | Batman Begins | Some plot overlap (shared terms: batman, gotham, criminal) | Shared genres: Drama, Action, Crime | Same direct |
| 4 | The Way of the Gun | Batman | Similar plot themes (shared terms: war crime, gotham, joker) | Shared genres: Action |
| 5 | Harsh Times | Law Abiding Citizen | Some plot overlap (shared terms: district attorney, sets) | Shared genres: Drama, Crime, Thriller |
| 6 | Law Abiding Citizen | Slow Burn | Some plot overlap (shared terms: district attorney) | Shared genres: Drama, Crime, Thriller |
| 7 | Hitman | JFK | Similar plot themes (shared terms: district attorney, jim) | Shared genres: Drama, Thriller |
| 8 | 3 Days to Kill | Batman Returns | Similar plot themes (shared terms: batman, gotham, joker) | Shared genres: Action |
| 9 | Dead Man Down | Kiss of Death | Some plot overlap (shared terms: district attorney, crime, soon, help) | Shared genres: Drama, Action, Crime,  |
| 10 | Sabotage | Batman: The Dark Knight Returns, Part 2 | Similar plot themes (shared terms: batman, reign) | Shared genres: Action |

### Titanic

| # | legacy | new | new reasons |
|---|---|---|---|
| 1 | My Summer of Love | Raise the Titanic | Similar plot themes (shared terms: titanic, ship) | Shared genres: Drama, Thriller |
| 2 | Angel Eyes | The Switch | Similar plot themes (shared terms: old woman, years later, best friend, year old) | Shared genres: Drama, Roma |
| 3 | Pandora's Box | Lovely, Still | Some plot overlap (shared terms: tells story, first) | Shared genres: Drama, Romance |
| 4 | O | The Notebook | Some plot overlap (shared terms: years later, story, woman, old, life) | Shared genres: Drama, Romance |
| 5 | Fifty Shades of Grey | Monster's Ball | Some plot overlap (shared terms: woman named, death, set) | Shared genres: Drama, Romance |
| 6 | Fatal Attraction | Four Weddings and a Funeral | Some plot overlap (shared terms: woman named) | Shared genres: Drama, Romance |
| 7 | Cruel Intentions | My Summer of Love | Shared genres: Drama, Romance, Thriller |
| 8 | The Phantom of the Opera | Alone With Her | Shared genres: Drama, Romance, Thriller |
| 9 | Fascination | Shadowlands | Shared genres: Drama, Romance |
| 10 | Inescapable | Room | Some plot overlap (shared terms: jack, tells, years, old, young) | Shared genres: Drama, Thriller |

### Interstellar

| # | legacy | new | new reasons |
|---|---|---|---|
| 1 | A.I. Artificial Intelligence | Starship Troopers | Some plot overlap (shared terms: interstellar) | Shared genres: Adventure, Science Fiction |
| 2 | Silent Running | Space Pirate Captain Harlock | Some plot overlap (shared terms: space, conquer) | Shared genres: Science Fiction |
| 3 | 20,000 Leagues Under the Sea | Gattaca | Some plot overlap (shared terms: space travel) | Shared genres: Science Fiction |
| 4 | Midnight Special | Space Cowboys | Some plot overlap (shared terms: space travel, use) | Shared genres: Adventure |
| 5 | The Martian | A.I. Artificial Intelligence | Shared genres: Adventure, Drama, Science Fiction |
| 6 | Starship Troopers | Prometheus | Some plot overlap (shared terms: explorers, human) | Shared genres: Adventure, Science Fiction |
| 7 | The Astronaut Farmer | All Good Things | Some plot overlap (shared terms: newly discovered) | Shared genres: Drama |
| 8 | Land of the Lost | Solaris | Shared genres: Adventure, Drama, Science Fiction |
| 9 | Stargate: The Ark of Truth | Lost in Space | Shared genres: Adventure, Science Fiction |
| 10 | Jurassic Park | Star Wars: Episode I - The Phantom Menace | Shared genres: Adventure, Science Fiction |

### Toy Story

| # | legacy | new | new reasons |
|---|---|---|---|
| 1 | Toy Story 2 | Toy Story 2 | Similar plot themes (shared terms: buzz lightyear, woody andy, andy toys, owner, heart) | Shared genres: Anima |
| 2 | Toy Story 3 | Toy Story 3 | Similar plot themes (shared terms: andy toys, buzz, woody) | Shared genres: Animation, Comedy, Family |
| 3 | Free Birds | Free Birds | Similar plot themes (shared terms: aside differences, put aside) | Shared genres: Animation, Comedy, Family |
| 4 | Monsters, Inc. | Monsters, Inc. | Shared genres: Animation, Comedy, Family |
| 5 | Cars 2 | Heartbeeps | Some plot overlap (shared terms: andy) | Shared genres: Comedy, Family |
| 6 | Cars | The 40 Year Old Virgin | Some plot overlap (shared terms: andy, owner) | Shared genres: Comedy |
| 7 | Over the Hedge | Stepmom | Some plot overlap (shared terms: aside differences, put aside) |
| 8 | Garfield: A Tail of Two Kitties | Alvin and the Chipmunks: The Squeakquel | Shared genres: Animation, Comedy, Family |
| 9 | Garfield | Man on the Moon | Some plot overlap (shared terms: andy) | Shared genres: Comedy |
| 10 | Happy Feet Two | For Your Consideration | Some plot overlap (shared terms: buzz) | Shared genres: Comedy |

### The Matrix

| # | legacy | new | new reasons |
|---|---|---|---|
| 1 | The Matrix Reloaded | Supernova | Similar plot themes (shared terms: set 22nd, 22nd century) | Shared genres: Science Fiction |
| 2 | Avatar | Avatar | Similar plot themes (shared terms: 22nd century) | Shared genres: Action, Science Fiction |
| 3 | The Inhabited Island | The Inhabited Island | Similar plot themes (shared terms: 22nd century, group) | Shared genres: Action, Science Fiction |
| 4 | Æon Flux | Pulse | Similar plot themes (shared terms: computer hacker, group) |
| 5 | Flash Gordon | The Matrix Reloaded | Some plot overlap (shared terms: matrix, powerful) | Shared genres: Action, Science Fiction | Same director: L |
| 6 | Independence Daysaster | Transcendence | Some plot overlap (shared terms: computers, computer) | Shared genres: Science Fiction |
| 7 | Wing Commander | Flash Gordon | Some plot overlap (shared terms: fighting, earth) | Shared genres: Science Fiction |
| 8 | Space Battleship Yamato | Space Battleship Yamato | Some plot overlap (shared terms: earth, underground, tells) | Shared genres: Science Fiction |
| 9 | Battle: Los Angeles | The Specials | Some plot overlap (shared terms: joins group) | Shared genres: Action |
| 10 | The Terminator | The Terminator | Some plot overlap (shared terms: insurgents, century) | Shared genres: Action, Science Fiction |

### The Conjuring

| # | legacy | new | new reasons |
|---|---|---|---|
| 1 | The Conjuring 2 | The Conjuring 2 | Similar plot themes (shared terms: lorraine, ed, warren, help) | Shared genres: Horror | Same director: James  |
| 2 | The Amityville Horror | The Amityville Horror | Similar plot themes (shared terms: family terrorized) | Shared genres: Horror, Thriller |
| 3 | Insidious | The Apparition | Similar plot themes (shared terms: paranormal, entity, presence, terrifying) | Shared genres: Horror, Thriller |
| 4 | The Apparition | Ouija | Some plot overlap (shared terms: confront, terrifying, dark) | Shared genres: Horror |
| 5 | Insidious: Chapter 2 | 2:13 | Some plot overlap (shared terms: find caught, confront) | Shared genres: Horror, Thriller |
| 6 | Grave Encounters | Insidious | Shared genres: Horror, Thriller | Same director: James Wan |
| 7 | Lights Out | Grave Encounters | Some plot overlap (shared terms: paranormal) | Shared genres: Horror, Thriller |
| 8 | 1408 | Lights Out | Some plot overlap (shared terms: entity, terrifying) | Shared genres: Horror, Thriller |
| 9 | Halloween: The Curse of Michael Myers | 1408 | Shared genres: Horror, Thriller |
| 10 | Hayride | The Texas Chain Saw Massacre | Some plot overlap (shared terms: terrorized, family) | Shared genres: Horror |
