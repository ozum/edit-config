/* eslint-disable no-param-reassign */
import { isAbsolute, relative, normalize, join } from "path";
import { Options as CosmiconfigOptions } from "cosmiconfig";
import commentJson from "comment-json";
import yaml from "js-yaml";
import { outputFile } from "fs-extra";
import get from "lodash.get";
import set from "lodash.set";
import has from "lodash.has";
import merge from "lodash.merge";
import unset from "lodash.unset";
import {
  Key,
  Logger,
  LogLevel,
  FileFormat,
  PrettierConfig,
  DataPath,
  PredicateFunction,
  StringDataPath,
  WritableFileFormat,
} from "./types";

import {
  sortKeys,
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
} from "./helper";

/**
 * Read, edit and write configuration files.
 */
export default class DataFile {
  /** Actual data */
  public data: object;

  readonly #defaultData?: object;
  readonly #path: string;
  readonly #format: FileFormat;
  readonly #logger: Logger;
  readonly #rootDir?: string;
  readonly #modifiedKeys: { set: Set<StringDataPath>; deleted: Set<StringDataPath> } = { set: new Set(), deleted: new Set() };

  readonly #rootDataPath?: string[];
  readonly #readOnly: boolean;

  #prettierConfig?: PrettierConfig;

  protected constructor(
    path: string,
    data: object,
    format: FileFormat,
    logger: Logger,
    options: {
      defaultData?: object;
      prettierConfig?: PrettierConfig;
      shortPath?: string;
      rootDataPath?: DataPath;
      rootDir?: string;
      readonly?: boolean;
    }
  ) {
    this.#path = path;
    this.data = data;
    this.#format = format;
    this.#logger = logger;
    this.#prettierConfig = options.prettierConfig;
    this.#rootDir = options.rootDir;
    this.#defaultData = options.defaultData;
    this.#rootDataPath = options.rootDataPath ? (getArrayPath(options.rootDataPath) as string[]) : undefined;
    this.#readOnly = options.readonly === true;
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
   * @param options are options
   * @param options.if is the function to test whether operation should be performed. If result is false, operation is not performed.
   *
   * @example
   * dataFile
   *   .set("script.build", "tsc")
   *   .set(["scripts", "test"], "jest", { if: (value) => value !== "mocha" });
   */
  public set(path: DataPath, value: any, options: { if?: PredicateFunction } = {}): this {
    const shouldDo = predicate(options.if, this, path);
    if (shouldDo) {
      set(this.data, path as any, evaluate(value, this, path));
      this.#modifiedKeys.set.add(getStringPath(path));
    }
    this.logOperation("set", shouldDo, path);
    return this;
  }

  /**
   * Deletes the property at `path` of file data.
   *
   * @param path is data path of the property to delete.
   * @param options are options
   * @param options.if is the function to test whether operation should be performed. If result is false, operation is not performed.
   *
   * @example
   * dataFile
   *   .delete("script.build")
   *   .delete(["scripts", "test"], { if: (value) => value !== "jest" });
   */
  public delete(path: DataPath, options: { if?: PredicateFunction } = {}): this {
    const shouldDo = predicate(options.if, this, path);
    if (shouldDo) {
      unset(this.data, path as any);
      this.#modifiedKeys.deleted.add(getStringPath(path));
    }
    this.logOperation("unset", shouldDo, path);
    return this;
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
   * @param value is the object to merge given path or a function which returns object to be merged.
   * @param predicateFn is the function to test whether operation should be performed. If result is false, operation is not performed.
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
      this.logOperation("merge", shouldDo, path);
      this.#modifiedKeys.set.add(getStringPath(path));
    }

    return this;
  }

  /**
   * Returns deleted and modified keys (paths) in data file. Keys may be filtered by required condition.
   *
   * @param include is string or array of strings, of which keys starting with is included.
   * @param exclude is string or array of strings, of which keys starting with is excluded.
   * @returns modified keys
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
   * When keys/values added which are previously does not exist, they are added to the end of the file during file write.
   * This method allows reordering of the keys in given path. Required keys may be put at the beginning and of the order.
   *
   * @param path is data path of the property to order keys of.
   * @param start are ordered keys to appear at the beginning of given path when saved.
   * @param end are ordered keys to appear at the end of given path when saved.
   *
   * @example
   * dataFile.sortKeys("scripts", { start: ["build", "lint"], end: {"dependencies", "devDependencies"} });
   */
  // public sortKeys(path: DataPath, options?: { start: string[]; end: string[] }): this;

  // public sortKeys(options?: { start: string[]; end: string[] }): this;

  public sortKeys(path: DataPath, options?: { start: string[]; end: string[] }): this {
    const hasPath = !(Array.isArray(path) && path.length === 0);
    if (hasPath && this.has(path as any)) {
      set(this.data, path as any, sortKeys(this.get(path), options));
    } else if (!path) {
      this.data = sortKeys(this.data, options);
    }
    return this;
  }

