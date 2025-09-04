// scripts/xlsx_to_json.mjs
import fs from "fs";
import path from "path";
import zlib from "zlib";
import * as XLSX from "xlsx";

const DATA_DIR = "data";
const OUT_FILE = "items_export_slim.json";

// Optional: limit by prefixes ("" to disable)
const PREFIXES = (process.env.PREFIXES ?? "60,30,73,13,HA,HK")
  .split(",").map(s => s.trim()).filter(Boolean);

const startsWithAny = (pn) => !PREFIXES.length || PREFIXES.some(p => pn.startsWith(p));
const toPN   = (x) => String(x ?? "").trim().toUpperCase();
const toDesc = (x) => String(x ?? "").replace(/\s+/g, " ").trim();
const toNum  = (x) => {
  const n = Number(String(x ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0.0;  // default like your current file
};

function newestDataFile(dir) {
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(f => /\.(xlsx|csv|csv\.gz)$/i.test(f))
    : [];
  files.sort((a,b) => fs.statSync(path.join(dir,b)).mtimeMs - fs.statSync(path.join(dir,a)).mtimeMs);
  return files.length ? path.join(dir, files[0]) : null;
}

// Read any of: .xlsx, .csv, .csv.gz  -> array of row objects (by header)
function sheetToRows(srcPath) {
  const lower = srcPath.toLowerCase();
  let buf = fs.readFileSync(srcPath);
  if (lower.endsWith(".csv.gz")) buf = zlib.gunzipSync(buf);
  // universal parse via buffer (avoids XLSX.readFile issues in ESM)
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

// Column headers you use (case-insensitive fallback handled below)
const PN_KEYS   = ["Item"];
const DESC_KEYS = ["Description"];
const COST_KEYS = ["Unit Cost", "UnitCost"];

function getField(row, keys) {
  for (const k of keys) if (k in row) return row[k];
  // case-insensitive fallback
  const lower = Object.fromEntries(Object.entries(row).map(([k,v]) => [k.toLowerCase(), v]));
  for (const k of keys.map(k=>k.toLowerCase())) if (k in lower) return lower[k];
  return null;
}

// ---- run ----
const src = newestDataFile(DATA_DIR);
if (!src) {
  console.log(`[converter] No .xlsx/.csv(.gz) in ./${DATA_DIR}. Skipping.`);
  process.exit(0);
}
console.log(`[converter] Using source: ${src}`);

const rows = sheetToRows(src);
if (!rows.length) {
  console.log("[converter] Source appears empty. Skipping.");
  process.exit(0);
}

const out = [];
const seen = new Set();

for (const r of rows) {
  const pnRaw   = getField(r, PN_KEYS);
  const descRaw = getField(r, DESC_KEYS);
  const costRaw = getField(r, COST_KEYS);

  const pn = toPN(pnRaw);
  if (!pn) continue;
  if (!startsWithAny(pn)) continue;
  if (seen.has(pn)) continue;
  seen.add(pn);

  out.push({
    part_number: pn,                 // rename Item -> part_number
    description: toDesc(descRaw),
    unit_cost: toNum(costRaw)
  });
}

out.sort((a,b) => a.part_number.localeCompare(b.part_number, "en"));
fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
console.log(`[converter] Wrote ${OUT_FILE} (${out.length} rows) from ${path.basename(src)}`);
