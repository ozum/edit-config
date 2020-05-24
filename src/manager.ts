import { join, isAbsolute, relative } from "path";
import { Logger, PrettierConfig, FileFormat } from "./types";
import DataFile from "./data-file";
import { getPrettierConfig } from "./helper";

/**
 * Manage multiple configuration files.
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
  public async load(path: string, options: { defaultFormat?: FileFormat; defaultData?: any } = {}): Promise<DataFile> {
    const fullPath = isAbsolute(path) ? path : join(this.#root, path);
    if (this.#prettierConfig === undefined) this.#prettierConfig = (await getPrettierConfig(fullPath)) || null;
    if (!this.#files[path]) {
      const allOptions = { ...options, logger: this.#logger, shortPath: path, prettierConfig: this.#prettierConfig };
      this.#files[relative("/", path)] = await DataFile.load(fullPath, allOptions);
    }

    return this.#files[relative("/", path)];
  }

  public async loadAll(paths: string[], options: { defaultFormat?: FileFormat; defaultData?: any } = {}): Promise<DataFile[]> {
    return Promise.all(paths.map((path) => this.load(path, options)));
  }

  public async saveAll(): Promise<void> {
    await Promise.all(Object.values(this.#files).map((file) => file.save()));
  }
} // eslint-disable-line @typescript-eslint/no-var-requires

// const winstonLogger = createLogger({
//   level: "debug",
//   format: format.combine(format.colorize(), format.splat(), format.simple()),
//   transports: [new transports.Console()],
// });

// const m = new Manager({ logger });

// m.get(join("sil.json"), {})
//   .then(async (d) => {
//     d.newSet("a.c", "jj", () => false);
//     // d.set("a.b", "jj", { predicate: () => false });
//     // d.delete("a.b.c");
//     d.merge("a.k", { y: 6 }, () => true).orderKeys();
//     // await d.reload();
//     d.debug();
//   })
//   .then(() => {
//     m.saveAll();
//   })
//   .catch((e) => console.log(e));
