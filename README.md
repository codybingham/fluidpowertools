# Fluid Power Tools

## Overview
Fluid Power Tools is a collection of browser-based calculators and utilities
for fluid power engineering. The site is a static set of HTML, CSS, and
JavaScript assets that can be served from any web server.

## Features
- Pressure drop calculator using the Swamee–Jain approximation.
- Unit conversion helper.
- Cylinder force and pump power calculators.
- Bill of materials builder with fuzzy part lookup.
- Optional part lookup tab gated by a simple password.
- All results persist locally through `localStorage`.

## Usage
Open `index.html` in a modern web browser to use the tools. No build step is
required for basic functionality. For local development, serve the directory
with a static file server so the browser can load `items_export_slim.json`.

```
npx serve .
```

This command starts a temporary server at <http://localhost:3000>.

## Data conversion
Part lookup data lives in `items_export_slim.json`. To regenerate it from a
spreadsheet:

1. Place an `.xlsx`, `.csv`, or `.csv.gz` file in the `data/` directory.
2. Optionally set `PREFIXES` to filter part numbers, e.g.
   `PREFIXES="60,30" npm run build:json`.
3. Run:

   ```
   npm install
   npm run build:json
   ```

   The script chooses the newest file in `data/` and writes
   `items_export_slim.json`.

## Project structure
```
index.html      Main HTML interface.
styles.css      Page styling.
script.js       Client-side logic for calculators and lookup.
scripts/        Node utilities for data processing.
data/           Source spreadsheets for part lookup.
```

## Contributing
Validate HTML and CSS manually. Use two spaces for indentation and keep line
length under 80 characters. Commit generated files such as
`items_export_slim.json`.

## License
This project is licensed under the MIT License. See `LICENSE` for details.
