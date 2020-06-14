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
  #saveIfChanged: boolean;

  /**
   * Creates a manager to manage multiple data files.
   *
   * @param root is the root path to be used for all relative file paths.
   * @param logger is the winston compatible Logger to be used when logging.
   * @paraö saveIfChanged is whether to save file only if data is changed. Clones initial data deeply to check during save.
   */
  public constructor(
    { root = process.cwd(), logger = noLogger, saveIfChanged }: { root?: string; logger?: Logger; saveIfChanged?: boolean } = {} as any
  ) {
    this.#root = root;
    this.#logger = logger;
    this.#saveIfChanged = saveIfChanged || false;
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
      const allOptions = {
        saveIfChanged: this.#saveIfChanged,
        ...options,
        logger: this.#logger,
        rootDir: this.#root,
        prettierConfig: this.#prettierConfig,
      };
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

    const allOptions = {
      saveIfChanged: this.#saveIfChanged,
      ...options,
      logger: this.#logger,
      rootDir: this.#root,
      prettierConfig: this.#prettierConfig,
    };
    this.#files[relative("/", path)] = await DataFile.fromData(fullPath, data, allOptions);

    return this.#files[relative("/", path)];
  }

  /**
   * Reads data from all given files and caches them. If same data file requested multiple times returns cached data file. Absolute path of the file is used as cache key.
   *
   * @param paths are arry of paths of the files. Could be an absolute path or relative to root path option provided to [[Manager]].
   * @param options are options.
   * @param options.defaultFormat is the default format to be used if file format cannot be determined from file name and content.
   * @param options.defaultData is the default data to be used if file does not exist.
   * @param options.saveIfChanged is whether to save file only if data is changed. Clones initial data deeply to check during save.
   */
  public async loadAll(
    paths: string[],
    options: { defaultFormat?: WritableFileFormat; defaultData?: any; readOnly?: boolean; saveIfChanged?: boolean } = {}
  ): Promise<DataFile[]> {
    return Promise.all(paths.map((path) => this.load(path, options)));
  }

  public async saveAll(): Promise<void> {
    this.#logger.log("info", `Starting to save all files.`);
    await Promise.all(Object.values(this.#files).map((file) => file.save({ throwOnReadOnly: false })));
  }
}
