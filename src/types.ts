import DataFile from "./data-file";

/** @ignore */
export interface Logger {
  info: (...message: Array<string>) => void;
  log: (...message: Array<string>) => void;
  warn: (...message: Array<string>) => void;
  error: (...message: Array<string>) => void;
}

/**
 * Levels to be used when logging.
 * @ignore
 */
export const enum LogLevel {
  Error = "error",
  Warn = "warn",
  Info = "info",
  Verbose = "verbose",
  Debug = "debug",
  Silly = "silly",
}

/** Data file formats. */
export const enum FileFormat {
  Json = "json",
  Yaml = "yaml",
}

/** @ignore */
export type PrettierConfig = Record<string, any> | null | undefined;

/** @ignore */
export type Key = string | number;

/** @ignore */
export type DataPath = string | Key[];

export type PredicateFn =
  /**
   * Callback function to test whether operation should be performed. If result is false, operation is not performed.
   * @param value is the value to be modified.
   * @param key is the key of the changed value.
   * @param data is the object/array to get value from.
   * @param path is the full data path of the value in root data.
   * @param rootData is the root data array/object.
   * @returns whether operation should be done.
   */
  (value: any, key: Key, data: object, path: Key[], rootData: DataFile) => boolean;
