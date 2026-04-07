/**
 * Intermediate scan result format.
 * Contains raw facts extracted from Java/Kotlin source files.
 * AI uses this to make DDD classifications.
 */

export interface ScanResult {
  projectName: string;
  projectPath: string;
  modules: string[];
  classes: ScannedClass[];
}

export interface ScannedClass {
  className: string;
  packageName: string;
  /** Relative to project root */
  filePath: string;
  language: "java" | "kotlin";

  // Facts the scanner extracts
  annotations: string[];
  constructorParams: ParamInfo[];
  publicMethods: string[];
  superTypes: string[];

  // Structural hints for AI
  isInterface: boolean;
  isEnum: boolean;
  /** Kotlin data class */
  isDataClass: boolean;
  /** Kotlin @JvmInline value class */
  isValueClass: boolean;
  /** Java @interface or Kotlin annotation class */
  isAnnotationClass: boolean;
  isAbstract: boolean;
  hasPrivateConstructor: boolean;
  /** Has companion object with create/of/from/reconstruct methods */
  hasCompanionFactory: boolean;
}

export interface ParamInfo {
  name: string;
  typeName: string;
}
