import { join } from "path";
import { Manager } from "../src";

const manager = new Manager({ root: join(__dirname, "example") });

describe("manager", () => {
  it("should load multiple files.", async () => {
    const [packageJson, eslintConfig] = await manager.loadAll(["package.json", ".eslintrc.js"]);
    expect(packageJson.get("name")).toBe("example-package");
    expect(eslintConfig.get("root")).toBe(true);
  });

  it("should load .xxxrc config using cosmiconfig.", async () => {
    const dataFile = await manager.load("prettier", { cosmiconfig: true });
    expect(dataFile.data).toEqual({ a: 1 });
  });

  it("should load non existing config using cosmiconfig.", async () => {
    const dataFile = await manager.load("non-existing", { cosmiconfig: true });
    expect(dataFile.data).toEqual({});
    expect(dataFile.found).toBe(false);
  });
});
