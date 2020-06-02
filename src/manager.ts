import { join, isAbsolute, relative } from "path";
import { Logger, PrettierConfig, WritableFileFormat, ManagerLoadOptions, ManagerFromDataOptions } from "./types";
import DataFile from "./data-file";
import { getPrettierConfig, noLogger } from "./helper";

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
   *
   * @param root is the root path to be used for all relative file paths.
   * @param logger is the winston compatible Logger to be used when logging.
   */
  public constructor({ root = "", logger = noLogger }: { root: string; logger: Logger } = {} as any) {
    this.#root = root;
    this.#logger = logger;
  }

  /**
   * Reads data from given file and caches it. If file is not present, returns default data to be saved with [[DataFile.save]] or [[save]} methods.
   * If same data file requested multiple times returns cached data file. Absolute path of the file is used as cache key.
   *
   * @param path is the path of the file. Could be an absolute path or relative to root path option provided to [[Manager]].
   * @param options are options
   * @returns [[DataFile]] instance.
   * @example
   * manager.load("package.json");
   * manager.load("eslint", { defaultFormat: "json", cosmiconfig: { options: { packageProp: "eslint" }, searchForm: "some/path" } })
   */
  public async load(path: string, options: ManagerLoadOptions = {}): Promise<DataFile> {
    const fullPath = isAbsolute(path) || options.cosmiconfig ? path : join(this.#root, path);
    if (this.#prettierConfig === undefined) this.#prettierConfig = (await getPrettierConfig(fullPath)) || null;
    if (!this.#files[path]) {
      const allOptions = { ...options, logger: this.#logger, rootDir: this.#root, prettierConfig: this.#prettierConfig };
      this.#files[relative("/", path)] = await DataFile.load(fullPath, allOptions);
    }

    return this.#files[relative("/", path)];
  }

  /**
   * Creates [[DataFile]] instance from given data and returns it. Also caches the data.
   *
   * @param path is the path of the file. Could be an absolute path or relative to root path option provided to [[Manager]]
   * @param data is the data to create [[DataFile]] from.
   * @param options are options
   * @returns [[DataFile]] instance.
   */
  public async fromData(path: string, data: object, options: ManagerFromDataOptions = {}): Promise<DataFile> {
    const fullPath = isAbsolute(path) ? path : join(this.#root, path);
    if (this.#prettierConfig === undefined) this.#prettierConfig = (await getPrettierConfig(fullPath)) || null;

    const allOptions = { ...options, logger: this.#logger, rootDir: this.#root, prettierConfig: this.#prettierConfig };
    this.#files[relative("/", path)] = DataFile.fromData(fullPath, data, allOptions);

    return this.#files[relative("/", path)];
  }

  /**
   * Reads data from all given files and caches them. If same data file requested multiple times returns cached data file. Absolute path of the file is used as cache key.
   *
   * @param paths are arry of paths of the files. Could be an absolute path or relative to root path option provided to [[Manager]].
   * @param options are options.
   */
  public async loadAll(
    paths: string[],
    options: { defaultFormat?: WritableFileFormat; defaultData?: any; readOnly?: boolean } = {}
  ): Promise<DataFile[]> {
    return Promise.all(paths.map((path) => this.load(path, options)));
  }

  public async saveAll(): Promise<void> {
    await Promise.all(Object.values(this.#files).map((file) => file.save({ throwOnReadOnly: false })));
  }
}
