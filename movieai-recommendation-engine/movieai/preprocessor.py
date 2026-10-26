"""Text and metadata normalisation helpers.

All functions are pure and side-effect free so they can be unit-tested with tiny
inputs. Nothing in this module invents data: unusable values become ``None`` or an
empty list so the scoring layer can treat the signal as *missing* rather than as a
misleading string such as ``"Unknown"``.
"""
from __future__ import annotations

import html
import math
import re
import unicodedata
from typing import Any, Iterable

# Placeholder strings that mean "no value" in the source data (e.g. Genres == "Unknown").
PLACEHOLDER_VALUES = frozenset(
    {"", "unknown", "nan", "none", "null", "n/a", "na", "nil", "-", "--", "missing", "undefined"}
)

# Compact function-word list (NLTK-style). Deliberately NOT scikit-learn's
# ``ENGLISH_STOP_WORDS``: that list also removes content words such as "fire",
# "system", "found", "bill" and "interest", which carry plot meaning.
ENGLISH_STOP_WORDS = frozenset(
    """
    i me my myself we our ours ourselves you your yours yourself yourselves he him his
    himself she her hers herself it its itself they them their theirs themselves what
    which who whom this that these those am is are was were be been being have has had
    having do does did doing a an the and but if or because as until while of at by for
    with about against between into through during before after above below to from up
    down in out on off over under again further then once here there when where why how
    all any both each few more most other some such no nor not only own same so than too
    very s t can will just don should now would could also
    """.split()
)

_TOKEN_RE = re.compile(r"(?u)\b\w\w+\b")
_WORD_RE = re.compile(r"[a-z']+")
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")
_ARTICLES = ("the ", "a ", "an ")

_GENRE_CANONICAL = {"tv movie": "TV Movie", "sci-fi": "Science Fiction", "science-fiction": "Science Fiction"}


def is_missing(value: Any) -> bool:
    """Return True for None/NaN/empty/placeholder values."""
    if value is None:
        return True
    if isinstance(value, float) and math.isnan(value):
        return True
    try:  # pandas.NA / NaT and friends
        if value != value:  # noqa: PLR0124 - NaN check
            return True
    except (TypeError, ValueError):
        pass
    return str(value).strip().casefold() in PLACEHOLDER_VALUES


def collapse_whitespace(text: str) -> str:
    """Collapse runs of whitespace into single spaces and strip the ends."""
    return _WS_RE.sub(" ", text).strip()


def strip_html(text: str) -> str:
    """Remove HTML tags/entities (``<br/>``, ``&amp;`` ...) from text."""
    return _TAG_RE.sub(" ", html.unescape(text))


def clean_description(value: Any, min_words: int = 3) -> str | None:
    """Clean a synopsis. Returns ``None`` when there is no usable description.

    * ``NaN``/placeholder/"MISSING ..." markers -> ``None`` (never invented text).
    * HTML fragments and repeated whitespace are removed.
    * Case, punctuation, names and rare terms are preserved.
    """
    if is_missing(value):
        return None
    text = collapse_whitespace(strip_html(str(value)))
    if text.casefold().startswith("missing"):
        return None
    if len(text.split()) < min_words:
        return None
    return text


def looks_english(text: str, min_tokens: int = 8, threshold: float = 0.12) -> bool:
    """Cheap heuristic: is ``text`` English prose?

    Uses the share of tokens that are English function words. English prose is
    typically ~35-45 %; Romance/Germanic/Asian-script text is usually far below
    ``threshold``. Texts that are too short to judge are assumed English.
    """
    words = _WORD_RE.findall(text.casefold())
    if len(words) < min_tokens:
        return True
    hits = sum(1 for w in words if w in ENGLISH_STOP_WORDS)
    return hits / len(words) >= threshold


def remove_english_stop_words(text: str) -> str:
    """Drop English function words while keeping every other token in order."""
    kept = [t for t in _TOKEN_RE.findall(text) if t.casefold() not in ENGLISH_STOP_WORDS]
    return " ".join(kept)


def prepare_plot_text(description: str | None) -> tuple[str, bool]:
    """Return ``(text_for_tfidf, is_english)``.

    English descriptions have function words removed; non-English descriptions are
    passed through untouched (removing English stop words from them would be wrong).
    Missing descriptions give ``("", False)``.
    """
    if not isinstance(description, str) or not description:
        return "", False  # None / NaN / empty
    english = looks_english(description)
    return (remove_english_stop_words(description) if english else description), english


def fold_text(value: Any) -> str:
    """Case-fold and strip accents: ``"Amélie"`` -> ``"amelie"``."""
    if value is None:
        return ""
    text = unicodedata.normalize("NFKD", str(value))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return collapse_whitespace(text.casefold())


def normalize_title(title: Any) -> str:
    """Normalised title used for search: folded, ``&``->``and``, no leading article,
    punctuation replaced by single spaces. ``"The Matrix"`` -> ``"matrix"``."""
    text = fold_text(title).replace("&", " and ")
    text = re.sub(r"[^\w]+", " ", text, flags=re.UNICODE).replace("_", " ")
    text = collapse_whitespace(text)
    for article in _ARTICLES:
        if text.startswith(article) and len(text) > len(article):
            text = text[len(article):]
            break
    return text


def title_key(title: Any) -> str:
    """Space-free variant of :func:`normalize_title` (``Spider-Man`` == ``Spiderman``)."""
    return normalize_title(title).replace(" ", "")


def parse_genres(value: Any) -> list[str]:
    """Parse a pipe-separated genre string into canonical, de-duplicated genres.

    ``"Action| science fiction |Action"`` -> ``["Action", "Science Fiction"]``.
    Placeholder values such as ``"Unknown"`` are dropped.
    """
    if is_missing(value):
        return []
    genres: list[str] = []
    for part in str(value).split("|"):
        part = collapse_whitespace(part)
        if is_missing(part):
            continue
        canon = _GENRE_CANONICAL.get(part.casefold()) or " ".join(w.capitalize() for w in part.split(" "))
        if canon not in genres:
            genres.append(canon)
    return genres


def parse_directors(value: Any) -> list[str]:
    """Return normalised director keys (folded, whitespace-collapsed).

    Only ``|`` separates multiple directors, because names such as
    ``"George Tillman, Jr."`` contain commas. ``"Unknown"`` -> ``[]``.
    """
    if is_missing(value):
        return []
    keys: list[str] = []
    for part in str(value).split("|"):
        key = fold_text(part)
        if key and key not in PLACEHOLDER_VALUES and key not in keys:
            keys.append(key)
    return keys


def unique_preserving_order(items: Iterable[Any]) -> list[Any]:
    """De-duplicate while preserving first-seen order."""
    seen: set[Any] = set()
    out = []
    for item in items:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return out
