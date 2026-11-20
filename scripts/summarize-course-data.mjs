#!/usr/bin/env node
/**
 * Prints sheet names and row counts for course workbooks in public/data/.
 * Usage: node scripts/summarize-course-data.mjs
 */
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "public", "data");

for (const name of readdirSync(dataDir).filter((f) => f.endsWith(".xlsx"))) {
  const wb = XLSX.readFile(join(dataDir, name));
  console.log(`\n${name}`);
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
    console.log(`  - ${sheetName}: ${rows.length} rows`);
  }
}