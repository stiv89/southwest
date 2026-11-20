# Course source files

**Canonical location:** [`public/data/`](../../public/data/) (served as static files and listed in the repo).

| File | Intended use |
| --- | --- |
| `Southwest_MCI_Disruption_Recovery_Dataset.xlsx` | Aircraft, crew, passenger recovery, capacity, reserves, hotels |
| `Soutwest flights - tiers.xlsx` | Regional tier / station groupings |
| `Transportation hotels.xlsx` | Vans, rentals, hotel contracted rates |
| `Southwest MCI Daily Operating Schedule.docx` | MCI day-of schedule (local; often not committed — `*.docx` in `.gitignore`) |

The app reads **`data/mock/`** at build time. Those JSON files are the classroom API for tools. See `public/data/README.md` for how workbooks relate to the Ground Stop demo.

Do not commit passenger-level personal data. Synthetic IDs in the workbook are for class use only.