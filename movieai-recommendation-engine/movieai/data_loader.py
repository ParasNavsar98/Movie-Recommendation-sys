"""Load and validate the MOVIEAI movie dataset (read-only; the CSV is never modified)."""
from __future__ import annotations

import hashlib
import logging
from dataclasses import asdict, dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from .preprocessor import (
    clean_description,
    is_missing,
    parse_directors,
    parse_genres,
    prepare_plot_text,
    title_key,
)

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = ("Movie_ID", "Title")
OPTIONAL_COLUMNS = (
    "Release_Year", "Language", "Vote_Average", "Vote_Count", "Popularity", "Director",
    "Primary_Genre", "Genre_Group", "Genres", "Movie_Description", "Budget", "Revenue",
    "Runtime_Min", "Poster_Web_Path", "poster_path", "Description_Status",
)
PUBLIC_COLUMNS = (
    "Movie_ID", "Title", "Release_Year", "Language", "Genres", "Director", "Vote_Average",
    "Vote_Count", "Popularity", "Runtime_Min", "Poster_Web_Path", "poster_path", "Movie_Description",
)


class DatasetError(ValueError):
    """Raised when the dataset is missing, unreadable or structurally invalid."""


@dataclass
class DataQualityReport:
    """Startup data-quality summary (all counts refer to the cleaned dataset)."""

    source_path: str = ""
    source_sha256: str = ""
    raw_rows: int = 0
    records: int = 0
    unique_movie_ids: int = 0
    duplicate_ids: int = 0
    duplicate_id_details: list[dict[str, Any]] = field(default_factory=list)
    invalid_id_rows_dropped: int = 0
    missing_columns: list[str] = field(default_factory=list)
    missing_descriptions: int = 0
    missing_genres: int = 0
    genres_from_fallback: int = 0
    missing_directors: int = 0
    invalid_or_missing_years: int = 0
    valid_poster_paths: int = 0
    non_english_descriptions: int = 0
    duplicate_titles: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def format(self) -> str:
        d = self.to_dict()
        lines = ["Dataset validation report", "-" * 25]
        for key in (
            "records", "unique_movie_ids", "duplicate_ids", "missing_descriptions", "missing_genres",
            "genres_from_fallback", "missing_directors", "invalid_or_missing_years", "valid_poster_paths",
            "non_english_descriptions", "duplicate_titles", "invalid_id_rows_dropped",
        ):
            lines.append(f"{key:28s}{d[key]}")
        if self.missing_columns:
            lines.append(f"{'absent_optional_columns':28s}{', '.join(self.missing_columns)}")
        return "\n".join(lines)


@dataclass
class MovieDataset:
    """Cleaned movie table plus lookup helpers. ``df`` rows are positional indices 0..n-1."""

    df: pd.DataFrame
    report: DataQualityReport
    _id_to_index: dict[int, int] = field(default_factory=dict, repr=False)

    def __post_init__(self) -> None:
        self._id_to_index = {int(m): i for i, m in enumerate(self.df["Movie_ID"].to_numpy())}

    def __len__(self) -> int:
        return len(self.df)

    def index_of(self, movie_id: int) -> int | None:
        """Positional index for ``movie_id`` or ``None``."""
        return self._id_to_index.get(int(movie_id))

    def require_index(self, movie_id: int) -> int:
        idx = self.index_of(movie_id)
        if idx is None:
            raise KeyError(f"Unknown Movie_ID: {movie_id}")
        return idx

    def record(self, index: int) -> dict[str, Any]:
        """JSON-safe public metadata for one row (NaN -> ``None``, year -> ``int``)."""
        row = self.df.iloc[index]
        out: dict[str, Any] = {}
        for col in PUBLIC_COLUMNS:
            value = row.get(col)
            if col == "Genres":
                value = row["Genres_Clean"] or None
            elif col == "Release_Year":
                value = int(row["Year"]) if not pd.isna(row["Year"]) else None
            elif col in ("Movie_ID", "Vote_Count"):
                value = None if pd.isna(value) else int(value)
            elif isinstance(value, (float, np.floating)):
                value = None if pd.isna(value) else float(value)
            elif is_missing(value):
                value = None
            else:
                value = str(value) if not isinstance(value, (int, np.integer)) else int(value)
            out[col] = value
        return out


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _valid_year(value: Any) -> float:
    try:
        year = float(value)
    except (TypeError, ValueError):
        return np.nan
    if np.isnan(year) or not (1870 <= year <= date.today().year + 5):
        return np.nan
    return float(int(year))


def _valid_poster(value: Any) -> bool:
    return isinstance(value, str) and value.strip().startswith("/") and len(value.strip()) > 1


