import type { ScannedClass, ParamInfo } from "./types.js";
import * as path from "path";

/**
 * Parse a parameter list string into ParamInfo[].
 * Handles generic types like List<String>, Map<K, V>.
 */
function parseParams(paramStr: string): ParamInfo[] {
  const params: ParamInfo[] = [];
  const trimmed = paramStr.trim();
  if (!trimmed) return params;

  // Split by comma, but respect < > nesting
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of trimmed) {
    if (ch === "<") depth++;
    else if (ch === ">") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());

  for (const part of parts) {
    const p = part.trim();
    if (!p) continue;
    // Remove annotations before the type, e.g. "@Valid String name"
    const clean = p.replace(/@\w+(\([^)]*\))?\s*/g, "").trim();
    // Last token is name, everything before is type
    const tokens = clean.split(/\s+/);
    if (tokens.length >= 2) {
      const name = tokens[tokens.length - 1]!.replace(/^\.\.\./, "");
      const typeName = tokens.slice(0, tokens.length - 1).join(" ").replace(/\.\.\.$/, "").trim();
      params.push({ name, typeName });
    } else if (tokens.length === 1) {
      params.push({ name: "", typeName: tokens[0]! });
    }
  }

  return params;
}

/**
 * Extract the constructor with the most parameters from a Java source.
 */
function extractConstructorParams(
  source: string,
  className: string
): { params: ParamInfo[]; isPrivate: boolean } {
  let bestParams: ParamInfo[] = [];
  let foundPrivate = false;

  const ctorRegex = new RegExp(
    `(private|protected|public)?\\s+${className}\\s*\\(([^)]*)\\)`,
    "gs"
  );
  let match: RegExpExecArray | null;
  while ((match = ctorRegex.exec(source)) !== null) {
    const modifier = match[1];
    const paramStr = match[2] ?? "";
    const params = parseParams(paramStr);
    if (params.length > bestParams.length) {
      bestParams = params;
      foundPrivate = modifier === "private";
    }
  }
  return { params: bestParams, isPrivate: foundPrivate };
}

/**
 * Extract public method signatures from Java source.
 * Also captures interface abstract methods (no explicit public keyword needed).
 */
function extractPublicMethods(source: string, className: string, isInterface: boolean): string[] {
  const methods: string[] = [];
  // For interfaces, methods without explicit access modifier are public by default
  const modifierPart = isInterface
    ? "(?:public\\s+)?(?:default\\s+)?(?:static\\s+)?"
    : "public\\s+(?:static\\s+)?(?:final\\s+)?(?:synchronized\\s+)?";
  const methodRegex = new RegExp(
    `${modifierPart}(?:<[^>]+>\\s+)?(\\w[\\w<>?,\\s\\[\\]]*?)\\s+(\\w+)\\s*\\(([^)]*)\\)`,
    "gs"
  );
  let match: RegExpExecArray | null;
  while ((match = methodRegex.exec(source)) !== null) {
    const returnType = match[1]!.trim();
    const methodName = match[2]!;
    const params = match[3]!;
    if (methodName === className) continue;
    if (returnType === "class" || returnType === "interface" || returnType === "enum") continue;
    // Avoid import statements: methodName following "import" patterns
    if (returnType === "void" || /^[\w<>?,\[\]]+$/.test(returnType)) {
      methods.push(`${methodName}(${params.trim()}): ${returnType}`);
    }
  }
  return methods;
}

/**
 * Extract annotations that appear before the class declaration.
 */
function extractAnnotations(source: string, classDeclIndex: number): string[] {
  const before = source.slice(0, classDeclIndex);
  const annotations: string[] = [];
  const annoRegex = /@(\w+)(?:\([^)]*\))?/g;
  let match: RegExpExecArray | null;
  while ((match = annoRegex.exec(before)) !== null) {
    annotations.push(`@${match[1]!}`);
  }
  return annotations;
}

/**
 * Parse superTypes from extends and implements clauses.
 */
function extractSuperTypes(classLine: string): string[] {
  const types: string[] = [];

  const extendsMatch = /extends\s+([\w.]+)/.exec(classLine);
  if (extendsMatch) {
    types.push(extendsMatch[1]!);
  }

  const implementsMatch = /implements\s+([\w\s,.<>]+?)(?:\{|$)/.exec(classLine);
  if (implementsMatch) {
    const impls = implementsMatch[1]!
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    types.push(...impls);
  }

  return types;
}

/**
 * Parse a Java source file and extract ScannedClass metadata.
 * Returns null if no class declaration is found.
 */
export function parseJavaSource(
  source: string,
  filePath: string
): ScannedClass | null {
  const packageMatch = /package\s+([\w.]+)\s*;/.exec(source);
  const packageName = packageMatch ? packageMatch[1]! : "";

  // Find class/interface/enum/@interface declaration
  const classDeclRegex =
    /(public\s+|protected\s+|private\s+)?(abstract\s+|final\s+)?(public\s+|protected\s+|private\s+)?(abstract\s+|final\s+)?(class|interface|enum|@interface)\s+(\w+)/;
  const classDeclMatch = classDeclRegex.exec(source);
  if (!classDeclMatch) return null;

  const kind = classDeclMatch[5]!;
  const className = classDeclMatch[6] ?? path.basename(filePath, path.extname(filePath));

  const isInterface = kind === "interface";
  const isEnum = kind === "enum";
  const isAnnotationClass = kind === "@interface";
  const isAbstract =
    !isInterface &&
    !isEnum &&
    source.slice(0, classDeclMatch.index + classDeclMatch[0].length).includes("abstract ");

  const annotations = extractAnnotations(source, classDeclMatch.index);

  const afterDecl = source.slice(classDeclMatch.index);
  const braceIdx = afterDecl.indexOf("{");
  const classLine = braceIdx >= 0 ? afterDecl.slice(0, braceIdx) : afterDecl.slice(0, 200);
  const superTypes = extractSuperTypes(classLine);

  const { params: constructorParams, isPrivate: hasPrivateConstructor } =
    extractConstructorParams(source, className);

  const publicMethods = extractPublicMethods(source, className, isInterface);

  return {
    className,
    packageName,
    filePath,
    language: "java",
    annotations,
    constructorParams,
    publicMethods,
    superTypes,
    isInterface,
    isEnum,
    isDataClass: false,
    isValueClass: false,
    isAnnotationClass,
    isAbstract,
    hasPrivateConstructor,
    hasCompanionFactory: false,
  };
}
