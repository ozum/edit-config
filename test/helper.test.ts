import { getArrayPath } from "../src/helper";

describe("getArrayPath()", () => {
  it("should return array path for given string", () => {
    expect(getArrayPath("a.b.c")).toEqual(["a", "b", "c"]);
  });
});
