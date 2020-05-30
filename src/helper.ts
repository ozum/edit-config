import { cosmiconfig, Options as CosmiconfigOptions } from "cosmiconfig";
import { extname, basename } from "path";
import chalk from "chalk";
import commentJson, { assign } from "comment-json";
import yaml from "js-yaml";
import isEqual from "lodash.isequal";
import { readFile } from "fs-extra";
import get from "lodash.get";
import type DataFile from "./data-file";
import { PredicateFunction, DataPath, FileFormat, ValueFunction, Key } from "./types";

/** @ignore */
let prettier: any; // eslint-disable-line import/no-mutable-exports

// Export prettier if it is installed by parent module.
try {
  prettier = require("prettier"); // eslint-disable-line
} catch {} // eslint-disable-line no-empty

export { prettier };

/** @ignore */
export const supportedFileExtensions: Record<string, FileFormat> = {
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  js: "js",
  "": "",
};

/**
 * Returns given string after making it's first letter uppercase.
 *
 * @ignore
 * @param string is input to make first letter uppercase.
 */
export function ucFirst(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Returns `input` if it is an array, otherwise an array containing `input` as only element.
 *
 * @ignore
 */
export function arrify<T>(input: T | T[]): T[] {
  return Array.isArray(input) ? input : [input];
}

// /**
//  * Filters an array based on starting strings of its elements and returns filtered array as a new array.
//  *
//  * @ignore
//  * @param array is array to be filtered.
//  * @param include is string or array of strings, of which elements starting with is included.
//  * @param exclude is string or array of strings, of which elements starting with is excluded.
//  * @returns filtered array.
//  */
// export function filterArray(
//   array: Key[],
//   { include = [], exclude = [] }: { include?: string | string[]; exclude?: string | string[] }
// ): string[] {
//   const includeArray = arrify(include);
//   const excludeArray = arrify(exclude);
//   let result = array;

//   if (includeArray.length > 0) {
//     result = result.filter((key) => typeof key === "string" && includeArray.some((included) => key.startsWith(included)));
//   }
//   if (excludeArray.length > 0) {
//     result = result.filter((key) => typeof key === "string" && !excludeArray.some((excluded) => key.startsWith(excluded)));
//   }
//   return result as string[];
// }

/**
 * Sort keys in given order. Missing keys in `keys` added to the end. If no keys are provided, sorts alphabetically.
 *
 * @ignore
 * @param object is the object to order keys of.
 * @param param1 options
 * @param param1.start are ordered keys to appear at the start of object.
 * @param param1.end are ordered keys to appear at the end of object.
 * @returns same object with ordered keys.
 */
export function sortKeys(object: object, { start = [] as string[], end = [] as string[] } = {}): object {
  const objectKeys = Object.keys(object);
  const allKeys = [...new Set([...start, ...objectKeys.filter((k) => !end.includes(k)).sort(), ...end])];
  const keys = allKeys.filter((k) => Object.prototype.hasOwnProperty.call(object, k));
  if (isEqual(keys, objectKeys)) return object;
  return assign({}, object, keys as any);
}

/**
 * Parses given string and returns format and object. If no format given, tries to parse first as json using JSON5, then yaml.
 *
 * @ignore
 * @param content is string to parse
 * @param rootDataPath is the path to return data from.
 * @returns parsed object or input string.
 * @throws `Error` if data cannot be parsed.
 * @example
 * parseString('{"a": { "b": {"c": 1} } }', "a.b"); // Parses and returns "a.b" path: { c: 1 }
 */
function parseString(content: string, rootDataPath?: DataPath): { format: FileFormat; data: object } {
  const errors: Error[] = [];

  try {
    const data = commentJson.parse(content);
    return { format: "json", data: rootDataPath ? get(data, rootDataPath as any) : data };
  } catch (error) {
    errors.push(error);
  }

  try {
    const data = yaml.safeLoad(content);
    return { format: "yaml", data: rootDataPath ? get(data, rootDataPath as any) : data };
  } catch (error) {
    errors.push(error);
  }

  const errorMessage = errors.reduce((previous, e) => `${previous}${e.name}: ${e.message}. `, "").trim();
  throw new Error(`Cannot parse data. Supported formats are "json" and "yaml". ${errorMessage}`);
}

/**
 * Read file content from the given path. If the file does not exist returns undefined instead of throwing.
 *
 * @ignore
 * @param path is the path of the file.
 * @returns the content of the file or undefined if no file exists.
 * @throws error other than `ENOENT`.
 */
async function readFileTolerated(path: string): Promise<string | undefined> {
  try {
    const content = await readFile(path, { encoding: "utf-8" }); // Do not combine return single line to let catch block run.
    return content;
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

/**
 * Determines file format from file name.
 *
 * @ignore
 * @param path is the path of the file
 * @returns file format.
 */
export function getFormatFromFileName(path: string): FileFormat {
  const fileExtension = extname(path).substring(1).toLowerCase();
  const formatFromFileName = supportedFileExtensions[fileExtension as keyof typeof supportedFileExtensions];
  if (formatFromFileName === undefined) throw new Error(`Unsupported file type: ${fileExtension}`);
  return formatFromFileName;
}

/**
 * Reads and parses data and determines it's format.
 *
 * @ignore
 * @param path is the path of the file.
 * @param defaultFormat Default data to be used if file does not exist.
 * @param defaultData Default data to be used if file does not exist.
 * @param rootDataPath is the path to return data from.
 * @returns data and format.
 * @throws if file cannot be parsed.
 */
export async function readData(
  path: string,
  defaultFormat: FileFormat,
  defaultData: object,
  rootDataPath?: DataPath
): Promise<{ format: FileFormat; data: object }> {
  const formatFromFileName = getFormatFromFileName(path);

  if (formatFromFileName === "js") return { data: await import(path), format: "js" };
  const content = await readFileTolerated(path);

  return content === undefined ? { data: defaultData, format: formatFromFileName || defaultFormat } : parseString(content, rootDataPath);
}

/**
 * Returns given string or array path as a string.
 *
 * @ignore
 * @param path is the path to return as a string.
 * @returns stringified path.
 */
export function getStringPath(path: DataPath): Key {
  return Array.isArray(path) ? path.join(".") : path;
}

/**
 * Returns given string or array path as a string.
 *
 * @ignore
 * @param path is the path to return as an array.
 * @returns arrified path.
 */
export function getArrayPath(path: DataPath): Key[] {
  if (Array.isArray(path)) return path;
  return path === "string" ? path.split(".") : [path];
}

/**
 * Joins given data paths (array or string) and returns as a string.
 *
 * @ignore
 * @param paths are the paths to join (array or string)
 * @returns joined path.
 */
function joinPaths(...paths: Array<DataPath>): string {
  return paths
    .filter(Boolean)
    .map((path) => getStringPath(path as DataPath))
    .join(".");
}

/**
 * Returns `rootDataPath` and `path` of file for cosmiconfig.
 *
 * @ignore
 * @param module is the module to load config for.
 * @param config are options for cosmiconfig. See {@link https://www.npmjs.com/package/cosmiconfig#cosmiconfigoptions cosmiconfig options}.
 */
export async function getCosmiconfigResult(
  module: string,
  defaultFormat: FileFormat,
  defaultData: object,
  options?: CosmiconfigOptions,
  searchFrom?: string,
  rootDataPath?: DataPath
): Promise<{ format: FileFormat; data: object; path: string; rootDataPath?: DataPath }> {
  const result = await cosmiconfig(module, options).search(searchFrom);

  if (result) {
    const packageDataPath = basename(result.filepath) === "package.json" ? options?.packageProp || module : undefined;
    const fullDataPath = joinPaths(packageDataPath, rootDataPath);
    let format = getFormatFromFileName(result.filepath);
    if (format === "") format = (await readData(result.filepath, defaultFormat, defaultData)).format;
    const data = (rootDataPath ? get(result.config, rootDataPath as any) : result.config) || defaultData;
    return { format, data, path: result.filepath, rootDataPath: fullDataPath };
  }

  const path = searchFrom ? joinPaths(searchFrom, `.${module}rc`) : `.${module}rc`;
  const { data, format } = await readData(path, defaultFormat, defaultData);
  return { format, data, path, rootDataPath };
}

/**
 * Returns prettier configuration for given file path.
 *
 * @ignore
 * @param path is the file path to get prettier configuration.
 * @returns prettier configuration.
 */
export async function getPrettierConfig(path: string): Promise<Record<string, any> | undefined> {
  return prettier ? prettier.resolveConfig(path, { editorconfig: true }) : undefined;
}

/**
 * If given value is a function, execute it with related data and return result of it. If it is a value, return it.
 *
 * @ignore
 * @param valueOrFunction is the function to execute or value to return.
 * @param dataFile is the data file object
 * @param path is the path of the the value.
 * @returns value or result of the function.
 */
export function evaluate(valueOrFunction: ValueFunction | any, dataFile: DataFile, path?: DataPath): any {
  if (typeof valueOrFunction !== "function") return valueOrFunction;
  if (path === undefined) return valueOrFunction(dataFile.data, undefined, dataFile.data, undefined, dataFile.data);
  const arrayPath = getArrayPath(path);
  const parentPath = arrayPath.slice(0, -1);
  return valueOrFunction(dataFile.get(path), arrayPath[arrayPath.length - 1], dataFile.get(parentPath), arrayPath, dataFile);
}

/**
 * If given value is a function, execute it with related data and return result of it. If it is a value, return it.
 *
 * @ignore
 * @param valueOrFunction is the function to test whether operation should be performed. If result is false, operation is not performed.
 * @param dataFile is the data file object
 * @param path is the path of the the value.
 * @returns whether given operation should be done.
 *
 * @example
 * const predicator = (val, key, path, data) => path === "pass" || val.length > 4;
 * const shouldPass = predictae(predicator, "George", data, "name")
 */
export function predicate(fn: PredicateFunction | undefined, dataFile: DataFile, path?: DataPath): boolean {
  if (fn === undefined) return true;
  return evaluate(fn, dataFile, path);
}

/**
 * Tests whether given value is a DataPath
 *
 * @ignore
 */
export function isManipulationOptions(value: any): value is { if?: PredicateFunction } {
  return typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "if");
}

/**
 * To disable logging, use this logger.
 * @ignore
 *
 */
export const noLogger = { log: () => undefined };

/** @ignore */
export const em = chalk.yellow;
