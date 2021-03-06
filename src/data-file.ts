/* eslint-disable no-param-reassign */
import { isAbsolute, relative, normalize, join } from "path";
import commentJson, { assign } from "comment-json";
import yaml from "js-yaml";
import { outputFile, pathExists } from "fs-extra";
import has from "lodash.has";
import get from "lodash.get";
import set from "lodash.set";
import unset from "lodash.unset";
import merge from "lodash.merge";
import isEqual from "lodash.isequal";
import cloneDeep from "clone-deep";

import {
  noLogger,
  getPrettierConfig,
  prettier,
  getStringPath,
  predicate,
  em,
  readData,
  getCosmiconfigResult,
  evaluate,
  isManipulationOptions,
  getArrayPath,
  getFormatFromFileName,
  isEmpty,
} from "./helper";

import {
  DataFileFromDataOptions,
  Key,
  Logger,
  FileFormat,
  PrettierConfig,
  DataPath,
  PredicateFunction,
  StringDataPath,
  DataFileLoadOptions,
} from "./types";

/**
 * Read, edit and write configuration files.
 */
export default class DataFile<T extends object = any> {
  /** Actual data */
  public data: T;

  /** Whether file exists or cosmiconfig configuration found. */
  public found: boolean;

  readonly #defaultData?: object;
  readonly #path: string;
  readonly #format: FileFormat;
  readonly #logger: Logger;
  readonly #rootDir?: string;
  readonly #modifiedKeys: { set: Set<StringDataPath>; deleted: Set<StringDataPath> } = { set: new Set(), deleted: new Set() };
  readonly #rootDataPath?: string[];
  readonly #readOnly: boolean;
  readonly #initialData?: T;
  readonly #saveIfChanged: boolean;

  #sorted = false;
  #prettierConfig?: PrettierConfig;

