import commentJson from "comment-json";
import yaml from "js-yaml";
import { extname } from "path";
import { outputFile } from "fs-extra";
import get from "lodash.get";
import set from "lodash.set";
import has from "lodash.has";
import merge from "lodash.merge";
import unset from "lodash.unset";
import { Logger, LogLevel, FileFormat, PrettierConfig, DataPath, PredicateFn } from "./types";
import {
  supportedFileExtensions,
  filterArray,
  orderKeys,
  readFileTolerated,
  getPrettierConfig,
  prettier,
  getStringPath,
  predicate,
  em,
} from "./helper";

/**
 * Manages and edit a configuration data file.
 */
export default class DataFile {
  /** Actual data */
  public data: object;

  readonly #defaultData: object;
  readonly #path: string;
  readonly #format: FileFormat;
  readonly #logger: Logger;
  readonly #shortPath: string;
  readonly #modifiedKeys: { set: Set<string>; deleted: Set<string> } = { set: new Set(), deleted: new Set() };
  #prettierConfig?: PrettierConfig;

  private constructor(
    path: string,
    data: object,
    format: FileFormat,
    logger: Logger,
    defaultData: object,
    options: { prettierConfig?: PrettierConfig; shortPath?: string }
  ) {
    this.#path = path;
    this.data = data;
    this.#format = format;
    this.#logger = logger;
    this.#prettierConfig = options.prettierConfig;
    this.#shortPath = options.shortPath || path;
    this.#defaultData = defaultData;
  }

  /**
   * Returns whether given `path` exists in file data.
   *
   * @param path is data path of the property to check.
   * @returns whether path exists.
   *
   * @example
   * const packageJson = await DataFile.get("package.json");
   * packageJson.has("script.build");
   * packageJson.has(["script", "build"]);
   */
  public has(path: DataPath): boolean {
    return has(this.data, path);
  }

  /**
   * Gets the value at `path` of file data. If the resolved value is undefined, the `defaultValue` is returned in its place.
   *
   * @param path is data path of the property to get.
   * @param defaultValue is value to get if path does not exists on data.
   * @returns data stored in given object path or default value.
   *
   * @example
   * const packageJson = await DataFile.get("package.json");
   * packageJson.get("script.build");
   * packageJson.get(["script", "build"]);
   */
  public get(path: DataPath, defaultValue?: any): any {
    return get(this.data, path, defaultValue);
  }

  /**
   * Sets the value at `path` of file data. If a portion of path doesn't exist, it's created.
   * Arrays are created for missing index properties while objects are created for all other missing properties.
   *
   * @param path is data path of the property to set.
   * @param value is value to set.
   * @param predicateFn is the function to test whether operation should be performed. If result is false, operation is not performed.
   *
   * @example
   * const packageJson = targetModule.getDataFileSync("package.json"); // `DataFile` instance
   * packageJson
   *   .set("script.build", "tsc")
   *   .set(["scripts", "test"], "jest", (value) => value !== "mocha");
   */
  public set(path: DataPath, value: any, predicateFn?: PredicateFn): this {
    const shouldDo = predicate(predicateFn, this, path);
    if (shouldDo) {
      set(this.data, path, value);
      this.#modifiedKeys.set.add(getStringPath(path));
    }
    this.logOperation("set", shouldDo, path);
    return this;
  }

  /**
   * Deletes the property at `path` of file data.
   *
   * @param path is data path of the property to delete.
   * @param predicateFn is the function to test whether operation should be performed. If result is false, operation is not performed.
   *
   * @example
   * const packageJson = targetModule.getDataFileSync("package.json"); // `DataFile` instance
   * packageJson
   *   .delete("script.build")
   *   .delete(["scripts", "test"], (value) => value !== "jest");
   */
  public delete(path: DataPath, predicateFn?: PredicateFn): this {
    const shouldDo = predicate(predicateFn, this, path);
    if (shouldDo) {
      unset(this.data, path);
      this.#modifiedKeys.deleted.add(getStringPath(path));
    }
    this.logOperation("unset", shouldDo, path);
    return this;
  }

