# Mock data assumptions

This folder is a classroom stand-in. It is not an airline, FAA, or airport feed.

The course files named in `REQUIREMENTS.md` were not in the workspace when this demo was built:

- `Southwest flights - tiers.xlsx`
- `Southwest MCI Daily Operating Schedule.docx`
- `Transportation hotels.xlsx`
- `Southwest_MCI_Disruption_Recovery_Dataset.xlsx`

## What is a course-brief fact

`scenario-mci-ground-stop.json` repeats the Day 2, 12:20 PM MCI Ground Stop figures from the assignment: airport, ground stop, A31 airborne from DEN, 158 passengers, 42 connections, 3 wheelchair passengers, 4 hours 20 minutes of crew duty, about 55 minutes of fuel flexibility, and the alternate codes STL, OMA, DSM, ICT, and TUL.

Those figures are labeled `Course scenario brief`. They are not live telemetry.

## What is deliberately unknown

`diversion-candidates.json` lists the same alternate airports so the demo can qualify them. Handling capacity, runway suitability, diversion flight time, fuel required, and ground handling are `null`. The app must show those as unknown. It must not rank an airport as a preferred or safe diversion.

Airport names are geographic labels only.

`assistance.json` keeps hotel and ground-transport inventory unknown because the hotel workbook was not available. The customer-service tool reports that gap. It does not invent rooms or shuttles.

## If the course files show up later

Put them in `data/source/`, inspect the real columns, and replace only the fields you can trace. Do not mark inventory or airport capability as known until that inspection is done.
