const fs = require("fs");
const path = require("path");

const posterDir = path.resolve("movie_posters");
const existingFiles = new Set(fs.readdirSync(posterDir));

let csvContent = fs.readFileSync(path.resolve("MOVIES_BY_GENRE.csv"), "utf-8");
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

const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
const header = parseLine(lines[0]);

const movies = [];
const seenIds = new Set();

for (let i = 1; i < lines.length; i++) {
  const row = parseLine(lines[i]);
  if (row.length !== header.length) continue;
  const obj = {};
  for (let j = 0; j < header.length; j++) {
    obj[header[j]] = row[j];
  }

  const id = String(obj.Movie_ID).trim();
  if (!id || seenIds.has(id)) continue;
  seenIds.add(id);

  const title = (obj.Title || "").trim();
  const yearNum = parseFloat(obj.Release_Year);
  const year = isNaN(yearNum) ? null : Math.round(yearNum);
  const ratingNum = parseFloat(obj.Vote_Average);
  const rating = isNaN(ratingNum) ? null : Math.round(ratingNum * 10) / 10;
  const voteCount = parseInt(obj.Vote_Count, 10) || 0;
  const popularity = parseFloat(obj.Popularity) || 0;
  const genre = (obj.Primary_Genre || obj.Genre_Group || "Unknown").trim();
  const director = (obj.Director || "").trim();
  const runtime = obj.Runtime_Min ? Math.round(parseFloat(obj.Runtime_Min)) : null;
  const language = (obj.Language || "").trim();

  const posterFilename = (obj.Poster_Filename || "").trim();
  const hasFile = posterFilename && existingFiles.has(posterFilename);
  const posterUrl = hasFile ? `/posters/${posterFilename}` : null;

  const budget = obj.Budget && !isNaN(parseFloat(obj.Budget)) && parseFloat(obj.Budget) > 0 ? Math.round(parseFloat(obj.Budget)) : null;
  const revenue = obj.Revenue && !isNaN(parseFloat(obj.Revenue)) && parseFloat(obj.Revenue) > 0 ? Math.round(parseFloat(obj.Revenue)) : null;
  const country = (obj.Primary_Country || "").trim() || null;
  const studio = (obj.Primary_Studio || "").trim() || null;

  movies.push({
    id,
    title,
    year,
    rating,
    voteCount,
    popularity,
    genre,
    director,
    runtime,
    language,
    posterUrl,
    hasPoster: !!hasFile,
    budget,
    revenue,
    country,
    studio,
  });
}

console.log("Converted movies count:", movies.length);
const jsonStr = JSON.stringify(movies);
console.log("JSON byte length:", jsonStr.length, `(${(jsonStr.length / 1024).toFixed(1)} KB)`);
fs.writeFileSync("src/data/movies-catalogue.json", jsonStr);
console.log("Written to src/data/movies-catalogue.json successfully!");
