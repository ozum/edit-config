import DataFile from "./data-file";

/** @ignore */
export interface Logger {
  log: (...message: Array<string>) => void;
}

/** @ignore */
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