  private constructor(
    path: string,
    data: T,
    found: boolean,
    options: {
      logger?: Logger;
      format?: FileFormat;
      defaultData?: object;
      prettierConfig?: PrettierConfig;
      shortPath?: string;
      rootDataPath?: DataPath;
      rootDir?: string;
      readOnly?: boolean;
      saveIfChanged?: boolean;
    }
  ) {
    this.#path = path;
    this.data = data;
    this.#format = options.format ?? "json";
    this.#logger = options.logger ?? noLogger;
    this.#prettierConfig = options.prettierConfig;
    this.#rootDir = options.rootDir;
    this.#defaultData = options.defaultData;
    this.#rootDataPath = options.rootDataPath ? (getArrayPath(options.rootDataPath) as string[]) : undefined;
    this.#readOnly = options.readOnly === true;
    this.found = found;
    this.#saveIfChanged = options.saveIfChanged || false;
    if (this.#saveIfChanged) this.#initialData = cloneDeep(data);
  }

  /** File path relative to root. */
  private get shortPath(): string {
    return normalize(this.#rootDir ? relative(this.#rootDir, this.#path) : this.#path);
  }

  /** Whether file can be saved using this library. */
  public get readOnly(): boolean {
    return this.#format === "js" || this.#readOnly;
  }

  /**
   * Returns whether given `path` exists in file data.
   *
   * @param path is data path of the property to check.
   * @returns whether path exists.
   *
   * @example
   * dataFile.has("script.build");
   * dataFile.has(["script", "build"]);
   */
  public has(path: DataPath): boolean {
    return has(this.data, path as any);
  }

  /**
   * Gets the value at `path` of file data. If the resolved value is undefined, the `defaultValue` is returned in its place.
   *
   * @param path is data path of the property to get.
   * @param defaultValue is value to get if path does not exists on data.
   * @returns data stored in given object path or default value.
   *
   * @example
   * dataFile.get("script.build");
   * dataFile.get(["script", "build"]);
   */
  public get(path: DataPath, defaultValue?: any): any {
    return get(this.data, path as any, defaultValue);
  }

  /**
   * Sets the value at `path` of file data. If a portion of path doesn't exist, it's created.
   * Arrays are created for missing index properties while objects are created for all other missing properties.
   *
   * @param path is data path of the property to set.
   * @param value is value to set or a function which returns value to be set.
   * @param if is the function to test whether operation should be performed. If result is false, operation is not performed.
   * @param logger is winston compatible logger to be used when logging.
   *
   * @example
   * dataFile
   *   .set("script.build", "tsc")
   *   .set(["scripts", "test"], "jest", { if: (value) => value !== "mocha" });
   */
  public set(path: DataPath, value: any, { if: condition, logger }: { if?: PredicateFunction; logger?: Logger } = {}): this {
    const shouldDo = predicate(condition, this, path);
    if (shouldDo) {
      set(this.data, path as any, evaluate(value, this, path));
      this.#modifiedKeys.set.add(getStringPath(path));
    }
    this.logOperation("set", shouldDo, path, logger);
    return this;
  }

  /**
   * Deletes the property at `path` of file data.
   *
   * @param path is data path of the property to delete.
   * @param if is the function to test whether operation should be performed. If result is false, operation is not performed.
   * @param logger is winston compatible logger to be used when logging.
   *
   * @example
   * dataFile
   *   .delete("script.build")
   *   .delete(["scripts", "test"], { if: (value) => value !== "jest" });
   */
  public delete(path: DataPath, { if: condition, logger }: { if?: PredicateFunction; logger?: Logger } = {}): this {
    const shouldDo = predicate(condition, this, path);
    if (shouldDo) {
      unset(this.data, path as any);
      this.#modifiedKeys.deleted.add(getStringPath(path));
    }
    this.logOperation("unset", shouldDo, path, logger);
    return this;
  }

  /**
   * Deletes path recursively if value at given path is empty. (If parent path is empty after value is deleted, parent path would be deleted too.)
   *
   * @param path is data path of the property to delete.
   *
   * @example
   * // { a: { b: { c: {} } } }
   * dataFile.deleteEmptyPath("a.b.c"); // Result: {}
   *
   * // { a: { b: { c: {}, x: 1 } } }
   * dataFile.deleteEmptyPath("a.b.c"); // Result: { a: { b: { x: 1 } } }
   */
  public deleteEmptyPath(path: DataPath): this {
    const arrayPath = getArrayPath(path);
    while (arrayPath.length > 0) {
      if (this.isEmpty(arrayPath)) this.delete(arrayPath);
      arrayPath.pop();
    }

    return this;
  }

  /**
   * Tests whether given value at path is empty. Empty values are empty objects, maps, sets, string, `undefined` and `null`.
   *
   * @returns whether given value is empty.
   */
  public isEmpty(path: DataPath): boolean {
    return isEmpty(this.get(path));
  }

  /**
   * This method is like assign except that it recursively merges own and inherited enumerable string keyed properties of source objects
   * into the destination object. Source properties that resolve to undefined are skipped if a destination value exists.
   * Array and plain object properties are merged recursively. Other objects and value types are overridden by assignment.
   * Source objects are applied from left to right. Subsequent sources overwrite property assignments of previous sources.
   *
   * If you would like merge root object (`this.data`), use empty array `[]` as path, because `undefined`, '' and `null` are valid object keys.
   *
   * @param path is data path of the property to delete.
   * @param valuesAndOptions are objects to merge given path or a function which returns object to be merged.
   * @param valuesAndOptions.predicateFn is the function to test whether operation should be performed. If result is false, operation is not performed.
   * @param valuesAndOptions.logger is winston compatible logger to be used when logging.
   *
   * @example
   * dataFile.merge("scripts", { build: "tsc", test: "jest", }, { if: (scripts) => scripts.build !== "someCompiler" });
   * dataFile.merge([], { name: "my-module", version: "1.0.0" });
   */
  public merge(path: DataPath, ...valuesAndOptions: any[]): this {
    const hasPath = !(Array.isArray(path) && path.length === 0);
    const hasOptions = isManipulationOptions(valuesAndOptions[valuesAndOptions.length - 1]);
    const object = hasPath ? this.get(path) : this.data;
    const options = hasOptions ? valuesAndOptions[valuesAndOptions.length - 1] : {};
    const values = hasOptions ? valuesAndOptions.slice(0, -1) : valuesAndOptions;
    const shouldDo = predicate(options.if, this, path);

    if (shouldDo) {
      const sources = values.map((value) => evaluate(value, this, path));
      if (hasPath && !this.has(path)) this.set(path, merge({}, ...sources));
      else merge(object, ...sources);
      this.logOperation("merged", shouldDo, path, options.logger);
      this.#modifiedKeys.set.add(getStringPath(path));
    }

    return this;
  }

  /**
   * Returns deleted and modified keys (paths) in data file. Keys may be filtered by required condition.
   *
   * @param filter is a filter function to test whether to include key and type in result.
   * @returns set and deleted keys
   *
   * @example
   * dataFile.getModifiedKeys({ include: "scripts", exclude: ["scripts.validate", "scripts.docs"] });
   */
  public getModifiedKeys({ filter }: { filter?: (path: Key[], type: "set" | "deleted") => boolean } = {}): {
    set: StringDataPath[];
    deleted: StringDataPath[];
  } {
    let setPaths = Array.from(this.#modifiedKeys.set);
    let deletedPaths = Array.from(this.#modifiedKeys.deleted);

    if (filter) {
      setPaths = setPaths.filter((path) => filter(getArrayPath(path), "set"));
      deletedPaths = deletedPaths.filter((path) => filter(getArrayPath(path), "deleted"));
    }

    return { set: setPaths, deleted: deletedPaths };
  }

  /**
   * Sort keys in given order. Missing keys in `keys` added to the end. If no keys are provided, sorts alphabetically.
   *
   * @ignore
   * @param object is the object to order keys of.
   * @param start are ordered keys to appear at the beginning of given path when saved.
   * @param end are ordered keys to appear at the end of given path when saved.
   * @returns same object with ordered keys.
   */
  private _sortObjectKeys<T extends object>(object: T, { start = [] as string[], end = [] as string[] } = {}): T {
    const objectKeys = Object.keys(object);
    const allKeys = Array.from(new Set([...start, ...objectKeys.filter((k) => !end.includes(k)).sort(), ...end]));
    const keys = allKeys.filter((k) => Object.prototype.hasOwnProperty.call(object, k));
    if (isEqual(keys, objectKeys)) return object;
    this.#sorted = true;
    return assign({}, object, keys as any); // assign from `json-comment`. Assigns given keys only.
  }

  /**
   * When keys/values added which are previously does not exist, they are added to the end of the file during file write.
   * This method allows reordering of the keys in given path. Required keys may be put at the beginning and of the order.
   *
   * If you would like sort root object (`this.data`) use `sort` method or, provide use empty array `[]` as path, because `undefined`, '' and `null` are valid object keys.
   *
   * @param path is data path of the property to order keys of.
   * @param start are ordered keys to appear at the beginning of given path when saved.
   * @param end are ordered keys to appear at the end of given path when saved.
   *
   * @example
   * dataFile.sortKeys("scripts", { start: ["build", "lint"], end: ["release"] });
   * dataFile.sortKeys({ start: ["name", "description"], end: ["dependencies", "devDependencies"] });
   */
  public sortKeys(path: DataPath, { start, end }: { start?: string[]; end?: string[] } = {}): this {
    const hasPath = !(Array.isArray(path) && path.length === 0);
    if (hasPath && this.has(path as any)) set(this.data, path as any, this._sortObjectKeys(this.get(path), { start, end }));
    else this.data = this._sortObjectKeys(this.data, { start, end });
    return this;
  }

  /** Saves file. If this is a partial data uses only related part by utilizing `rootDataPath` option. */
  public async save({
    /** Whether to throw if file is read only. */
    throwOnReadOnly = true,
    /** Winston compatible logger to be used when logging. */
    logger,
  }: { throwOnReadOnly?: boolean; logger?: Logger } = {}): Promise<void> {
    if (this.readOnly) {
      const logLevel = throwOnReadOnly ? "error" : "warn";
      (logger || this.#logger).log(logLevel, `File not saved: '${em(this.shortPath)}' is marked as readonly or is a 'js' file.`);
      if (throwOnReadOnly) throw new Error(`Cannot save: ${this.#path} is marked as readonly or is a 'js' file.`);
      return;
    }

    if (this.#saveIfChanged && !this.#sorted && isEqual(this.data, this.#initialData)) return;
    await outputFile(this.#path, await this.serialize(true));
    (logger || this.#logger).log("info", `File saved: ${em(this.shortPath)}`);
  }

  /**
   * Returns data serialized as text.
   *
   * @param wholeFile is whether to serialize whole file when `rootDataPath` is set. Reads whole file including `rootDataPath` part and serializes whole file data.
   * @returns serialized data as string.
   */
  public async serialize(wholeFile = false): Promise<string> {
    // If this is a partial data of a file, reread and change related part and serialize.
    const data =
      this.#rootDataPath && wholeFile
        ? set((await readData(this.#path, this.#defaultData || this.data)).data, this.#rootDataPath, this.data)
        : this.data;

    let content = this.#format === "json" ? commentJson.stringify(data, null, 2) : yaml.safeDump(data);

    if (this.#prettierConfig === undefined) this.#prettierConfig = (await getPrettierConfig(this.#path)) || null;
    if (this.#prettierConfig) content = prettier.format(content, { ...this.#prettierConfig, parser: this.#format });
    return content;
  }

  /**
   * Logs given operation
   *
   * @param op is the name of the operation.
   * @param success is whether operations is successful.
   * @param path is the path of the data modified.
   */
  private logOperation(op: string, success: boolean, path?: DataPath, logger?: Logger): void {
    const not = success ? "" : "not ";
    const level = success ? "info" : "warn";
    (logger || this.#logger).log(level, `Key ${not}${op}: '${em(getStringPath(path || "[ROOT]"))}' in '${em(this.shortPath)}'.`);
  }

  //
  // ──────────────────────────────────────────────────────────────────── I ──────────
  //   :::::: S T A T I C   M E T H O D S : :  :   :    :     :        :          :
  // ──────────────────────────────────────────────────────────────────────────────
  //

  /**
   * Creates [[DataFile]] instance from given data to be saved for given file path.
   *
   * @param path is path of the file.
   * @param data is the data to create [[DataFile]] from.
   * @param options are options.
   * @returns [[DataFile]] instance.
   */
  public static async fromData(path: string, data: object, options: DataFileFromDataOptions = {}): Promise<DataFile> {
    const fullPath = isAbsolute(path) || !options.rootDir ? path : join(options.rootDir, path);
    const formatFromFileName = getFormatFromFileName(fullPath);
    if (formatFromFileName === "js") throw new Error(`Cannot create DataFile from data for 'js' file: ${fullPath}`);
    const format = formatFromFileName === "" ? options.defaultFormat : formatFromFileName;
    const found = await pathExists(fullPath);
    return new DataFile(fullPath, data, found, { defaultData: data, format, ...options });
  }

  /**
   * Reads data from given file. If file is not present returns default data to be saved with {{save}} method.
   *
   * @param path is path of the file.
   * @param options are options.
   * @returns [[DataFile]] instance.
   * @throws if file exists but cannot be parsed.
   */
  public static async load(path: string, options?: DataFileLoadOptions): Promise<DataFile> {
    const { cosmiconfig, defaultData, rootDataPath, rootDir } = { defaultData: {}, ...options };
    const fullPath = isAbsolute(path) || cosmiconfig || !rootDir ? path : join(rootDir, path);

    if (cosmiconfig) {
      const searchFrom = (cosmiconfig as any)?.searchFrom ?? rootDir;
      const cosmiconfigOptions = (cosmiconfig as any)?.options;
      const result = await getCosmiconfigResult(path, defaultData, cosmiconfigOptions, searchFrom, rootDataPath);
      const format = result.format === "" ? options?.defaultFormat : result.format;
      return new DataFile(result.path, result.data, result.found, { ...options, ...result, format });
    }

    const { data, format, found } = await readData(fullPath, defaultData, rootDataPath);
    return new DataFile(fullPath, data, found, { format: format || options?.defaultFormat, ...options });
  }

  /**
   * Reload data from disk. If file is not present resets data to default data.
   */
  public async reload(): Promise<this> {
    this.data = (await readData(this.#path, this.#defaultData || this.data, this.#rootDataPath)).data;
    return this;
  }
}
