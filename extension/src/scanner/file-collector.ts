import * as fs from "fs";
import * as path from "path";

export interface SourceFile {
  absolutePath: string;
  relativePath: string;
  language: "java" | "kotlin";
}

/**
 * Parse Gradle settings file and extract included module names.
 */
function parseGradleModules(settingsContent: string): string[] {
  const modules: string[] = [];
  // Match include("mod1", "mod2") or include(":mod1", ":mod2")
  const includeRegex = /include\s*\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = includeRegex.exec(settingsContent)) !== null) {
    const args = match[1] ?? "";
    // Extract quoted strings
    const quotedRegex = /["']([^"']+)["']/g;
    let qm: RegExpExecArray | null;
    while ((qm = quotedRegex.exec(args)) !== null) {
      // Strip leading colon (Gradle project path prefix)
      const mod = (qm[1] ?? "").replace(/^:/, "").replace(/:/g, "/");
      if (mod) modules.push(mod);
    }
  }
  return modules;
}

/**
 * Walk a directory recursively and collect Java/Kotlin source files.
 */
function walkDir(
  dir: string,
  projectRoot: string,
  result: SourceFile[]
): void {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, projectRoot, result);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (ext === ".java" || ext === ".kt") {
        const relativePath = path.relative(projectRoot, fullPath).replace(/\\/g, "/");
        result.push({
          absolutePath: fullPath,
          relativePath,
          language: ext === ".java" ? "java" : "kotlin",
        });
      }
    }
  }
}

/**
 * Walk src/ directory excluding test directories.
 */
function walkSrcNonTest(
  dir: string,
  projectRoot: string,
  result: SourceFile[]
): void {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "test" || entry.name === "testFixtures") continue;
      walkSrcNonTest(fullPath, projectRoot, result);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (ext === ".java" || ext === ".kt") {
        const relativePath = path.relative(projectRoot, fullPath).replace(/\\/g, "/");
        result.push({
          absolutePath: fullPath,
          relativePath,
          language: ext === ".java" ? "java" : "kotlin",
        });
      }
    }
  }
}

/**
 * Collect all Java/Kotlin source files from a project.
 * Reads settings.gradle(.kts) to discover modules.
 * Only includes src/main/java and src/main/kotlin.
 * Excludes src/test/.
 */
export function collectSourceFiles(projectRoot: string): SourceFile[] {
  const files: SourceFile[] = [];

  // Detect modules via settings.gradle or settings.gradle.kts
  const settingsPaths = [
    path.join(projectRoot, "settings.gradle.kts"),
    path.join(projectRoot, "settings.gradle"),
  ];

  let modules: string[] = [];
  for (const settingsPath of settingsPaths) {
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, "utf-8");
      modules = parseGradleModules(content);
      break;
    }
  }

  if (modules.length > 0) {
    // Multi-module project: scan each module's src/main
    for (const mod of modules) {
      const modRoot = path.join(projectRoot, mod);
      walkDir(path.join(modRoot, "src", "main", "java"), projectRoot, files);
      walkDir(path.join(modRoot, "src", "main", "kotlin"), projectRoot, files);
    }
  } else {
    // Single-module: scan src/main/java and src/main/kotlin
    walkDir(path.join(projectRoot, "src", "main", "java"), projectRoot, files);
    walkDir(path.join(projectRoot, "src", "main", "kotlin"), projectRoot, files);
    // Fallback: try src/ directly (non-Maven-layout projects), skip test dirs
    if (files.length === 0) {
      walkSrcNonTest(path.join(projectRoot, "src"), projectRoot, files);
    }
  }

  return files;
}

/**
 * Detect module names from a project root (for ScanResult.modules).
 */
export function detectModules(projectRoot: string): string[] {
  const settingsPaths = [
    path.join(projectRoot, "settings.gradle.kts"),
    path.join(projectRoot, "settings.gradle"),
  ];

  for (const settingsPath of settingsPaths) {
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, "utf-8");
      const modules = parseGradleModules(content);
      if (modules.length > 0) return modules;
    }
  }

  return [];
}
