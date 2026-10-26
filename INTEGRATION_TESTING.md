# MOVIEAI — End-to-End Integration, Running & Verification Guide

This document describes how the MOVIEAI React + Vite frontend connects to the FastAPI recommendation engine, how user interactions (likes, dislikes, ratings, favorites, watchlist, and watch history) dynamically personalize recommendation feeds, and exact steps to run, test, and troubleshoot the integrated application on Windows.

---

## 1. Architecture & Integration Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MOVIEAI REACT FRONTEND                          │
│        (Vite 8, React 19, TanStack Router & Query, Tailwind CSS)       │
│                                                                        │
│  • Explore Page (/explore): Curated live recommendation feed & search  │
│  • Movie Detail Page (/movie/:id): Meta, "More Like This", quick rate  │
│  • Discover / For You (/discover): Taste cards & trending rows         │
│  • Client API Layer: src/lib/api-client.ts                             │
│  • Local & Persistent State: src/components/movieai/demo-context.tsx   │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ HTTP / REST (JSON)
                                    │ http://127.0.0.1:8000
┌───────────────────────────────────▼────────────────────────────────────┐
│                    FASTAPI RECOMMENDATION ENGINE                       │
│    (movieai-recommendation-engine running on Uvicorn & Python 3.13)    │
│                                                                        │
│  • Recommendation Algorithms (movieai/recommender.py)                  │
│    - Content Similarity: TF-IDF synopses (70%) + Genres (25%) + Dir (5%)│
│    - Personalization Policy: Likes (+1.0), Favs (+1.5), Dislikes (-1.5)│
│    - Centered ratings (1-5 stars) and non-invasive watch signals       │
│  • Persistent SQLite Store (movieai/storage.py)                        │
│    - File: movieai-recommendation-engine/data/movieai_interactions.db  │
│    - Profile isolation by user identifier                              │
│    - Mutual exclusion enforcement (dislike wipes likes & high ratings) │
│  • Movie Dataset: 4,803 canonical enriched records                     │
│  • Poster Server: Served through Vite middleware from movie_posters/   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites

- **Windows 10 / 11** with PowerShell 5.1 or PowerShell 7+
- **Node.js**: v18+ or v20+ (`node -v`, `npm -v`)
- **Python**: 3.10+ (tested and verified on Python 3.13.5: `python --version`)

---

## 3. Installation & Setup

Open PowerShell as your standard user:

### Step 3.1: Frontend Dependencies
```powershell
cd E:\Desktop\MovieRecommendation\inspiration-front-sparkle
npm install
```

### Step 3.2: Recommendation Engine Dependencies
```powershell
cd E:\Desktop\MovieRecommendation\inspiration-front-sparkle\movieai-recommendation-engine
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
```

---

## 4. Running the Application

### Option A: One-Command PowerShell Launcher (Recommended)
From the project root `E:\Desktop\MovieRecommendation\inspiration-front-sparkle`:
```powershell
powershell -ExecutionPolicy Bypass -File .\start-services.ps1
```
This script validates dependencies, starts the FastAPI backend in one terminal, starts Vite in a second terminal, and verifies backend health.

---

### Option B: Running in Two Separate Terminals

#### Terminal 1 — FastAPI Recommendation Engine
```powershell
cd E:\Desktop\MovieRecommendation\inspiration-front-sparkle\movieai-recommendation-engine
.\.venv\Scripts\Activate.ps1
uvicorn movieai.main:app --host 127.0.0.1 --port 8000 --reload
```
- Expected output:
  ```
  INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
  INFO:     Started reloader process
  INFO:     Application startup complete.
  ```

#### Terminal 2 — MOVIEAI React Frontend
```powershell
cd E:\Desktop\MovieRecommendation\inspiration-front-sparkle
npm run dev
```
- Expected output:
  ```
  VITE v8.1.5  ready in ~400 ms
  ➜  Local:   http://localhost:5173/
  ```

---

## 5. Service Endpoints & URLs

| Service / View | URL | Purpose |
|---|---|---|
| **Explore Page (Live Recommendations)** | `http://localhost:5173/explore` | Personalized feed, live rating buttons, search |
| **Movie Details Page** | `http://localhost:5173/movie/293660` | Full meta, "More Like This", hero action buttons |
| **Discover / For You** | `http://localhost:5173/discover` | Onboarding & taste wall |
| **Backend Health Endpoint** | `http://127.0.0.1:8000/health` | Readiness, movie count, vocabulary size |
| **Swagger Interactive API Docs** | `http://127.0.0.1:8000/docs` | Test all API routes directly in browser |

---

## 6. How to Verify Backend Health

Run in PowerShell:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method Get
```
Expected JSON:
```json
{
  "status": "ok",
  "ready": true,
  "movies": 4803,
  "feature_source": "cache",
  "plot_vocabulary_size": 50000,
  "missing_descriptions": 4,
  "missing_genres": 28
}
```

---

## 7. How to Test Personalization as a Real User

Follow this step-by-step user journey:

1. **Initial Cold-Start Feed**:
   - Open `http://localhost:5173/explore` in your browser.
   - Look at the top section: **"Personalized Recommendations"**.
   - Notice the green badge indicating `FastAPI Engine Active`.
   - Before any interactions, recommendations start with a quality-gated general feed or genre affinity (e.g. *The Dark Knight*, *Inception*, *Interstellar*).
   - Notice each card displays an evidence-based reason (e.g., `Cold-start ranked by quality & popularity`).

