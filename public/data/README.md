# Course data (professor handouts)

These files support the **ID701 MCI disruption** exercise. They are **synthetic classroom data**, not live Southwest operations.

| File | Role |
| --- | --- |
| `southwest-airlines-boeing-737.zip` | B737 FBX on the ramp (C14 stand) |
| `Southwest_MCI_Disruption_Recovery_Dataset.xlsx` | Main workbook: aircraft, crew, passenger recovery, later-flight capacity, reserve crews, hotel inventory, dashboard totals |
| `Soutwest flights - tiers.xlsx` | Southwest market tiers by region (hub lists) |
| `Transportation hotels.xlsx` | Ground transport options and contracted hotel rates |
| `Southwest MCI Daily Operating Schedule.docx` | Daily MCI operating schedule (local reference; may be gitignored as `*.docx`) |

## How the app uses this today

The running demo loads **`data/mock/*.json`**, aligned with this folder where possible:

- **Ground stop narrative**: A31 airborne DEN → MCI, ground stop, alternates — classroom exercise overlay (see `data/mock/ASSUMPTIONS.md`).
- **Passenger / crew counts**: **F31 / A31 / C31** rows in the recovery workbook (123 booked, 23 connecting, 2 wheelchair; pilot duty 6 hours).
- **Hotels and vans**: `assistance.json` from **Hotel Inventory** and **Transportation hotels.xlsx** (`node scripts/import-course-mock.mjs` to regenerate).

Diversion airport **capability** stays unknown in mock JSON; hotel/van figures are **classroom snapshots**, not reservations.

Quick inspect (requires `xlsx` once): `scripts/summarize-course-data.mjs` and `scripts/import-course-mock.mjs`.