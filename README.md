# Excel Aggregator

**Visual analysis, comparison, and aggregation of structured Excel reports — right in your browser.**

Excel Aggregator is a web tool for people who deal with dozens (or hundreds) of near-identical Excel files: financial statements, ledgers, recurring reports. Instead of merging spreadsheets by hand, you pick one file as a **master template**, and the tool uses its layout to understand every other file — then aggregates, compares, and audits them for you.

🔗 **Live demo:** https://daniyar-beishekeev.github.io/excel-aggregator/

---

## The problem

Working with hundreds of repetitive reports, financial statements, and logs eats up enormous amounts of time. Manual merging of data is slow and error-prone — small mistakes creep in and computational accuracy gets lost.

Most tools solve this by naively concatenating rows and columns. Excel Aggregator takes a different approach: it treats one uploaded sheet as an **authoritative master template**, deeply inspecting its:

- **Table layout** — row and column structure
- **Formulas** — extracting and validating complex calculation logic
- **Formatting** — correctly handling merged cells and styles

Every other file is then read and reconciled against that template, instead of being blindly appended.

## Key features

### 📊 Aggregation
Sum, average, min, and max over user-defined cell ranges — applied consistently across every file that matches the template.

### 🔄 Comparison
Detailed reconciliation of new files against the master template to surface even the smallest changes in the dataset.

### 🥧 Frequency analysis
Build lists of unique values per cell/field and get precise counts of how often each one appears across all uploaded files.

### 🛠 Automatic audit
The tool actively looks for things that are easy to miss by eye:

| Check | What it catches |
|---|---|
| **Changed formulas** | Cells where the original formula was silently overwritten with a hardcoded value |
| **Dirty data** | Missing, logically inconsistent, or incorrectly formatted values |
| **Structural shifts** | Layout mismatches and offsets between different versions of the "same" report |

### 🪶 Careful rendering
The rendering engine mimics Excel's own behavior as closely as possible — cells that haven't changed are never touched during processing, and comparisons happen *inside* individual cells without breaking the overall visual structure of the sheet.

## Who it's for

- **Accountants** — find discrepancies in financial statements and verify totals across hundreds of files.
- **Data analysts** — quickly extract structured information from recurring reports.
- **Data engineers** — catch bad datasets and unexpected format drift at the ingestion point.

## Practical results

- **100+ files** can be checked against a single master template in one pass.
- Instantly surfaces changes that commonly break downstream import pipelines — a zero silently replaced by a blank cell, stray characters, or formulas that look identical but aren't.

The goal is simple: make Excel auditing easier, improve validation accuracy, and help teams process large collections of spreadsheets faster and more reliably.

## How it works

1. **Upload files** — add one or more `.xlsx`/`.xls` files (a single file can contain multiple sheets).
2. **Pick a master template** — select the sheet whose structure should be treated as the source of truth.
3. **Choose a mode** — aggregation (sum / average / min / max / range / deviation), comparison, or frequency analysis.
4. **Review inline** — results are color-coded per file/sheet directly in a spreadsheet-like grid, with changed values, formulas, and structural diffs highlighted so you can spot issues visually instead of hunting through raw cells.

## Tech stack

- **React 19** + **Vite** — UI and build tooling
- **TypeScript**
- **ExcelJS** / **SheetJS (xlsx)** — reading, parsing, and writing spreadsheet files (including formulas, merged cells, and styles)
- **react-bootstrap** / **bootstrap-icons** — UI components
- **react-i18next** — internationalization (see `public/locales`)
- **react-select**, **sortablejs / react-sortablejs** — interactive controls
- **lodash**, **date-fns**, **p-limit** — data handling and concurrency utilities

Everything runs client-side in the browser — no files are uploaded to a server.

## Getting started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
git clone https://github.com/daniyar-beishekeev/excel-aggregator.git
cd excel-aggregator
npm install
```

### Development

```bash
npm run dev
```

This starts a local Vite dev server with hot module reloading.

### Production build

```bash
npm run build
npm run preview   # preview the production build locally
```

### Deployment

The project is configured to deploy to GitHub Pages:

```bash
npm run deploy
```

This builds the app and publishes the `dist` folder to the `github-pages` branch.

### Linting

```bash
npm run lint
```

## Project structure

```
excel-aggregator/
├── public/
│   └── locales/        # i18n translation files
├── src/                 # application source (components, logic, styles)
├── index.html
├── vite.config.js
├── tsconfig.json
└── package.json
```

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

## Contributing

Issues and pull requests are welcome. If you run into a file that isn't handled correctly, please include a minimal (anonymized) sample so the reconciliation logic can be improved.
