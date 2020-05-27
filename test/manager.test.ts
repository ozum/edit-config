import { join } from "path";
import { Manager } from "../src";

const manager = new Manager({ root: join(__dirname, "..") });

describe("manager", () => {
  it("should load multiple files.", async () => {
    const [packageJson, eslintConfig] = await manager.loadAll(["package.json", ".eslintrc.js"]);
    expect(packageJson.get("name")).toBe("edit-config");
    expect(eslintConfig.get("root")).toBe(true);
  });
});