2. **Submit a Positive Interaction (Like a Movie)**:
   - On `http://localhost:5173/explore`, find **The Dark Knight** (or navigate to `http://localhost:5173/movie/155`).
   - Click the **Like** button (ThumbsUp icon). The button turns green and lights up.
   - Click the **Refresh** button on the Explore recommendations header (or observe the automatic update).
   - **Observe the result**: Related comic-book and crime thriller films (*The Dark Knight Rises*, *Batman Begins*, *Iron Man*, *Law Abiding Citizen*) rise to the top!
   - Each card now displays an evidence reason: `Similar to "The Dark Knight", which you liked (shared terms: batman, wayne, gotham)`.

3. **Submit a Negative Interaction (Dislike a Genre/Movie)**:
   - Find an animated movie (e.g. *Toy Story* or *Finding Nemo*) and click the **Dislike** button (ThumbsDown icon).
   - The dislike immediately registers in the SQLite store (`-1.5` negative signal penalty).
   - Refresh the feed: animated films are demoted or excluded from your recommendations according to the dislike policy.

4. **Rate a Movie**:
   - Open a movie details page (e.g. `http://localhost:5173/movie/27205` for *Inception*).
   - In the hero section, click **5 Stars** under "Your Rating".
   - Click **Mark as Watched** (purple pill).
   - Return to `http://localhost:5173/explore`.
   - *Inception* is marked as watched and excluded from your feed, while films strongly similar to *Inception* (*Interstellar*, *The Matrix*, *Cypher*) receive strong preference boosts!

5. **Test Persistence Across Refresh & Backend Restarts**:
   - Hard refresh your browser (`Ctrl + F5`).
   - Open the user drawer (click the user profile icon on the top right).
   - Notice your likes, ratings, and favorites are preserved!
   - Stop Uvicorn (`Ctrl + C`) and restart it:
     ```powershell
     uvicorn movieai.main:app --host 127.0.0.1 --port 8000 --reload
     ```
   - Refresh the page: your user profile is loaded from `movieai_interactions.db` in SQLite!

6. **Reset Profile for Clean Testing**:
   - In the Profile drawer or beside the recommendations header, click **Reset Profile** / **Reset Taste & Clear Interactions**.
   - Your profile returns to the clean cold-start state instantly.

---

## 8. Automated Testing Suites

Both frontend and backend test suites are verified:

### Run Backend Tests (87 tests)
```powershell
cd E:\Desktop\MovieRecommendation\inspiration-front-sparkle\movieai-recommendation-engine
.\.venv\Scripts\Activate.ps1
python -m pytest -v
```
**Results**: 87 passed (includes all 80 baseline tests + 7 new persistence, interaction, and ranking response tests).

### Run Frontend Tests (26 tests)
```powershell
cd E:\Desktop\MovieRecommendation\inspiration-front-sparkle
npm test
```
**Results**: 26 passed across 4 test files (`recommendation-integration.test.tsx`, `movie-detail.test.tsx`, `discover-page.test.tsx`, `app-routing.test.tsx`).

### Run Production Build
```powershell
cd E:\Desktop\MovieRecommendation\inspiration-front-sparkle
npm run build
```
**Results**: Built client and server bundles cleanly with Nitro in ~2s.

---

## 9. Troubleshooting & FAQ

### CORS Issues
- If you see `Access to fetch at ... has been blocked by CORS policy`:
  - The backend configuration in `movieai/config.py` allows `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:3000`, `http://127.0.0.1:3000`.
  - Ensure you are opening the site from one of these allowed origins.
  - To add custom origins, set environment variable:
    ```powershell
    $env:MOVIEAI_CORS_ORIGINS = "http://localhost:5173,http://localhost:4173"
    ```

### Port Conflicts
- If port `8000` is already in use:
  ```powershell
  # Check what process uses port 8000
  Get-NetTCPConnection -LocalPort 8000
  # Start on port 8001 instead:
  uvicorn movieai.main:app --port 8001
  # And set frontend env:
  $env:VITE_API_URL = "http://127.0.0.1:8001"
  ```
- If port `5173` is in use, Vite will automatically prompt or select `5174`.

### Missing Posters
- Movie posters are served directly from `E:\Desktop\MovieRecommendation\inspiration-front-sparkle\movie_posters` via Vite's `moviePostersPlugin()` in `vite.config.ts`.
- If an image cannot be read, the frontend automatically falls back to `/poster-fallback.svg`.

### Database Location & Reset
- The local SQLite database is stored at:
  `movieai-recommendation-engine/data/movieai_interactions.db`
- It is excluded from Git to prevent committing personal or transient demo data.
- To completely wipe all test profiles, delete `movieai_interactions.db` or click the "Reset Profile" button in the UI.

---

## 10. Stopping the Services

- In both PowerShell terminals, press `Ctrl + C`.
- Or run in PowerShell:
  ```powershell
  Stop-Process -Name "uvicorn", "node" -ErrorAction SilentlyContinue
  ```
