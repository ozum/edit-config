/* eslint-disable no-return-assign */
import { join } from "path";
import { Manager, DataFile } from "../src";

const root = join(__dirname, "example");
const manager = new Manager({ root });

let [packageJson, eslintConfig, huskyConfig, someConfig]: DataFile[] = [];

beforeEach(async () => {
  // Reset to initial state
  [packageJson, eslintConfig, someConfig] = await manager.loadAll(["package.json", ".eslintrc.js", "some-config"]);
  huskyConfig = await manager.load("husky", { cosmiconfig: { searchFrom: root } });
});

describe("DataFile", () => {
  it("should load JSON file.", async () => {
    expect(packageJson.get("name")).toBe("example-package");
  });

  it("should load non existing file.", async () => {
    const dataFile = await DataFile.load("non-existing-file.json");
    expect(dataFile.data).toEqual({});
    expect(dataFile.found).toBe(false);
  });

  it("should load non existing file without extension.", async () => {
    expect((await DataFile.load("non-existing-file")).data).toEqual({});
  });

  it("should throw non existing file with unsupported format.", async () => {
    await expect(DataFile.load("non-existing-file.xyz")).rejects.toThrow("Unsupported file type");
  });

  it("should throw for string content even parseable.", async () => {
    await expect(DataFile.load(join(__dirname, "example/text-file"))).rejects.toThrow("must be an object");
  });

  it("should throw for number content even parseable.", async () => {
    await expect(DataFile.load(join(__dirname, "example/number-file"))).rejects.toThrow("must be an object");
  });

  it("should throw for empty content even parseable.", async () => {
    await expect(DataFile.load(join(__dirname, "example/empty-file"))).rejects.toThrow("must be an object");
  });

  it("should load JS file.", async () => {
    expect(eslintConfig.get("name")).toBe("example-eslint");
  });

  it("should load config without extension.", async () => {
    expect(someConfig.get("a")).toBe(1);
  });

  it("should load cosmiconfig data from package.json.", async () => {
    expect(huskyConfig.get("hooks.pre-commit")).toBe("lint");
  });

  it("should load cosmiconfig data from .xxxrc file.", async () => {
    const dataFile = await DataFile.load("prettier", { rootDir: join(__dirname, "example"), cosmiconfig: true });
    expect(dataFile.data).toEqual({ a: 1 });
    expect(dataFile.found).toBe(true);
  });

  it("should load cosmiconfig data for non existing config.", async () => {
    const dataFile = await DataFile.load("non-existing", { cosmiconfig: true });
    expect(dataFile.data).toEqual({});
    expect(dataFile.found).toBe(false);
  });

  it("should reload cosmiconfig data.", async () => {
    await huskyConfig.reload();
    expect(huskyConfig.get("hooks.pre-commit")).toBe("lint");
  });

  it("should test existence of path.", async () => {
    expect(packageJson.has("scripts.test")).toBe(true);
  });

  it("should get data from path.", async () => {
    expect(packageJson.get("scripts.test")).toBe("jest");
  });

  it("should report JS file as readonly.", async () => {
    expect(eslintConfig.readOnly).toBe(true);
  });

  it("shoudl throw if JS file tried to be saved.", async () => {
    await expect(eslintConfig.save()).rejects.toThrow("Cannot save");
  });

  describe("fromData", () => {
    it("should create DataFile from data.", async () => {
      const dataFile = await DataFile.fromData("some.json", { a: 1 });
      expect(dataFile.data).toEqual({ a: 1 });
    });

    it("should not create DataFile for JS file type.", async () => {
      await expect(DataFile.fromData("some.js", {})).rejects.toThrow("Cannot create DataFile");
    });
  });

  describe("set", () => {
    it("should set value.", () => {
      packageJson.set("scripts.a", 1);
      expect(packageJson.get("scripts.a")).toBe(1);
    });

    it("should set value using function.", () => {
      packageJson.set("counter", (v: number) => v + 1);
      expect(packageJson.get("counter")).toBe(2);
    });

    it("should set value if condition is true.", () => {
      packageJson.set("scripts.a", 1, { if: () => true });
      expect(packageJson.get("scripts.a")).toBe(1);
    });

    it("should not set value if condition is false.", () => {
      packageJson.set("scripts.a", 1, { if: () => false });
      expect(packageJson.get("scripts.a")).toBe(undefined);
    });
  });

  describe("delete", () => {
    it("should delete value.", () => {
      packageJson.delete("name");
      expect(packageJson.get("name")).toBe(undefined);
    });

    it("should delete value if condition is true.", () => {
      packageJson.delete("name", { if: () => true });
      expect(packageJson.get("name")).toBe(undefined);
    });

    it("should not delete value if condition is false.", () => {
      packageJson.delete("name", { if: () => false });
      expect(packageJson.get("name")).toBe("example-package");
    });
  });

  describe("merge", () => {
    it("should merge value.", () => {
      packageJson.merge("scripts", { a: 1 });
      expect(packageJson.get("scripts")).toEqual({ test: "jest", a: 1 });
    });

    it("should merge value with `undefined` key.", () => {
      packageJson.merge(undefined, { a: 1 });
      expect(packageJson.get(undefined)).toEqual({ a: 1 });
    });

    it("should merge value using function.", () => {
      packageJson.merge("scripts", (v: any) => ({ test2: `${v.test}2` }));
      expect(packageJson.get("scripts")).toEqual({ test: "jest", test2: "jest2" });
    });

    it("should merge value into root.", () => {
      packageJson.merge([], { a: 1 });
      expect(packageJson.get("a")).toBe(1);
    });

    it("should merge multiple object into root.", () => {
      packageJson.merge([], { a: 1 }, { b: 2 }, { if: () => true });
      expect(packageJson.get("a")).toBe(1);
      expect(packageJson.get("b")).toBe(2);
    });

    it("should merge value if condition is true.", () => {
      packageJson.merge("scripts", { a: 1 }, { if: () => true });
      expect(packageJson.get("scripts")).toEqual({ test: "jest", a: 1 });
    });

    it("should not merge value if condition is false.", () => {
      packageJson.merge("scripts", { a: 1 }, { if: () => false });
      expect(packageJson.get("scripts")).toEqual({ test: "jest" });
    });
  });

  describe("getModifiedKeys", () => {
    it("get modified keys.", () => {
      packageJson.merge("scripts", { a: 1 }).set("other.data", 2).delete("name");
      expect(packageJson.getModifiedKeys()).toEqual({ set: ["scripts", "other.data"], deleted: ["name"] });
    });
    it("get modified keys using filter.", () => {
      packageJson.merge("scripts", { a: 1 }).set("other.data", 2).delete("name");
      expect(packageJson.getModifiedKeys({ filter: (path) => path[0] !== "scripts" })).toEqual({ set: ["other.data"], deleted: ["name"] });
    });
  });

  describe("sortKeys", () => {
    it("should sort keys.", () => {
      packageJson.merge("scripts", { z: 1, a: 1, c: 1 });
      expect(Object.keys(packageJson.get("scripts"))).toEqual(["test", "z", "a", "c"]);
      packageJson.sortKeys("scripts");
      expect(Object.keys(packageJson.get("scripts"))).toEqual(["a", "c", "test", "z"]);
    });

    it("should sort keys with options.", () => {
      packageJson.merge("scripts", { z: 1, a: 1, c: 1 }).sortKeys("scripts", { start: ["test"], end: ["a"] });
      expect(Object.keys(packageJson.get("scripts"))).toEqual(["test", "c", "z", "a"]);
    });

    it("should not sort keys if result is same after sort.", () => {
      packageJson.merge("scripts", { z: 1, a: 1, c: 1 });
      expect(Object.keys(packageJson.get("scripts"))).toEqual(["test", "z", "a", "c"]);
      packageJson.sortKeys("scripts", { start: ["test", "z", "a", "c"] });
      expect(Object.keys(packageJson.get("scripts"))).toEqual(["test", "z", "a", "c"]);
    });

    it("should sort root.", () => {
      expect(Object.keys(packageJson.data)).toEqual(["name", "counter", "scripts", "husky"]);
      packageJson.sortKeys([], { start: ["husky"] });
      expect(Object.keys(packageJson.data)).toEqual(["husky", "counter", "name", "scripts"]);
    });
  });

  describe("reload", () => {
    it("should reload data.", async () => {
      await packageJson.merge("scripts", { z: 1 }).reload();
      expect(packageJson.get("scripts")).toEqual({ test: "jest" });
    });
  });
});
