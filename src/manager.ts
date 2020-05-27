import { join, isAbsolute, relative } from "path";
import { Options as CosmiconfigOptions } from "cosmiconfig";
import { Logger, PrettierConfig, FileFormat, DataPath, LogLevel } from "./types";
import DataFile from "./data-file";
import { getPrettierConfig } from "./helper";

/**
 * Manage multiple configuration files using [[DataFile]].
 */
export default class Manager {
  readonly #root: string;
  readonly #files: Record<string, DataFile> = {};
  readonly #logger: Logger;
  #prettierConfig?: PrettierConfig;

  /**
   * Creates a manager to manage multiple data files.
   */
  public constructor({
    /** Root path to be used for all relative file paths */
    root = "",
    /** Winston compatible Logger to be used when logging. */
    logger = console as Logger,
  } = {}) {
    this.#root = root;
    this.#logger = logger;
  }

  /**
   * Reads data from given file and caches it. If file is not present returns default data to be saved with [[DataFile.save]] or [[save]} methods.
   * If same data file requested multiple times returns cached data file. Absolute path of the file is used as cache key.
   *
   * @param path is the path of the file. Coul be an absolute path or relative to root path option provided to [[Manager]]
   * @param options are options
   * @param options.defaultFormat is the default format to be used if file format cannot be determined from file name and content.
   * @param options.defaultData is the default data to be used if file does not exist.
   * @returns [[DataFile]] instance.
   */
  public async load(
    path: string,
    options: {
      defaultFormat?: FileFormat;
      defaultData?: any;
      rootDataPath?: DataPath;
      cosmiconfig?: boolean | { options?: CosmiconfigOptions; searchFrom?: string };
    } = {}
  ): Promise<DataFile> {
    const fullPath = isAbsolute(path) || options.cosmiconfig ? path : join(this.#root, path);
    if (this.#prettierConfig === undefined) this.#prettierConfig = (await getPrettierConfig(fullPath)) || null;
    if (!this.#files[path]) {
      const allOptions = { ...options, logger: this.#logger, rootDir: this.#root, prettierConfig: this.#prettierConfig };
      this.#files[relative("/", path)] = await DataFile.load(fullPath, allOptions);
    }

    return this.#files[relative("/", path)];
  }

  public async loadAll(paths: string[], options: { defaultFormat?: FileFormat; defaultData?: any } = {}): Promise<DataFile[]> {
    return Promise.all(paths.map((path) => this.load(path, options)));
  }

  public async saveAll(): Promise<void> {
    await Promise.all(Object.values(this.#files).map((file) => file.save({ jsLogLevel: LogLevel.Warn, throwOnJs: false })));
  }
}
