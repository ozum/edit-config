import chalk from "chalk";
import isEqual from "lodash.isequal";
import { assign } from "comment-json";
import { readFile } from "fs-extra";
import type DataFile from "./data-file";
import { PredicateFn, DataPath, FileFormat } from "./types";

/** @ignore */
let prettier: any; // eslint-disable-line import/no-mutable-exports

// Export prettier if it is installed by parent module.
try {
  prettier = require("prettier"); // eslint-disable-line
} catch {} // eslint-disable-line no-empty

export { prettier };

/** @ignore */
export const supportedFileExtensions = {
  json: FileFormat.Json,
  yaml: FileFormat.Yaml,
  yml: FileFormat.Yaml,
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

/**
 * Filters an array based on starting strings of its elements and returns filtered array as a new array.
 *
 * @ignore
 * @param array is array to be filtered.
 * @param include is string or array of strings, of which elements starting with is included.
 * @param exclude is string or array of strings, of which elements starting with is excluded.
 * @returns filtered array.
 */
export function filterArray(
  array: string[],
  { include = [], exclude = [] }: { include?: string | string[]; exclude?: string | string[] }
): string[] {
  const includeArray = arrify(include);
  const excludeArray = arrify(exclude);
  let result = array;

  if (includeArray.length > 0) {
    result = result.filter((key) => includeArray.some((included) => key.startsWith(included)));
  }
  if (excludeArray.length > 0) {
    result = result.filter((key) => !excludeArray.some((excluded) => key.startsWith(excluded)));
  }
  return result;
}

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
export function orderKeys<T, K extends keyof T>(object: T, { start = [] as K[], end = [] as K[] } = {}): T {
  const objectKeys = Object.keys(object) as K[];
  const allKeys = [...new Set([...start, ...objectKeys.filter((k) => !end.includes(k)).sort(), ...end])];
  const keys = allKeys.filter((k) => Object.prototype.hasOwnProperty.call(object, k));
  if (isEqual(keys, objectKeys)) return object;
  return assign({}, object, keys as any);
}

/**
 * Read file content from the given path. If the file does not exist returns undefined instead of throwing.
 *
 * @ignore
 * @param path is the path of the file.
 * @returns the content of the file or undefined if no file exists.
 * @throws error other than `ENOENT`.
 */
export async function readFileTolerated(path: string): Promise<string | undefined> {
  try {
    return readFile(path, { encoding: "utf-8" });
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
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
 * Compares equality of given value or result of function to value from data. Provides value, whole data and path to the function.
 *
 * @ignore
 * @param valueOrFunction is value or function to compare result of to value from data.
 * @param valueFromData is the value form data.
 * @param data is the whole data object.
 * @param path is the path the value is get from.
 * @returns whether given value or result of function is equal to value from data.
 */
export function compareEqual(valueOrFunction: any, valueFromData: any, data: object, path?: string): boolean {
  const key = path ? path.split(".").pop() : undefined;
  const value = typeof valueOrFunction === "function" ? valueOrFunction(valueFromData, key, path, data) : valueOrFunction;
  return isEqual(value, valueFromData);
}

/**
 * Predicates given function or returns value as is (if it is not a function). Provides value, whole data and path to the function.
 *
 * @ignore
 * @param fn is the function to test whether operation should be performed. If result is false, operation is not performed.
 * @param dataFile is the data file object
 * @param path is the path of the the value.
 * @returns whether given operation should be done.
 *
 * @example
 * const predicator = (val, key, path, data) => path === "pass" || val.length > 4;
 * const shouldPass = predictae(predicator, "George", data, "name")
 */
export function predicate(fn: PredicateFn | undefined, dataFile: DataFile, path: DataPath): boolean {
  if (!fn) return true;
  const arrayPath = Array.isArray(path) ? path : path.split(".");
  const parentPath = arrayPath.slice(0, -1);
  return fn(dataFile.get(path), arrayPath[arrayPath.length - 1], dataFile.get(parentPath), arrayPath, dataFile);
}

/**
 * Returns given string or array path as a string.
 *
 * @ignore
 * @param path is the path to return as a string.
 * @returns stringified path.
 */
export function getStringPath(path: DataPath): string {
  return Array.isArray(path) ? path.join(".") : path;
}

/** @ignore */
export const em = chalk.yellow;