def load_movies(
    path: str | Path,
    *,
    genre_fallback_primary: bool = True,
    on_duplicate_id: str = "keep_first",
) -> MovieDataset:
    """Read, validate and enrich the movie CSV.

    Derived columns added (the source file is untouched): ``Description_Clean``,
    ``Plot_Text``, ``Description_Is_English``, ``Genre_List``, ``Genres_Clean``,
    ``Genre_Source``, ``Director_Keys``, ``Title_Key``, ``Year``, ``Has_Valid_Poster``.

    ``on_duplicate_id``: ``"keep_first"`` keeps the first row of a duplicated ``Movie_ID``
    and reports every conflict; ``"error"`` raises :class:`DatasetError`.
    """
    path = Path(path)
    if not path.exists():
        raise DatasetError(f"Movie dataset not found: {path.resolve()}")
    try:
        raw = pd.read_csv(path, low_memory=False)
    except Exception as exc:  # pandas raises many types
        raise DatasetError(f"Could not read {path}: {exc}") from exc

    absent_required = [c for c in REQUIRED_COLUMNS if c not in raw.columns]
    if absent_required:
        raise DatasetError(f"Dataset is missing required columns: {absent_required}")

    report = DataQualityReport(source_path=str(path), source_sha256=file_sha256(path), raw_rows=len(raw))
    df = raw.copy()
    for col in OPTIONAL_COLUMNS:
        if col not in df.columns:
            df[col] = np.nan
            report.missing_columns.append(col)

    # --- identifiers -------------------------------------------------------------
    ids = pd.to_numeric(df["Movie_ID"], errors="coerce")
    bad_id = ids.isna() | (ids % 1 != 0)
    report.invalid_id_rows_dropped = int(bad_id.sum())
    df = df[~bad_id].copy()
    df["Movie_ID"] = ids[~bad_id].astype("int64")

    dup_mask = df["Movie_ID"].duplicated(keep=False)
    if dup_mask.any():
        for movie_id, group in df[dup_mask].groupby("Movie_ID"):
            identical = len(group.drop_duplicates()) == 1
            report.duplicate_id_details.append({
                "Movie_ID": int(movie_id),
                "titles": group["Title"].astype(str).tolist(),
                "identical_rows": bool(identical),
            })
        if on_duplicate_id == "error":
            raise DatasetError(f"Duplicate Movie_IDs found: {[d['Movie_ID'] for d in report.duplicate_id_details]}")
        logger.warning("Found %d duplicated Movie_ID values; keeping the first row of each.", len(report.duplicate_id_details))
    report.duplicate_ids = int(df["Movie_ID"].duplicated().sum())
    df = df[~df["Movie_ID"].duplicated(keep="first")].reset_index(drop=True)

    # --- titles ------------------------------------------------------------------
    df["Title"] = df["Title"].where(df["Title"].notna(), "").astype(str).str.strip()
    df["Title_Key"] = df["Title"].map(title_key)
    report.duplicate_titles = int(df["Title"].str.casefold().duplicated(keep=False).sum())

    # --- years -------------------------------------------------------------------
    df["Year"] = df["Release_Year"].map(_valid_year)
    report.invalid_or_missing_years = int(df["Year"].isna().sum())

    # --- descriptions ------------------------------------------------------------
    df["Description_Clean"] = df["Movie_Description"].map(clean_description)
    prepared = df["Description_Clean"].map(prepare_plot_text)
    df["Plot_Text"] = prepared.map(lambda t: t[0])
    df["Description_Is_English"] = prepared.map(lambda t: t[1])
    has_desc = df["Description_Clean"].notna()
    report.missing_descriptions = int((~has_desc).sum())
    report.non_english_descriptions = int((has_desc & ~df["Description_Is_English"]).sum())

    # --- genres (complete multi-genre list; fallback only to a *real* primary genre) --
    genre_lists, sources = [], []
    for genres, primary in zip(df["Genres"], df["Primary_Genre"]):
        parsed = parse_genres(genres)
        source = "Genres"
        if not parsed and genre_fallback_primary:
            parsed = parse_genres(primary)[:1]
            source = "Primary_Genre"
        if not parsed:
            source = "missing"
        genre_lists.append(parsed)
        sources.append(source)
    df["Genre_List"] = genre_lists
    df["Genre_Source"] = sources
    df["Genres_Clean"] = df["Genre_List"].map("|".join)
    report.missing_genres = int((df["Genre_Source"] == "missing").sum())
    report.genres_from_fallback = int((df["Genre_Source"] == "Primary_Genre").sum())

    # --- directors & posters -----------------------------------------------------
    df["Director_Keys"] = df["Director"].map(parse_directors)
    report.missing_directors = int(df["Director_Keys"].map(len).eq(0).sum())
    df["Has_Valid_Poster"] = df["Poster_Web_Path"].map(_valid_poster) | df["poster_path"].map(_valid_poster)
    report.valid_poster_paths = int(df["Has_Valid_Poster"].sum())

    report.records = len(df)
    report.unique_movie_ids = int(df["Movie_ID"].nunique())

    for col in ("Vote_Average", "Vote_Count", "Popularity", "Runtime_Min"):
        df[col] = pd.to_numeric(df[col], errors="coerce")

    logger.info("Loaded %d movies (%d missing descriptions, %d missing genres)",
                report.records, report.missing_descriptions, report.missing_genres)
    return MovieDataset(df=df.reset_index(drop=True), report=report)