  /**
   * Saves file. If this is a partial data using `rootDataPath` option.
   */
  public async save({ throwOnReadOnly = true } = {}): Promise<void> {
    if (this.readOnly) {
      const logLevel = throwOnReadOnly ? LogLevel.Error : LogLevel.Warn;
      this.#logger.log(logLevel, `File not saved: '${em(this.shortPath)}' is marked as readonly or is a 'js' file.`);
      if (throwOnReadOnly) throw new Error(`Cannot save: ${this.#path} is marked as readonly or is a 'js' file.`);
      return;
    }

    // If this is a partial data of a file, reread and change only related part and then save.
    const data = this.#rootDataPath
      ? set((await readData(this.#path, this.#format, this.#defaultData || this.data)).data, this.#rootDataPath, this.data)
      : this.data;

    let content = this.#format === "json" ? commentJson.stringify(data, null, 2) : yaml.safeDump(data);

    if (this.#prettierConfig === undefined) this.#prettierConfig = (await getPrettierConfig(this.#path)) || null;
    if (this.#prettierConfig) content = prettier.format(content, { ...this.#prettierConfig, parser: this.#format });

    await outputFile(this.#path, content);
    this.#logger.log(LogLevel.Info, `File saved: ${em(this.shortPath)}`);
  }

  /**
   * Logs given operation
   *
   * @param op is the name of the operation.
   * @param success is whether operations is successful.
   * @param path is the path of the data modified.
   */
  private logOperation(op: string, success: boolean, path?: DataPath): void {
    const not = success ? "" : "not ";
    const level = success ? LogLevel.Info : LogLevel.Warn;
    this.#logger.log(level, `Key ${not}${op}: '${em(getStringPath(path || "[ROOT]"))}' in '${em(this.shortPath)}' .`);
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
   * @returns [[DataFile]] instance.
   */
  public static fromData(
    path: string,
    data: object,
    {
      /** Format to be used if file format cannot be determined from file name. */
      defaultFormat = "json",
      /** Winston compatible Logger to be used when logging. */
      logger = console,
      /** Prettier configuration to be used. If not provided determined automatically. */
      prettierConfig,
      /** Root directory for file. If provided, relative path is based on this root directory. */
      rootDir,
      /** If only some part of the data/config will be used, this is the data path to be used. For example if this is `scripts`, only `script` key of the data is loaded. */
      rootDataPath,
      /** Whether save() operation is allowed. */
      readonly,
    }: {
      defaultFormat?: WritableFileFormat;
      logger?: Logger;
      prettierConfig?: PrettierConfig;
      rootDir?: string;
      rootDataPath?: DataPath;
      readonly?: boolean;
    } = {}
  ): DataFile {
    const fullPath = isAbsolute(path) || !rootDir ? path : join(rootDir, path);
    const formatFromFileName = getFormatFromFileName(fullPath);
    if (formatFromFileName === "js") throw new Error(`Cannot create DataFile from data for 'js' file: ${fullPath}`);
    const format = formatFromFileName === "" ? defaultFormat : formatFromFileName;
    return new DataFile(fullPath, data, format, logger, { defaultData: data, prettierConfig, rootDir, rootDataPath, readonly });
  }

  /**
   * Reads data from given file. If file is not present returns default data to be saved with {{save}} method.
   *
   * @param path is path of the file.
   * @returns [[DataFile]] instance.
   */
  public static async load(
    path: string,
    {
      /** Default format to be used if file format cannot be determined from file name and content. */
      defaultFormat = "json",
      /** Winston compatible Logger to be used when logging. */
      logger = console,
      /** Prettier configuration to be used. If not provided determined automatically. */
      prettierConfig,
      /** Default data to be used if file does not exist. */
      defaultData,
      /** Root directory for file. If provided, relative path is based on this root directory. */
      rootDir,
      /** If only some part of the data/config will be used, this is the data path to be used. For example if this is `scripts`, only `script` key of the data is loaded. */
      rootDataPath,
      /** Whether to use {@link cosmiconfig https://www.npmjs.com/package/cosmiconfig} to load configuration. Set `true` for default cosmiconfig options or provide an object with `options` for cosmiconfig options and `searchFrom` to provide `cosmiconfig.search()` parameter. */
      cosmiconfig = false,
      /** Whether save() operation is allowed. */
      readonly,
    }: {
      defaultFormat?: WritableFileFormat;
      logger?: Logger;
      prettierConfig?: PrettierConfig;
      defaultData?: object;
      rootDir?: string;
      rootDataPath?: DataPath;
      cosmiconfig?: boolean | { options?: CosmiconfigOptions; searchFrom?: string };
      readonly?: boolean;
    } = {}
  ): Promise<DataFile> {
    const fullPath = isAbsolute(path) || cosmiconfig || !rootDir ? path : join(rootDir, path);

    if (cosmiconfig) {
      const { options, searchFrom } = typeof cosmiconfig === "object" ? cosmiconfig : ({} as any);
      const result = await getCosmiconfigResult(path, defaultFormat, defaultData || {}, options, searchFrom, rootDataPath);
      return new DataFile(result.path, result.data, result.format, logger, {
        defaultData,
        prettierConfig,
        rootDir,
        rootDataPath: result.rootDataPath,
        readonly,
      });
    }

    const { data, format } = await readData(fullPath, defaultFormat, defaultData || {}, rootDataPath);
    return new DataFile(fullPath, data, format, logger, { defaultData, prettierConfig, rootDir, rootDataPath, readonly });
  }

  /**
   * Reload data from disk. If file is not present resets data to default data.
   */
  public async reload(): Promise<this> {
    this.data = (await readData(this.#path, this.#format, this.#defaultData || this.data, this.#rootDataPath)).data;
    return this;
  }
}
