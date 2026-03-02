import { describe, it, expect } from "vitest";
import { resolveRef, getPropertySchema } from "../schema";
import type { JsonSchemaProperty } from "../types";

describe("resolveRef", () => {
  it("resolves a simple $ref", () => {
    const root: JsonSchemaProperty = {
      definitions: {
        Foo: { type: "string", description: "A foo" },
      },
    };
    const prop: JsonSchemaProperty = { $ref: "#/definitions/Foo" };
    const resolved = resolveRef(prop, root);
    expect(resolved.type).toBe("string");
    expect(resolved.description).toBe("A foo");
  });

  it("handles missing $ref gracefully", () => {
    const root: JsonSchemaProperty = {};
    const prop: JsonSchemaProperty = { $ref: "#/definitions/Missing" };
    const resolved = resolveRef(prop, root);
    expect(resolved.$ref).toBe("#/definitions/Missing");
  });

  it("prevents infinite cycles", () => {
    const root: JsonSchemaProperty = {
      definitions: {
        A: { $ref: "#/definitions/B" },
        B: { $ref: "#/definitions/A" },
      },
    };
    const prop: JsonSchemaProperty = { $ref: "#/definitions/A" };
    const resolved = resolveRef(prop, root);
    expect(resolved).toBeDefined();
  });

  it("merges allOf", () => {
    const root: JsonSchemaProperty = {
      definitions: {
        Base: { type: "object", properties: { a: { type: "string" } } },
      },
    };
    const prop: JsonSchemaProperty = {
      allOf: [
        { $ref: "#/definitions/Base" },
        { properties: { b: { type: "number" } }, required: ["b"] },
      ],
    };
    const resolved = resolveRef(prop, root);
    expect(resolved.properties?.a).toBeDefined();
    expect(resolved.properties?.b).toBeDefined();
    expect(resolved.required).toContain("b");
  });
});

describe("getPropertySchema", () => {
  it("returns top-level property schema", () => {
    const schema: JsonSchemaProperty = {
      type: "object",
      properties: {
        name: { type: "string", description: "The name" },
      },
    };
    const result = getPropertySchema(schema, "/name");
    expect(result?.type).toBe("string");
    expect(result?.description).toBe("The name");
  });

  it("resolves nested properties", () => {
    const schema: JsonSchemaProperty = {
      type: "object",
      properties: {
        config: {
          type: "object",
          properties: {
            port: { type: "number" },
          },
        },
      },
    };
    const result = getPropertySchema(schema, "/config/port");
    expect(result?.type).toBe("number");
  });

  it("follows $ref in properties", () => {
    const schema: JsonSchemaProperty = {
      type: "object",
      properties: {
        item: { $ref: "#/definitions/Item" },
      },
      definitions: {
        Item: {
          type: "object",
          properties: { id: { type: "number" } },
        },
      },
    };
    const result = getPropertySchema(schema, "/item/id");
    expect(result?.type).toBe("number");
  });

  it("resolves array items", () => {
    const schema: JsonSchemaProperty = {
      type: "object",
      properties: {
        tags: {
          type: "array",
          items: { type: "string" },
        },
      },
    };
    const result = getPropertySchema(schema, "/tags/0");
    expect(result?.type).toBe("string");
  });

  it("returns undefined for missing paths", () => {
    const schema: JsonSchemaProperty = {
      type: "object",
      properties: { a: { type: "string" } },
    };
    expect(getPropertySchema(schema, "/nonexistent")).toBeUndefined();
  });

  it("resolves anyOf variants", () => {
    const schema: JsonSchemaProperty = {
      type: "object",
      properties: {
        value: {
          anyOf: [
            { type: "object", properties: { x: { type: "number" } } },
            { type: "string" },
          ],
        },
      },
    };
    const result = getPropertySchema(schema, "/value/x");
    expect(result?.type).toBe("number");
  });

  it("returns undefined when no anyOf variant matches", () => {
    const schema: JsonSchemaProperty = {
      type: "object",
      properties: {
        value: {
          anyOf: [{ type: "string" }, { type: "number" }],
        },
      },
    };
    const result = getPropertySchema(schema, "/value/missing");
    expect(result).toBeUndefined();
  });

  it("resolves patternProperties", () => {
    const schema: JsonSchemaProperty = {
      type: "object",
      patternProperties: {
        "^x-": { type: "string" },
      },
    };
    const result = getPropertySchema(schema, "/x-custom");
    expect(result?.type).toBe("string");
  });

  it("resolves additionalProperties", () => {
    const schema: JsonSchemaProperty = {
      type: "object",
      additionalProperties: { type: "boolean" },
    };
    const result = getPropertySchema(schema, "/anything");
    expect(result?.type).toBe("boolean");
  });
});
