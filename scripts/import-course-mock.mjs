/**
 * Regenerate data/mock/assistance.json from professor workbooks in public/data/.
 * Run: node scripts/import-course-mock.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const recoveryPath = join(root, "public/data/Southwest_MCI_Disruption_Recovery_Dataset.xlsx");
const transportPath = join(root, "public/data/Transportation hotels.xlsx");
const outPath = join(root, "data/mock/assistance.json");

const recovery = XLSX.readFile(recoveryPath);
const hotelRows = XLSX.utils.sheet_to_json(recovery.Sheets["Hotel Inventory"]);
const properties = hotelRows.map((row) => ({
  name: row.Hotel,
  roomsAvailable: row["Rooms Available"],
  disruptionRateUsd: row["Disruption Rate $"],
  milesFromMci: row["Miles from MCI"],
  shuttle: row.Shuttle,
  busCapacityPerTrip: row["Bus Capacity per Trip"],
  usePreference: row["Use Preference"],
}));
const roomsAvailableTotal = properties.reduce((sum, p) => sum + (p.roomsAvailable ?? 0), 0);

const transport = XLSX.readFile(transportPath);
const sheet = XLSX.utils.sheet_to_json(transport.Sheets.Sheet1);
const countOf = (label) => {
  const row = sheet.find((r) => r["Transportaton Options"] === label);
  return typeof row?.__EMPTY === "number" ? row.__EMPTY : null;
};
const rateOf = (label, key) => {
  const row = sheet.find((r) => r["Transportaton Options"] === label);
  const value = row?.[key];
  return typeof value === "number" ? value : null;
};

const assistance = {
  source: "course-workbook",
  inventoryKnown: true,
  reason:
    "Classroom snapshot from Hotel Inventory (Southwest_MCI_Disruption_Recovery_Dataset.xlsx) and ground transport rates (Transportation hotels.xlsx). Nothing is reserved or dispatched for A31.",
  hotels: {
    workbook: "Southwest_MCI_Disruption_Recovery_Dataset.xlsx",
    sheet: "Hotel Inventory",
    roomsAvailableTotal,
    properties,
  },
  groundTransport: {
    workbook: "Transportation hotels.xlsx",
    vans16Passenger: countOf("16 passenger vans"),
    vans8Passenger: countOf("8 passenger vans"),
    van16RentalUsdPerHour: rateOf("16 passenger Van Rental- includes driver", "Per hour rental rate"),
    van8RentalUsdPerHour: rateOf("8 passenger van rental- includes driver", "Per hour rental rate"),
    uberXlContractedUsdPerTrip: rateOf("Uber XL- up to 10 miles (contracted0", "Contracted Rate per trip"),
    note: "Van counts and contracted rates from the professor sheet; not dispatched for this flight.",
  },
};

writeFileSync(outPath, `${JSON.stringify(assistance, null, 2)}\n`, "utf8");
console.log(`Wrote ${outPath} (${roomsAvailableTotal} rooms across ${properties.length} hotels).`);