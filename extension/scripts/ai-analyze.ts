import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const intermediateFile = path.resolve(process.argv[2] || path.join(__dirname, "../src/viewer/examples/lms-scan-intermediate.json"));
const outputFile = path.resolve(process.argv[3] || path.join(__dirname, "../src/viewer/examples/lms-ai-analyzed.json"));

console.log(`Input: ${intermediateFile}`);

const prompt = `Read the file at ${intermediateFile} and analyze it as a DDD architecture scan result.

The file contains scanned Java/Kotlin class metadata in JSON format. Classify each class and produce a BoundedContextGraph JSON.

Rules:
- controller: @RestController, @Controller
- usecase: @Service + *UseCase/*AppService
- aggregate: Domain classes with matching Repository (EmployeeRepository -> Employee is aggregate). Private constructor + factory methods (create/reconstruct).
- domain_service: @Service in domain package
- repository: *Repository interfaces in domain (skip *RepositoryImpl, *JpaRepository in infrastructure)
- adapter: @Component + *Adapter/*Client
- policy: @EventListener
- domain_event: *Event classes

Exclude: DTOs, Exceptions, Enums, Value Objects, JPA entities in infrastructure, Config, Mappers, Utils, Base classes

Layer by package: *.interfaces.*,*.web.* -> presentation | *.application.* -> application | *.domain.* -> domain | *.infrastructure.* -> infrastructure

Edges: Controller->UseCase=invokes, UseCase->Repository=invokes, UseCase->DomainService=invokes, Repository->Aggregate=invokes

Keep 30-60 nodes. Output ONLY valid JSON:
{"context":{"id":"...","name":"...","description":"..."},"layers":[{"id":"presentation","displayName":"Presentation","order":0},{"id":"application","displayName":"Application","order":1},{"id":"domain","displayName":"Domain","order":2},{"id":"infrastructure","displayName":"Infrastructure","order":3}],"nodes":[{"id":"kebab-case","label":"ClassName","type":"...","layer":"...","subtitle":"...","codeMapping":{"filePath":"...","className":"...","packageName":"..."}}],"edges":[{"from":"id","to":"id","type":"invokes"}]}`;

console.log("Calling Claude CLI...");

try {
  const result = execFileSync("claude", [
    "-p", prompt,
    "--allowedTools", "Read",
    "--output-format", "text",
    "--max-turns", "10",
  ], {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 300000,
    encoding: "utf-8",
  });

  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const graph = JSON.parse(jsonMatch[0]);
    fs.writeFileSync(outputFile, JSON.stringify(graph, null, 2));
    console.log(`Done! Nodes: ${graph.nodes?.length ?? 0}, Edges: ${graph.edges?.length ?? 0}`);
    console.log(`Output: ${outputFile}`);
  } else {
    console.error("No JSON found in response");
    fs.writeFileSync(outputFile + ".raw.txt", result);
    console.error("Raw response saved to", outputFile + ".raw.txt");
  }
} catch (e: any) {
  console.error("Error:", e.message?.substring(0, 500));
  if (e.stdout) {
    fs.writeFileSync(outputFile + ".raw.txt", e.stdout);
    console.error("Partial output saved to", outputFile + ".raw.txt");
  }
  process.exit(1);
}
