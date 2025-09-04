import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

const DATA_DIR = "data";
const OUT_FILE = "items_export_slim.json";

// Optional: limit by prefixes (empty string to disable)
const PREFIXES = (process.env.PREFIXES ?? "60,30,73,13,HA,HK")
  .split(",").map(s => s.trim()).filter(Boolean);

function newestXlsx(dir) {
  const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith(".xlsx"));
  if (!files.length) throw new Error(`No .xlsx files found in ${dir}`);
  files.sort((a,b)=>fs.statSync(path.join(dir,b)).mtimeMs - fs.statSync(path.join(dir,a)).mtimeMs);
  return path.join(dir, files[0]);
}

const startsWithAny = (pn) => !PREFIXES.length || PREFIXES.some(p => pn.startsWith(p));
const toPN   = (x) => String(x ?? "").trim().toUpperCase();
const toDesc = (x) => String(x ?? "").replace(/\s+/g, " ").trim();
const toNum  = (x) => {
  const n = Number(String(x ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0.0;      // default like your current file
};

// Robust header getter (accepts slight header variations)
function getField(row, keys) {
  for (const k of keys) if (row.hasOwnProperty(k)) return row[k];
  // also try case-insensitive
  const lower = Object.fromEntries(Object.entries(row).map(([k,v]) => [k.toLowerCase(), v]));
  for (const k of keys.map(k=>k.toLowerCase())) if (lower.hasOwnProperty(k)) return lower[k];
  return null;
}

const PN_KEYS   = ["Item"];                 // your file uses exactly these
const DESC_KEYS = ["Description"];
const COST_KEYS = ["Unit Cost","UnitCost"]; // handle both spellings

// ---- run ----
const xlsxPath = newestXlsx(DATA_DIR);
const wb = XLSX.readFile(xlsxPath, { cellDates: false });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: null }); // array of objects keyed by header

if (!rows.length) throw new Error("XLSX appears empty.");

const out = [];
const seen = new Set();

for (const r of rows) {
  const pnRaw   = getField(r, PN_KEYS);
  const descRaw = getField(r, DESC_KEYS);
  const costRaw = getField(r, COST_KEYS);

  const pn = toPN(pnRaw);
  if (!pn) continue;
  if (!startsWithAny(pn)) continue;
  if (seen.has(pn)) continue;  // de-dupe by PN
  seen.add(pn);

  out.push({
    part_number: pn,                 // rename Item -> part_number
    description: toDesc(descRaw),
    unit_cost: toNum(costRaw)
  });
}

// stable sort by PN
out.sort((a,b) => a.part_number.localeCompare(b.part_number, "en"));

// write to repo root (matches your site)
fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
console.log(`Wrote ${OUT_FILE} (${out.length} rows) from ${path.basename(xlsxPath)}`);
