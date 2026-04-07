import { scan } from "../src/scanner/index";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectPath = process.argv[2];
if (!projectPath) {
  console.error("Usage: npx tsx scripts/scan-to-json.ts <project-path>");
  process.exit(1);
}

async function main() {
  const result = await scan(path.resolve(projectPath));
  const outputPath = path.join(__dirname, "../src/viewer/examples/lms-scan-intermediate.json");
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`Scanned: ${result.classes.length} classes`);
  console.log(`Output: ${outputPath}`);
}
main();
