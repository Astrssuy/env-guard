import { describe, expect, it } from "vitest";
import { env, EnvValidationError } from "../src/index.js";

describe("email and json types", () => {
  it("parses valid email addresses", () => {
    const config = env(
      {
        ADMIN_EMAIL: { type: "email", required: true },
      },
      { source: { ADMIN_EMAIL: "admin@example.com" } },
    );

    expect(config.ADMIN_EMAIL).toBe("admin@example.com");
  });

  it("rejects invalid email addresses", () => {
    expect(() =>
      env(
        { ADMIN_EMAIL: { type: "email", required: true } },
        { source: { ADMIN_EMAIL: "not-an-email" } },
      ),
    ).toThrow(EnvValidationError);
  });

  it("parses JSON environment values", () => {
    const config = env(
      {
        FEATURE_FLAGS: { type: "json", required: true },
      },
      { source: { FEATURE_FLAGS: '{"darkMode":true,"beta":false}' } },
    );

    expect(config.FEATURE_FLAGS).toEqual({ darkMode: true, beta: false });
  });

  it("rejects malformed JSON", () => {
    expect(() =>
      env(
        { FEATURE_FLAGS: { type: "json", required: true } },
        { source: { FEATURE_FLAGS: "{invalid" } },
      ),
    ).toThrow(EnvValidationError);
  });
});

describe("port type", () => {
  it("accepts valid port numbers", () => {
    const config = env(
      { PORT: { type: "port", default: 3000 } },
      { source: { PORT: "8080" } },
    );

    expect(config.PORT).toBe(8080);
  });

  it("rejects ports outside 1-65535", () => {
    expect(() =>
      env({ PORT: { type: "port" } }, { source: { PORT: "70000" } }),
    ).toThrow(EnvValidationError);

    expect(() =>
      env({ PORT: { type: "port" } }, { source: { PORT: "0" } }),
    ).toThrow(EnvValidationError);
  });
});
