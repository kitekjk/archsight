import type { ScannedClass, ParamInfo } from "./types.js";
import * as path from "path";

function parseParams(paramStr: string): ParamInfo[] {
  const params: ParamInfo[] = [];
  const trimmed = paramStr.trim();
  if (!trimmed) return params;

  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of trimmed) {
    if (ch === "<" || ch === "(") depth++;
    else if (ch === ">" || ch === ")") depth--;
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
    const clean = p.replace(/@\w+(\([^)]*\))?\s*/g, "").trim();
    // Remove visibility modifier (private/protected/internal) + val/var
    const noVisibility = clean.replace(/^(private|protected|internal|public)\s+/, "");
    const noValVar = noVisibility.replace(/^(val|var)\s+/, "");
    const noDefault = noValVar.replace(/\s*=\s*.+$/, "").trim();
    const colonIdx = noDefault.indexOf(":");
    if (colonIdx >= 0) {
      const name = noDefault.slice(0, colonIdx).trim();
      const typeName = noDefault.slice(colonIdx + 1).trim();
      params.push({ name, typeName });
    } else {
      params.push({ name: noDefault, typeName: "" });
    }
  }
  return params;
}

function extractPublicFunctions(source: string): string[] {
  const funcs: string[] = [];
  const lines = source.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\s*(private|protected|internal)\s/.test(line)) continue;
    const funMatch = /(?:suspend\s+)?fun\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([\w<>?,\s\[\].]+))?/.exec(trimmed);
    if (funMatch) {
      const name = funMatch[1]!;
      const params = funMatch[2]!.trim();
      const returnType = funMatch[3]?.trim() ?? "Unit";
      funcs.push(`${name}(${params}): ${returnType}`);
    }
  }
  return funcs;
}

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

function extractSuperTypes(classDeclLine: string): string[] {
  const colonMatch = /:\s*([\w\s,.<>()]+?)(?:\{|$)/.exec(classDeclLine);
  if (!colonMatch) return [];

  const superPart = colonMatch[1]!;
  const types: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of superPart) {
    if (ch === "<" || ch === "(") depth++;
    else if (ch === ">" || ch === ")") depth--;
    if (ch === "," && depth === 0) {
      const t = current.trim().replace(/\([^)]*\)$/, "").trim();
      if (t) types.push(t);
      current = "";
    } else {
      current += ch;
    }
  }
  const last = current.trim().replace(/\([^)]*\)$/, "").trim();
  if (last) types.push(last);

  return types.filter((t) => t.length > 0);
}

function extractPrimaryConstructor(
  source: string,
  className: string
): { params: ParamInfo[]; isPrivate: boolean } {
  // Build regex patterns using string concatenation to avoid escape issues
  const explicitPattern =
    "class\\s+" + className + "[^(]*?(private\\s+)?constructor\\s*\\(([\\s\\S]*?)\\)";
  const explicitCtorRegex = new RegExp(explicitPattern);
  const explicitMatch = explicitCtorRegex.exec(source);
  if (explicitMatch) {
    const isPrivate = !!explicitMatch[1];
    const params = parseParams(explicitMatch[2] ?? "");
    return { params, isPrivate };
  }

  const implicitPattern = "class\\s+" + className + "\\s*\\(([\\s\\S]*?)\\)";
  const implicitCtorRegex = new RegExp(implicitPattern);
  const implicitMatch = implicitCtorRegex.exec(source);
  if (implicitMatch) {
    const params = parseParams(implicitMatch[1] ?? "");
    return { params, isPrivate: false };
  }

  return { params: [], isPrivate: false };
}

function hasCompanionFactoryMethods(source: string): boolean {
  if (!/companion\s+object/.test(source)) return false;
  const idx = source.indexOf("companion object");
  if (idx < 0) return false;
  const after = source.slice(idx);
  return /fun\s+(create|of|from|reconstruct|invoke)\s*\(/.test(after);
}

export function parseKotlinSource(
  source: string,
  filePath: string
): ScannedClass | null {
  const packageMatch = /package\s+([\w.]+)/.exec(source);
  const packageName = packageMatch ? packageMatch[1]! : "";

  const classDeclRegex =
    /(data\s+)?(value\s+)?(sealed\s+)?(abstract\s+)?(open\s+)?(annotation\s+)?(enum\s+)?class\s+(\w+)/;
  const interfaceRegex = /(?:^|\s)interface\s+(\w+)/m;

  const classDeclMatch = classDeclRegex.exec(source);
  const interfaceMatch = interfaceRegex.exec(source);

  let className = "";
  let classDeclIndex = 0;
  let isInterface = false;
  let isEnum = false;
  let isDataClass = false;
  let isValueClass = false;
  let isAnnotationClass = false;
  let isAbstract = false;

  if (classDeclMatch) {
    classDeclIndex = classDeclMatch.index;
    className = classDeclMatch[8] ?? path.basename(filePath, path.extname(filePath));
    isDataClass = !!classDeclMatch[1];
    isValueClass = !!classDeclMatch[2];
    isAbstract = !!classDeclMatch[4];
    isAnnotationClass = !!classDeclMatch[6];
    isEnum = !!classDeclMatch[7];
  } else if (interfaceMatch) {
    classDeclIndex = interfaceMatch.index;
    className = interfaceMatch[1] ?? path.basename(filePath, path.extname(filePath));
    isInterface = true;
  } else {
    return null;
  }

  const annotations = extractAnnotations(source, classDeclIndex);

  const afterDecl = source.slice(classDeclIndex);
  const braceIdx = afterDecl.indexOf("{");
  const classLine = braceIdx >= 0 ? afterDecl.slice(0, braceIdx) : afterDecl.slice(0, 300);
  const superTypes = isInterface ? [] : extractSuperTypes(classLine);

  const { params: constructorParams, isPrivate: hasPrivateConstructor } =
    isInterface || isEnum
      ? { params: [], isPrivate: false }
      : extractPrimaryConstructor(source, className);

  const publicMethods = extractPublicFunctions(source);
  const companionFactory = isInterface || isEnum ? false : hasCompanionFactoryMethods(source);

  return {
    className,
    packageName,
    filePath,
    language: "kotlin",
    annotations,
    constructorParams,
    publicMethods,
    superTypes,
    isInterface,
    isEnum,
    isDataClass,
    isValueClass,
    isAnnotationClass,
    isAbstract,
    hasPrivateConstructor,
    hasCompanionFactory: companionFactory,
  };
}
