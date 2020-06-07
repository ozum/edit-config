import { Options as CosmiconfigOptions } from "cosmiconfig";
import DataFile from "./data-file";

/** Logger */
export interface Logger {
  log: (...message: Array<string>) => void | undefined;
}

/** Log levels */
export const enum LogLevel {
  Error = "error",
  Warn = "warn",
  Info = "info",
  Verbose = "verbose",
  Debug = "debug",
  Silly = "silly",
}

/** Data file format. */
export type FileFormat = "" | "json" | "yaml" | "js";

/** Writeable Data file format. */
export type WritableFileFormat = "json" | "yaml";

/** @ignore */
export type PrettierConfig = Record<string, any> | null | undefined;

/** @ignore */
export type Key = string | number | undefined | null;

/** @ignore */
export type StringDataPath = string | number | undefined | null;

/** @ignore */
export type DataPath = Key | Key[]; // undefined, null and empty string ("") can be key in object.

export type PredicateFunction =
  /**
   * Callback function to test whether operation should be performed. If result is false, operation is not performed.
   *
   * @param value is the value to be modified.
   * @param key is the key of the changed value.
   * @param data is the object/array to get value from.
   * @param path is the full data path of the value in root data.
   * @param dataFile is the DataFile instance.
   * @returns whether operation should be done.
   */
  (value: any, key: Key, data: object, path: Key[], dataFile: DataFile) => boolean;

export type ValueFunction =
  /**
   * If a function is provided instead of value, return value of the function is used as new value.
   *
   * @param value is the value to be modified.
   * @param key is the key of the changed value.
   * @param data is the object/array to get value from.
   * @param path is the full data path of the value in root data.
   * @param dataFile is the DataFile instance.
   * @returns whether operation should be done.
   */
  (value: any, key: Key, data: object, path: Key[], dataFile: DataFile) => any;

/** [[Manager.fromData]] options. */
export interface ManagerFromDataOptions {
  /** The default format to be used if file format cannot be determined from file name and content. */
  defaultFormat?: WritableFileFormat;
  /** If only some part of the data/config will be used, this is the data path to be used. For example if this is `scripts`, only `script` key of the data is loaded. */
  rootDataPath?: DataPath;
  /** Whether file can be saved using this library. */
  readOnly?: boolean;
}

/** [[Manager.load]] options. */
export interface ManagerLoadOptions extends ManagerFromDataOptions {
  /** The default data to be used if file does not exist. */
  defaultData?: any;
  /** Whether to use {@link cosmiconfig https://www.npmjs.com/package/cosmiconfig} to load configuration. Set `true` for default cosmiconfig options or provide an object with `options` for cosmiconfig options and `searchFrom` to provide `cosmiconfig.search()` parameter. */
  cosmiconfig?: boolean | { options?: CosmiconfigOptions; searchFrom?: string };
}

/** [[DataFile.fromData]] options. */
export interface DataFileFromDataOptions extends ManagerFromDataOptions {
  /** Winston compatible Logger to be used when logging. */
  logger?: Logger;
  /** Root directory for file. If provided, relative path is based on this root directory. */
  rootDir?: string;
  /** Prettier configuration to be used. If not provided determined automatically. */
  prettierConfig?: PrettierConfig;
}

/** [[DatFile.load]] options. */
export interface DataFileLoadOptions extends DataFileFromDataOptions {
  /** If only some part of the data/config will be used, this is the data path to be used. For example if this is `scripts`, only `script` key of the data is loaded. */
  defaultData?: object;
  /** Whether to use {@link cosmiconfig https://www.npmjs.com/package/cosmiconfig} to load configuration. Set `true` for default cosmiconfig options or provide an object with `options` for cosmiconfig options and `searchFrom` to provide `cosmiconfig.search()` parameter. */
  cosmiconfig?: boolean | { options?: CosmiconfigOptions; searchFrom?: string };
}
