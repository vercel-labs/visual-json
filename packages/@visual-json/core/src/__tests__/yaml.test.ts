import { describe, it, expect, beforeEach } from "vitest";
import { fromYaml, toYaml, jsonValueToYaml, yamlToJsonValue } from "../yaml";
import { resetIdCounter, toJson, findNodeByPath } from "../tree";

beforeEach(() => {
  resetIdCounter();
});

describe("fromYaml / toYaml round-trip", () => {
  it("round-trips a flat object", async () => {
    const yaml = "name: app\nversion: 1.0.0\n";
    const state = await fromYaml(yaml);
    const result = await toYaml(state);
    expect(result).toBe(yaml);
  });

  it("round-trips a nested object", async () => {
    const yaml = "server:\n  host: localhost\n  port: 3000\n";
    const state = await fromYaml(yaml);
    expect(toJson(state.root)).toEqual({
      server: { host: "localhost", port: 3000 },
    });
  });

  it("round-trips an array", async () => {
    const yaml = "- one\n- two\n- three\n";
    const state = await fromYaml(yaml);
    expect(toJson(state.root)).toEqual(["one", "two", "three"]);
  });

  it("round-trips mixed types", async () => {
    const yaml = "string: hello\nnumber: 42\nbool: true\nnull_val: null\n";
    const state = await fromYaml(yaml);
    const value = toJson(state.root);
    expect(value).toEqual({
      string: "hello",
      number: 42,
      bool: true,
      null_val: null,
    });
  });

  it("handles empty YAML as empty object", async () => {
    const state = await fromYaml("");
    expect(toJson(state.root)).toEqual({});
  });
});

describe("tree structure from YAML", () => {
  it("creates correct paths", async () => {
    const yaml = "a:\n  b: 1\n";
    const state = await fromYaml(yaml);
    const node = findNodeByPath(state, "/a/b");
    expect(node).toBeDefined();
    expect(node!.value).toBe(1);
  });

  it("indexes all nodes", async () => {
    const yaml = "x: 1\ny:\n  z: 2\n";
    const state = await fromYaml(yaml);
    // root + x + y + z = 4
    expect(state.nodesById.size).toBe(4);
  });
});

describe("jsonValueToYaml", () => {
  it("serializes an object to YAML", async () => {
    const result = await jsonValueToYaml({ name: "test", count: 5 });
    expect(result).toContain("name: test");
    expect(result).toContain("count: 5");
  });
});

describe("yamlToJsonValue", () => {
  it("parses YAML to a plain object", async () => {
    const result = await yamlToJsonValue("name: test\ncount: 5\n");
    expect(result).toEqual({ name: "test", count: 5 });
  });

  it("returns empty object for empty input", async () => {
    const result = await yamlToJsonValue("");
    expect(result).toEqual({});
  });
});
