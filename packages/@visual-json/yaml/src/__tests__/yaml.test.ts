import { describe, it, expect, beforeEach } from "vitest";
import {
  fromYaml,
  toYaml,
  parseYamlContent,
  stringifyYamlContent,
  isYamlFile,
} from "../index";
import { resetIdCounter, toJson, findNodeByPath } from "@visual-json/core";

beforeEach(() => {
  resetIdCounter();
});

describe("isYamlFile", () => {
  it("returns true for .yml", () => {
    expect(isYamlFile("file.yml")).toBe(true);
  });

  it("returns true for .yaml", () => {
    expect(isYamlFile("docker-compose.yaml")).toBe(true);
  });

  it("returns false for .json", () => {
    expect(isYamlFile("file.json")).toBe(false);
  });

  it("returns false for no extension", () => {
    expect(isYamlFile("Makefile")).toBe(false);
  });
});

describe("parseYamlContent / stringifyYamlContent round-trip", () => {
  it("round-trips a flat object", () => {
    const yaml = "name: app\nversion: 1.0.0\n";
    const value = parseYamlContent(yaml);
    expect(value).toEqual({ name: "app", version: "1.0.0" });
    expect(stringifyYamlContent(value)).toBe(yaml);
  });

  it("round-trips an array", () => {
    const value = parseYamlContent("- one\n- two\n- three\n");
    expect(value).toEqual(["one", "two", "three"]);
  });

  it("round-trips mixed types", () => {
    const value = parseYamlContent(
      "string: hello\nnumber: 42\nbool: true\nnull_val: null\n",
    );
    expect(value).toEqual({
      string: "hello",
      number: 42,
      bool: true,
      null_val: null,
    });
  });

  it("returns empty object for empty input", () => {
    expect(parseYamlContent("")).toEqual({});
  });
});

describe("fromYaml / toYaml round-trip", () => {
  it("creates correct tree structure", () => {
    const state = fromYaml("a:\n  b: 1\n");
    const node = findNodeByPath(state, "/a/b");
    expect(node).toBeDefined();
    expect(node!.value).toBe(1);
  });

  it("indexes all nodes", () => {
    const state = fromYaml("x: 1\ny:\n  z: 2\n");
    // root + x + y + z = 4
    expect(state.nodesById.size).toBe(4);
  });

  it("round-trips a nested object", () => {
    const state = fromYaml("server:\n  host: localhost\n  port: 3000\n");
    expect(toJson(state.root)).toEqual({
      server: { host: "localhost", port: 3000 },
    });
  });

  it("serializes back to YAML", () => {
    const yaml = "name: app\nversion: 1.0.0\n";
    const state = fromYaml(yaml);
    expect(toYaml(state)).toBe(yaml);
  });
});
