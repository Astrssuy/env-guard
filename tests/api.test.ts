import { describe, expect, it } from "vitest";
import { assertEnv, VERSION } from "../src/index.js";

describe("assertEnv and version", () => {
  it("assertEnv works as an alias for env", () => {
    const config = assertEnv(
      { PORT: { type: "number", default: 3000 } },
      { source: { PORT: "5000" } },
    );

    expect(config.PORT).toBe(5000);
  });

  it("exports package version", () => {
    expect(VERSION).toBe("0.4.0");
  });
});
