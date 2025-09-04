# Fluid Power Tools

## Overview
Fluid Power Tools is a collection of browser-based calculators and utilities
for fluid power engineering. The site ships as static HTML, CSS, and
JavaScript files that can be served from any simple web server.

## Features
- Pressure drop calculator using the Darcy–Weisbach equation with the
  Swamee–Jain approximation.
- General unit converter for flow, pressure, and length.
- Cylinder force estimator and pump power calculator.
- BOM comparator to diff two lists of part numbers.
- Password-protected part lookup with wildcard search.
- Fuzzy part lookup that builds a BOM and can export to CSV.
- All results persist locally through `localStorage`.

## Usage
Open `index.html` in a modern browser to use the tools. No build step is
required for the calculators. For local development run a small static file
server so the browser can load `items_export_slim.json`.

```
npx serve .
```

This command starts a temporary server at <http://localhost:3000>. Any
similar tool such as `python -m http.server` also works.

The **Part Lookup** tab is hidden behind a password. The default password is
`hydraulics`. Adjust the `PART_LOOKUP_PASSWORD` constant in `script.js` to
change it. Wildcards (`*`) are allowed in the part number and description
fields.

The **Fuzzy Part Lookup** tab lets you build a BOM from free-form searches and
export the list to CSV. Data and selections are cached in `localStorage`.

For an offline single-file part lookup, open
`spudnik_part_lookup_singlefile.html`.

## Data conversion
Part lookup data lives in `items_export_slim.json`. Regenerate it from a
spreadsheet with the Node script in `scripts/xlsx_to_json.mjs`.

1. Place an `.xlsx`, `.csv`, or `.csv.gz` file in the `data/` directory.
2. Optionally set `PREFIXES` to limit part numbers, for example:
   `PREFIXES="60,30" npm run build:json`.
3. Run:

   ```
   npm install
   npm run build:json
   ```

The script picks the newest file in `data/` and writes `items_export_slim.json`
sorted by part number.

## Project structure
```
index.html      Main HTML interface.
styles.css      Page styling.
script.js       Client-side logic for calculators and lookup.
scripts/        Node utilities for data processing.
data/           Source spreadsheets for part lookup.
spudnik_part_lookup_singlefile.html  Offline part lookup demo.
```

## Contributing
Validate HTML and CSS manually. Use two spaces for indentation and keep lines
under 80 characters. Commit generated files such as `items_export_slim.json`.

## License
This project is licensed under the MIT License. See `LICENSE` for details.
