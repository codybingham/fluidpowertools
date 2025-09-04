import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

const DATA_DIR = "data";
const OUT_FILE = "items_export_slim.json";
const PREFIXES = (process.env.PREFIXES ?? "60,30,73,13,HA,HK")
  .split(",").map(s => s.trim()).filter(Boolean);

function newestDataFile(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => /\.(xlsx|csv)$/i.test(f))
    .sort((a,b) => fs.statSync(path.join(dir,b)).mtimeMs - fs.statSync(path.join(dir,a)).mtimeMs);
  if (!files.length) throw new Error(`No .xlsx or .csv files found in ${dir}`);
  return path.join(dir, files[0]);
}

const startsWithAny = (pn) => !PREFIXES.length || PREFIXES.some(p => pn.startsWith(p));
const toPN   = (x) => String(x ?? "").trim().toUpperCase();
const toDesc = (x) => String(x ?? "").replace(/\s+/g, " ").trim();
const toNum  = (x) => {
  const n = Number(String(x ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0.0;
};

// ---- run ----
const src = newestDataFile(DATA_DIR);
const wb = XLSX.readFile(src, { cellDates:false });          // works for .xlsx and .csv
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: null }); // [{ "Item":..., "Description":..., "Unit Cost":... }]

const PN_KEYS   = ["Item"];
const DESC_KEYS = ["Description"];
const COST_KEYS = ["Unit Cost","UnitCost"];

function getField(row, keys) {
  for (const k of keys) if (row.hasOwnProperty(k)) return row[k];
  const lower = Object.fromEntries(Object.entries(row).map(([k,v]) => [k.toLowerCase(), v]));
  for (const k of keys.map(k=>k.toLowerCase())) if (lower.hasOwnProperty(k)) return lower[k];
  return null;
}

const out = [];
const seen = new Set();

for (const r of rows) {
  const pnRaw   = getField(r, PN_KEYS);
  const descRaw = getField(r, DESC_KEYS);
  const costRaw = getField(r, COST_KEYS);

  const pn = toPN(pnRaw);
  if (!pn || !startsWithAny(pn) || seen.has(pn)) continue;
  seen.add(pn);

  out.push({ part_number: pn, description: toDesc(descRaw), unit_cost: toNum(costRaw) });
}

out.sort((a,b) => a.part_number.localeCompare(b.part_number,"en"));
fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
console.log(`Wrote ${OUT_FILE} (${out.length} rows) from ${path.basename(src)}`);
