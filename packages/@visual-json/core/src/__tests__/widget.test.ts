import { describe, it, expect } from "vitest";
import { getWidgetType } from "../widget";
import type { JsonSchemaProperty } from "../types";

describe("getWidgetType", () => {
  describe("explicit x-widget override", () => {
    it("returns 'radio' when x-widget is radio", () => {
      const schema: JsonSchemaProperty = {
        "x-widget": "radio",
        enum: ["a", "b", "c", "d"],
      };
      expect(getWidgetType("string", schema)).toBe("radio");
    });

    it("returns 'checkbox' when x-widget is checkbox", () => {
      const schema: JsonSchemaProperty = { "x-widget": "checkbox" };
      expect(getWidgetType("string", schema)).toBe("checkbox");
    });

    it("returns 'select' when x-widget is select, even for small enum", () => {
      const schema: JsonSchemaProperty = { "x-widget": "select", enum: ["a"] };
      expect(getWidgetType("string", schema)).toBe("select");
    });

    it("x-widget overrides boolean default to radio", () => {
      const schema: JsonSchemaProperty = { "x-widget": "radio" };
      expect(getWidgetType("boolean", schema)).toBe("radio");
    });

    it("x-widget overrides boolean default to select", () => {
      const schema: JsonSchemaProperty = { "x-widget": "select" };
      expect(getWidgetType("boolean", schema)).toBe("select");
    });
  });

  describe("boolean node type", () => {
    it("returns 'checkbox' for boolean with no schema", () => {
      expect(getWidgetType("boolean", undefined)).toBe("checkbox");
    });

    it("returns 'checkbox' for boolean with schema but no x-widget", () => {
      const schema: JsonSchemaProperty = { type: "boolean" };
      expect(getWidgetType("boolean", schema)).toBe("checkbox");
    });

    it("returns 'checkbox' for boolean even when schema has enum", () => {
      const schema: JsonSchemaProperty = { enum: [true, false] };
      expect(getWidgetType("boolean", schema)).toBe("checkbox");
    });
  });

  describe("enum values", () => {
    it("returns 'radio' for enum with 1 option", () => {
      const schema: JsonSchemaProperty = { enum: ["only"] };
      expect(getWidgetType("string", schema)).toBe("radio");
    });

    it("returns 'radio' for enum with 2 options", () => {
      const schema: JsonSchemaProperty = { enum: ["yes", "no"] };
      expect(getWidgetType("string", schema)).toBe("radio");
    });

    it("returns 'radio' for enum with exactly 3 options (threshold)", () => {
      const schema: JsonSchemaProperty = { enum: ["a", "b", "c"] };
      expect(getWidgetType("string", schema)).toBe("radio");
    });

    it("returns 'select' for enum with 4 options (above threshold)", () => {
      const schema: JsonSchemaProperty = { enum: ["a", "b", "c", "d"] };
      expect(getWidgetType("string", schema)).toBe("select");
    });

    it("returns 'select' for large enum", () => {
      const schema: JsonSchemaProperty = {
        enum: ["a", "b", "c", "d", "e", "f", "g"],
      };
      expect(getWidgetType("string", schema)).toBe("select");
    });

    it("returns 'radio' for number enum with few options", () => {
      const schema: JsonSchemaProperty = { enum: [1, 2, 3] };
      expect(getWidgetType("number", schema)).toBe("radio");
    });

    it("returns 'select' for mixed-type enum above threshold", () => {
      const schema: JsonSchemaProperty = { enum: ["a", 1, null, true, "b"] };
      expect(getWidgetType("string", schema)).toBe("select");
    });
  });

  describe("no enum", () => {
    it("returns 'input' for string with no schema", () => {
      expect(getWidgetType("string", undefined)).toBe("input");
    });

    it("returns 'input' for number with no schema", () => {
      expect(getWidgetType("number", undefined)).toBe("input");
    });

    it("returns 'input' for string with schema but no enum", () => {
      const schema: JsonSchemaProperty = { type: "string", minLength: 3 };
      expect(getWidgetType("string", schema)).toBe("input");
    });

    it("returns 'input' for null type", () => {
      expect(getWidgetType("null", undefined)).toBe("input");
    });

    it("returns 'input' when enum is empty array", () => {
      const schema: JsonSchemaProperty = { enum: [] };
      expect(getWidgetType("string", schema)).toBe("input");
    });
  });
});