  /**
   * This method is like _.assign except that it recursively merges own and inherited enumerable string keyed properties of source objects
   * into the destination object. Source properties that resolve to undefined are skipped if a destination value exists.
   * Array and plain object properties are merged recursively. Other objects and value types are overridden by assignment.
   * Source objects are applied from left to right. Subsequent sources overwrite property assignments of previous sources.
   *
   * @param value is the object to merge given path.
   * @param predicateFn is the function to test whether operation should be performed. If result is false, operation is not performed.
   *
   * @example
   * const packageJson = targetModule.getDataFileSync("package.json"); // `DataFile` instance
   * packageJson.assign({ name: "some-module", version: "1.0.0", }, (data) => data.name === "undefined");
   */
  public merge(value: any, predicateFn?: PredicateFn): this;
  /**
   * This method is like _.assign except that it recursively merges own and inherited enumerable string keyed properties of source objects
   * into the destination object. Source properties that resolve to undefined are skipped if a destination value exists.
   * Array and plain object properties are merged recursively. Other objects and value types are overridden by assignment.
   * Source objects are applied from left to right. Subsequent sources overwrite property assignments of previous sources.
   *
   * @param path is data path of the property to delete.
   * @param value is the object to merge given path.
   * @param predicateFn is the function to test whether operation should be performed. If result is false, operation is not performed.
   *
   * @example
   * const packageJson = targetModule.getDataFileSync("package.json"); // `DataFile` instance
   * packageJson.assign("scripts", { build: "tsc", test: "jest", }, (scripts) => scripts.build !== "someCompiler");
   */
  public merge(path: DataPath, value: any, predicateFn?: PredicateFn): this;
  public merge(pathOrValue: DataPath, valueOrPredicateFn: any, predicateFnOrVoid?: PredicateFn): this {
    const isSecondArgCondition = typeof valueOrPredicateFn === "function";
    const predicateFn = predicateFnOrVoid || (isSecondArgCondition ? valueOrPredicateFn : undefined);
    const value = isSecondArgCondition ? pathOrValue : valueOrPredicateFn;
    const path = isSecondArgCondition ? undefined : pathOrValue;
    const targetData = path ? get(this.data, path) : this.data;
    const shouldDo = !predicateFn || (path ? predicate(predicateFn, this, path) : predicateFn(this.data));

    if (shouldDo) {
      if (path && !has(this.data, path)) set(this.data, path, value);
      else merge(targetData, value);
      this.logOperation("merge", shouldDo, path);
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
  public getModifiedKeys({ include, exclude }: { include?: string | string[]; exclude?: string | string[] } = {}): {
    set: string[];
    deleted: string[];
  } {
    const setFiltered = filterArray(Array.from(this.#modifiedKeys.set), { include, exclude });
    const deletedFiltered = filterArray(Array.from(this.#modifiedKeys.deleted), { include, exclude });
    return { set: setFiltered, deleted: deletedFiltered };
  }

  /**
   * When keys/values added which are previously does not exist, they are added to the end of the file during file write.
   * This method allows reordering of the keys in given path. `keys` are placed at the beginning in given order whereas remaining keys
   * of the object comes in their order of position.
   *
   * @param path is data path of the property to order keys of.
   * @param keys are ordered keys to appear at the beginning of given path when saved.
   *
   * @example
   * const packageJson = targetModule.getDataFileSync("package.json"); // `DataFile` instance
   * packageJson.orderKeysOf("scripts", ["build", "lint"]); // Other keys come after.
   */
  public orderKeys(pathOrOptions?: DataPath, optionsOrVoid?: { start: string[]; end: string[] }): this {
    const path = typeof pathOrOptions === "string" || Array.isArray(pathOrOptions) ? pathOrOptions : undefined;
    const options: any = path === undefined ? pathOrOptions : optionsOrVoid;

    if (path && this.has(path)) {
      set(this.data, path, orderKeys(this.get(path), options));
    } else if (!path) {
      this.data = orderKeys(this.data, options);
    }
    return this;
  }

  /**
   * Saves file.
   */
  public async save(): Promise<void> {
    let content = this.#format === "json" ? commentJson.stringify(this.data, null, 2) : yaml.safeDump(this.data);

    if (this.#prettierConfig === undefined) this.#prettierConfig = (await getPrettierConfig(this.#path)) || null;
    if (this.#prettierConfig) content = prettier.format(content, { ...this.#prettierConfig, parser: this.#format });

    await outputFile(this.#path, content);
    this.#logger.log(LogLevel.Info, `File saved: ${em(this.#shortPath)}`);
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
    this.#logger.log(level, `Key ${not}${op}: '${em(getStringPath(path || "[ROOT]"))}' in '${em(this.#shortPath)}' .`);
  }

  //
  // ──────────────────────────────────────────────────────────────────── I ──────────
  //   :::::: S T A T I C   M E T H O D S : :  :   :    :     :        :          :
  // ──────────────────────────────────────────────────────────────────────────────
  //

  /**
   * Parses given string and returns format and object. If no format given, tries to parse first as json using JSON5, then yaml.
   *
   * @param content is string to parse
   * @returns parsed object or input string.
   * @throws `Error` if data cannot be parsed.
   */
  private static parseString<T extends object>(content: string): { format: FileFormat; data: T } {
    const errors: Error[] = [];

    try {
      return { format: FileFormat.Json, data: commentJson.parse(content) };
    } catch (error) {
      errors.push(error);
    }

    try {
      return { format: FileFormat.Yaml, data: yaml.safeLoad(content) };
    } catch (error) {
      errors.push(error);
    }

    const errorMessage = errors.reduce((previous, e) => `${previous}${e.name}: ${e.message}. `, "").trim();
    throw new Error(`Cannot parse data as one of the supported formats of Supported formats are "json" and "yaml". ${errorMessage}`);
  }

  /**
   * Reads data from given file. If file is not present returns default data to be saved with {{save}} method.
   * @param path is ısuhsıu
   */
  public static async load<T extends object = object>(
    path: string,
    {
      /** Default format to be used if file format cannot be determined from file name and content. */
      defaultFormat = FileFormat.Json,
      /** Winston compatible Logger to be used when logging. */
      logger = console,
      /** Prettier configuration to be used. If not provided determined automatically. */
      prettierConfig,
      /** Default data to be used if file does not exist. */
      defaultData = {} as T,
      /** Short file path to be used in logs. */
      shortPath = "",
    }: {
      defaultFormat?: FileFormat;
      logger?: Logger;
      prettierConfig?: PrettierConfig;
      defaultData?: T;
      shortPath?: string;
    } = {} as any
  ): Promise<DataFile> {
    const fileExtension = extname(path).substring(1).toLowerCase();
    const formatFromFileName = supportedFileExtensions[fileExtension as keyof typeof supportedFileExtensions];

    if (fileExtension !== "" && !formatFromFileName) throw new Error(`Umknown file type: ${fileExtension}`);

    const content = await readFileTolerated(path);
    const { data, format } =
      content === undefined ? { data: defaultData, format: formatFromFileName || defaultFormat } : DataFile.parseString<T>(content);

    return new DataFile(path, data, format, logger, defaultData, { prettierConfig, shortPath });
  }

  /**
   * Reload data from disk. If file is not present resets data to default data.
   */
  public async reload(): Promise<this> {
    const content = await readFileTolerated(this.#path);
    this.data = content ? DataFile.parseString(content).data : this.#defaultData;
    return this;
  }

  // public debug() {
  //   // console.log(this.data);
  //   console.log(this.#path);
  //   console.log(this.#format);
  //   console.log(this.data);
  //   console.log(this.#modifiedKeys);
  // }
}
