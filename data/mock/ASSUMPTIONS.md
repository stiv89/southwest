# Mock data assumptions

This folder is a classroom stand-in. It is not an airline, FAA, or airport feed.

The professor’s workbooks live in **`public/data/`** (see `public/data/README.md`). Runtime mock JSON is traced to those files where noted below.

- `Southwest_MCI_Disruption_Recovery_Dataset.xlsx`
- `Soutwest flights - tiers.xlsx` (filename spelling as provided)
- `Transportation hotels.xlsx`
- `Southwest MCI Daily Operating Schedule.docx` (local reference; may not be in git)

Regenerate hotel and ground-transport mock data:

```bash
node scripts/import-course-mock.mjs
```

## Ground stop scenario (`scenario-mci-ground-stop.json`)

| Field | Source |
| --- | --- |
| Passengers 123, connections 23, wheelchair 2 | Passenger Recovery sheet, row F31 / aircraft A31 |
| Crew duty 6 hours, C31 note | Crew sheet, crew C31 |
| Fuel note references 62% fuel | Aircraft sheet, tail A31 |
| Airborne DEN→MCI, ground stop event, 55 min fuel flexibility, alternates | Classroom Ground Stop exercise narrative (not a single workbook row) |

## What is deliberately unknown

`diversion-candidates.json` lists the same alternate airports so the demo can qualify them. Handling capacity, runway suitability, diversion flight time, fuel required, and ground handling are `null`. The app must show those as unknown. It must not rank an airport as a preferred or safe diversion.

Airport names are geographic labels only.

## Assistance (`assistance.json`)

Imported from **Hotel Inventory** (207 rooms across seven properties) and **Transportation hotels.xlsx** (van counts and contracted rates). `inventoryKnown` is `true` because the classroom snapshot is loaded, but the customer-service agent still treats rooms and vans as **not reserved** for A31.