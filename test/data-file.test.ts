/* eslint-disable no-return-assign */
import { join } from "path";
import { Manager, DataFile, noLogger } from "../src";

const root = join(__dirname, "example");
const manager = new Manager({ root, logger: noLogger });

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
    expect((await DataFile.load("non-existing-file.json")).data).toEqual({});
  });

  it("should load non existing file without extension.", async () => {
    expect((await DataFile.load("non-existing-file")).data).toEqual({});
  });

  it("should throw non existing file with unsupported format.", async () => {
    await expect(DataFile.load("non-existing-file.xyz")).rejects.toThrow("Unsupported file type");
  });

  it("should load JS file.", async () => {
    expect(eslintConfig.get("name")).toBe("example-eslint");
  });

  it("should load config without extension.", async () => {
    expect(someConfig.get("a")).toBe(1);
  });

  it("should load cosmiconfig data.", async () => {
    expect(huskyConfig.get("hooks.pre-commit")).toBe("lint");
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
    it("should create DataFile from data.", () => {
      const dataFile = DataFile.fromData("some.json", { a: 1 });
      expect(dataFile.data).toEqual({ a: 1 });
    });

    it("should not create DataFile for JS file type.", () => {
      expect(() => DataFile.fromData("some.js", {})).toThrow("Cannot create DataFile");
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
  });

  describe("reload", () => {
    it("should reload data.", async () => {
      await packageJson.merge("scripts", { z: 1 }).reload();
      expect(packageJson.get("scripts")).toEqual({ test: "jest" });
    });
  });
});
