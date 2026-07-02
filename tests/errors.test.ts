import { describe, expect, it, vi } from "vitest";
import { env, EnvValidationError, formatIssues, safeEnv } from "../src/index.js";

describe("validation errors", () => {
  it("includes field descriptions in issues", () => {
    try {
      env(
        {
          API_KEY: {
            type: "string",
            required: true,
            description: "Secret API key from dashboard",
          },
        },
        { source: {} },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const validationError = error as EnvValidationError;
      expect(validationError.issues[0]?.description).toBe("Secret API key from dashboard");
      expect(validationError.message).toContain("Secret API key from dashboard");
    }
  });

  it("serializes errors to JSON", () => {
    try {
      env({ PORT: { type: "number" } }, { source: { PORT: "abc" } });
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const json = (error as EnvValidationError).toJSON();
      expect(json.name).toBe("EnvValidationError");
      expect(json.issues[0]?.key).toBe("PORT");
    }
  });

  it("formats issues as readable text", () => {
    const formatted = formatIssues([
      { key: "PORT", message: "must be a number", description: "HTTP port" },
    ]);

    expect(formatted).toContain("PORT (HTTP port): must be a number");
  });

  it("runs custom validate callbacks", () => {
    expect(() =>
      env(
        {
          PORT: {
            type: "number",
            validate: (value) =>
              typeof value === "number" && value % 2 !== 0 ? "must be even" : undefined,
          },
        },
        { source: { PORT: "3" } },
      ),
    ).toThrow(EnvValidationError);

    const config = env(
      {
        PORT: {
          type: "number",
          validate: (value) =>
            typeof value === "number" && value % 2 !== 0 ? "must be even" : undefined,
        },
      },
      { source: { PORT: "4" } },
    );

    expect(config.PORT).toBe(4);
  });

  it("calls onValidationError callback before throwing", () => {
    const handler = vi.fn();

    expect(() =>
      env(
        { SECRET: { type: "string", required: true } },
        { source: {}, onValidationError: handler },
      ),
    ).toThrow(EnvValidationError);

    expect(handler).toHaveBeenCalledOnce();
  });

  it("calls onValidationError in safeEnv without throwing", () => {
    const handler = vi.fn();

    const result = safeEnv(
      { SECRET: { type: "string", required: true } },
      { source: {}, onValidationError: handler },
    );

    expect(result.success).toBe(false);
    expect(handler).toHaveBeenCalledOnce();
  });
});
