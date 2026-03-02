import { describe, it, expect, beforeEach } from "vitest";
import { fromJson, resetIdCounter, findNodeByPath } from "../tree";
import { validateNode } from "../validate";
import type { JsonSchemaProperty } from "../types";

beforeEach(() => {
  resetIdCounter();
});

function nodeAt(json: unknown, path: string) {
  const state = fromJson(json as never);
  return findNodeByPath(state, path)!;
}

describe("validateNode", () => {
  it("returns valid when no schema is provided", () => {
    const node = nodeAt({ a: 1 }, "/a");
    expect(validateNode(node, undefined)).toEqual({ valid: true, errors: [] });
  });

  it("detects type mismatch", () => {
    const node = nodeAt({ a: "hello" }, "/a");
    const schema: JsonSchemaProperty = { type: "number" };
    const result = validateNode(node, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("number");
  });

  it("validates union types", () => {
    const node = nodeAt({ a: "hello" }, "/a");
    const schema: JsonSchemaProperty = { type: ["string", "number"] };
    expect(validateNode(node, schema).valid).toBe(true);
  });

  it("treats number as integer", () => {
    const node = nodeAt({ a: 5 }, "/a");
    const schema: JsonSchemaProperty = { type: "integer" };
    expect(validateNode(node, schema).valid).toBe(true);
  });

  it("validates enum values", () => {
    const node = nodeAt({ a: "baz" }, "/a");
    const schema: JsonSchemaProperty = { enum: ["foo", "bar"] };
    const result = validateNode(node, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("one of");
  });

  it("passes for matching enum", () => {
    const node = nodeAt({ a: "foo" }, "/a");
    const schema: JsonSchemaProperty = { enum: ["foo", "bar"] };
    expect(validateNode(node, schema).valid).toBe(true);
  });

  it("validates const", () => {
    const node = nodeAt({ a: 2 }, "/a");
    const schema: JsonSchemaProperty = { const: 1 };
    expect(validateNode(node, schema).valid).toBe(false);
  });

  it("validates required properties", () => {
    const node = nodeAt({ obj: { a: 1 } }, "/obj");
    const schema: JsonSchemaProperty = { required: ["a", "b"] };
    const result = validateNode(node, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("b");
  });

  it("validates minimum", () => {
    const node = nodeAt({ a: 3 }, "/a");
    const schema: JsonSchemaProperty = { type: "number", minimum: 5 };
    expect(validateNode(node, schema).valid).toBe(false);
  });

  it("validates maximum", () => {
    const node = nodeAt({ a: 10 }, "/a");
    const schema: JsonSchemaProperty = { type: "number", maximum: 5 };
    expect(validateNode(node, schema).valid).toBe(false);
  });

  it("validates exclusiveMinimum", () => {
    const node = nodeAt({ a: 5 }, "/a");
    const schema: JsonSchemaProperty = {
      type: "number",
      exclusiveMinimum: 5,
    };
    expect(validateNode(node, schema).valid).toBe(false);
  });

  it("validates exclusiveMaximum", () => {
    const node = nodeAt({ a: 5 }, "/a");
    const schema: JsonSchemaProperty = {
      type: "number",
      exclusiveMaximum: 5,
    };
    expect(validateNode(node, schema).valid).toBe(false);
  });

  it("validates multipleOf with integers", () => {
    const node = nodeAt({ a: 7 }, "/a");
    const schema: JsonSchemaProperty = { type: "number", multipleOf: 3 };
    expect(validateNode(node, schema).valid).toBe(false);
  });

  it("validates multipleOf with floats correctly", () => {
    const node = nodeAt({ a: 0.3 }, "/a");
    const schema: JsonSchemaProperty = { type: "number", multipleOf: 0.1 };
    expect(validateNode(node, schema).valid).toBe(true);
  });

  it("validates minLength", () => {
    const node = nodeAt({ a: "ab" }, "/a");
    const schema: JsonSchemaProperty = { type: "string", minLength: 5 };
    expect(validateNode(node, schema).valid).toBe(false);
  });

  it("validates maxLength", () => {
    const node = nodeAt({ a: "abcdef" }, "/a");
    const schema: JsonSchemaProperty = { type: "string", maxLength: 3 };
    expect(validateNode(node, schema).valid).toBe(false);
  });

  it("validates pattern", () => {
    const node = nodeAt({ a: "hello" }, "/a");
    const schema: JsonSchemaProperty = { type: "string", pattern: "^\\d+$" };
    expect(validateNode(node, schema).valid).toBe(false);
  });

  it("validates format (email)", () => {
    const node = nodeAt({ a: "not-an-email" }, "/a");
    const schema: JsonSchemaProperty = { type: "string", format: "email" };
    expect(validateNode(node, schema).valid).toBe(false);
  });

  it("passes valid email format", () => {
    const node = nodeAt({ a: "user@example.com" }, "/a");
    const schema: JsonSchemaProperty = { type: "string", format: "email" };
    expect(validateNode(node, schema).valid).toBe(true);
  });

  it("validates minItems", () => {
    const node = nodeAt({ arr: [1] }, "/arr");
    const schema: JsonSchemaProperty = { type: "array", minItems: 3 };
    expect(validateNode(node, schema).valid).toBe(false);
  });

  it("validates maxItems", () => {
    const node = nodeAt({ arr: [1, 2, 3, 4] }, "/arr");
    const schema: JsonSchemaProperty = { type: "array", maxItems: 2 };
    expect(validateNode(node, schema).valid).toBe(false);
  });

  it("validates minProperties", () => {
    const node = nodeAt({ obj: { a: 1 } }, "/obj");
    const schema: JsonSchemaProperty = { type: "object", minProperties: 3 };
    expect(validateNode(node, schema).valid).toBe(false);
  });

  it("validates maxProperties", () => {
    const node = nodeAt({ obj: { a: 1, b: 2, c: 3 } }, "/obj");
    const schema: JsonSchemaProperty = { type: "object", maxProperties: 2 };
    expect(validateNode(node, schema).valid).toBe(false);
  });
});
