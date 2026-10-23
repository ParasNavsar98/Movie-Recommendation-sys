const fs = require("fs");
const path = require("path");

const posterDir = path.resolve("movie_posters");
const csvPath = path.resolve("MOVIES_BY_GENRE.csv");

console.log("Analyzing posters folder...");
const files = fs.readdirSync(posterDir);
let totalBytes = 0;
const posterSet = new Set();
for (const f of files) {
  posterSet.add(f);
  try {
    const st = fs.statSync(path.join(posterDir, f));
    totalBytes += st.size;
  } catch (e) {}
}

console.log("Total files in movie_posters:", files.length);
console.log("Total size in MB:", (totalBytes / (1024 * 1024)).toFixed(2));
console.log("Total size in GB:", (totalBytes / (1024 * 1024 * 1024)).toFixed(2));

console.log("Analyzing CSV...");
let csvContent = fs.readFileSync(csvPath, "utf-8");
if (csvContent.charCodeAt(0) === 0xFEFF) {
  csvContent = csvContent.slice(1);
}

function parseLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  const header = parseLine(lines[0]);
  const rows = [];
  let lineError = 0;
  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]);
    if (row.length === header.length) {
      const obj = {};
      for (let j = 0; j < header.length; j++) {
        obj[header[j]] = row[j];
      }
      rows.push(obj);
    } else {
      lineError++;
    }
  }
  return { header, rows, totalLines: lines.length - 1, lineError };
}

const parsed = parseCSV(csvContent);
console.log("Total movie rows in CSV:", parsed.rows.length);
console.log("Header columns count:", parsed.header.length);
console.log("Header columns:", parsed.header);
if (parsed.lineError > 0) {
  console.log("Lines with column mismatch:", parsed.lineError);
}

let recordsWithFilename = 0;
let recordsWhoseFileExists = 0;
let missingPosterFile = 0;
const idCount = new Map();
const posterUsage = new Map();
const genres = new Set();
const genreGroups = new Set();
let missingRating = 0;
let missingYear = 0;

for (const r of parsed.rows) {
  const id = r.Movie_ID;
  idCount.set(id, (idCount.get(id) || 0) + 1);
  if (r.Genre_Group) genreGroups.add(r.Genre_Group);
  if (r.Primary_Genre) genres.add(r.Primary_Genre);
  if (!r.Vote_Average || r.Vote_Average === "" || isNaN(Number(r.Vote_Average))) missingRating++;
  if (!r.Release_Year || r.Release_Year === "" || isNaN(Number(r.Release_Year))) missingYear++;

  const fn = r.Poster_Filename;
  if (fn && fn.trim().length > 0) {
    recordsWithFilename++;
    if (posterSet.has(fn.trim())) {
      recordsWhoseFileExists++;
      posterUsage.set(fn.trim(), (posterUsage.get(fn.trim()) || 0) + 1);
    } else {
      missingPosterFile++;
    }
  }
}

let duplicateIds = 0;
for (const [id, count] of idCount.entries()) {
  if (count > 1) duplicateIds++;
}

let duplicatePosters = 0;
for (const [fn, count] of posterUsage.entries()) {
  if (count > 1) duplicatePosters++;
}

console.log("--- INVENTORY REPORT ---");
console.log("Total movie records in CSV:", parsed.rows.length);
console.log("Total poster files in movie_posters folder:", files.length);
console.log("Records with Poster_Filename:", recordsWithFilename);
console.log("Records whose actual poster files exist:", recordsWhoseFileExists);
console.log("Missing or invalid poster mappings (filename specified but file missing):", missingPosterFile);
console.log("Movies without poster filename:", parsed.rows.length - recordsWithFilename);
console.log("Duplicate Movie_IDs:", duplicateIds);
console.log("Duplicate poster assignments (same file used by multiple movies):", duplicatePosters);
console.log("Genre Groups count:", genreGroups.size, Array.from(genreGroups));
console.log("Primary Genres count:", genres.size, Array.from(genres));
console.log("Records with missing/invalid rating:", missingRating);
console.log("Records with missing/invalid release year:", missingYear);
