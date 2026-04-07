import * as fs from "fs";
import * as path from "path";
import { collectSourceFiles, detectModules } from "./file-collector.js";
import { parseJavaSource } from "./java-parser.js";
import { parseKotlinSource } from "./kotlin-parser.js";
import type { ScanResult, ScannedClass } from "./types.js";

export type { ScanResult, ScannedClass } from "./types.js";
export type { ParamInfo } from "./types.js";

/**
 * Scan a Java/Kotlin project and extract intermediate metadata for AI classification.
 */
export async function scan(projectPath: string): Promise<ScanResult> {
  const absoluteProjectPath = path.resolve(projectPath);
  const files = collectSourceFiles(absoluteProjectPath);
  const classes: ScannedClass[] = [];

  for (const file of files) {
    const source = fs.readFileSync(file.absolutePath, "utf-8");
    const parsed =
      file.language === "java"
        ? parseJavaSource(source, file.relativePath)
        : parseKotlinSource(source, file.relativePath);
    if (parsed) classes.push(parsed);
  }

  return {
    projectName: path.basename(absoluteProjectPath),
    projectPath: absoluteProjectPath,
    modules: detectModules(absoluteProjectPath),
    classes,
  };
}
