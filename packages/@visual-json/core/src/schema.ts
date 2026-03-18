import type {
  JsonSchema,
  JsonSchemaProperty,
  JsonValue,
  JsonObject,
} from "./types";

const KNOWN_SCHEMAS: Record<string, string> = {
  "package.json": "https://json.schemastore.org/package.json",
  "tsconfig.json": "https://json.schemastore.org/tsconfig",
  "tsconfig.base.json": "https://json.schemastore.org/tsconfig",
  ".eslintrc.json": "https://json.schemastore.org/eslintrc",
  ".prettierrc": "https://json.schemastore.org/prettierrc",
  ".prettierrc.json": "https://json.schemastore.org/prettierrc",
  "turbo.json": "https://turborepo.dev/schema.json",
  ".babelrc": "https://json.schemastore.org/babelrc",
  "nest-cli.json": "https://json.schemastore.org/nest-cli",
  "vercel.json": "https://openapi.vercel.sh/vercel.json",
  ".swcrc": "https://json.schemastore.org/swcrc",

  // YAML
  "docker-compose.yml": "https://json.schemastore.org/docker-compose.json",
  "docker-compose.yaml": "https://json.schemastore.org/docker-compose.json",
  ".gitlab-ci.yml": "https://json.schemastore.org/gitlab-ci.json",
  "mkdocs.yml": "https://json.schemastore.org/mkdocs-1.0.json",
  ".pre-commit-config.yaml":
    "https://json.schemastore.org/pre-commit-config.json",
  "pubspec.yaml": "https://json.schemastore.org/pubspec.json",
  ".eslintrc.yml": "https://json.schemastore.org/eslintrc.json",
  ".eslintrc.yaml": "https://json.schemastore.org/eslintrc.json",
  ".prettierrc.yml": "https://json.schemastore.org/prettierrc.json",
  ".prettierrc.yaml": "https://json.schemastore.org/prettierrc.json",
  ".travis.yml": "https://json.schemastore.org/travis.json",
  "appveyor.yml": "https://json.schemastore.org/appveyor.json",
  "cloudbuild.yaml": "https://json.schemastore.org/cloudbuild.json",
  "serverless.yml": "https://json.schemastore.org/serverlessframework.json",
  "serverless.yaml": "https://json.schemastore.org/serverlessframework.json",
  "pnpm-workspace.yaml": "https://json.schemastore.org/pnpm-workspace.json",
};

const KNOWN_YAML_GLOBS: Record<string, string> = {
  ".github/workflows/*.yml":
    "https://json.schemastore.org/github-workflow.json",
  ".github/workflows/*.yaml":
    "https://json.schemastore.org/github-workflow.json",
  ".github/actions/*/action.yml":
    "https://json.schemastore.org/github-action.json",
  ".github/actions/*/action.yaml":
    "https://json.schemastore.org/github-action.json",
};

const MAX_SCHEMA_CACHE = 50;
const schemaCache = new Map<string, JsonSchema>();

async function fetchSchema(url: string): Promise<JsonSchema | null> {
  if (schemaCache.has(url)) {
    return schemaCache.get(url)!;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const schema = (await res.json()) as JsonSchema;
    if (schemaCache.size >= MAX_SCHEMA_CACHE) {
      const oldest = schemaCache.keys().next().value;
      if (oldest !== undefined) schemaCache.delete(oldest);
    }
    schemaCache.set(url, schema);
    return schema;
  } catch {
    return null;
  }
}

export async function resolveSchema(
  json: JsonValue,
  filename?: string,
): Promise<JsonSchema | null> {
  if (
    json !== null &&
    typeof json === "object" &&
    !Array.isArray(json) &&
    typeof (json as JsonObject)["$schema"] === "string"
  ) {
    const url = (json as JsonObject)["$schema"] as string;
    const schema = await fetchSchema(url);
    if (schema) return schema;
  }

  if (filename) {
    const base = filename.split("/").pop() ?? filename;
    const knownUrl = KNOWN_SCHEMAS[base];
    if (knownUrl) {
      return fetchSchema(knownUrl);
    }

    // Glob patterns for YAML files (e.g. .github/workflows/*.yml)
    for (const [pattern, url] of Object.entries(KNOWN_YAML_GLOBS)) {
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, "[^/]+").replace(/\//g, "\\/") + "$",
      );
      if (regex.test(filename)) {
        return fetchSchema(url);
      }
    }
  }

  return null;
}

function findDefinition(
  root: JsonSchemaProperty,
  refPath: string,
): JsonSchemaProperty | undefined {
  if (!refPath.startsWith("#/")) return undefined;
  const segments = refPath.slice(2).split("/");
  let current: unknown = root;

  for (const seg of segments) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[seg];
  }

  return current as JsonSchemaProperty | undefined;
}

/**
 * Resolve `$ref` pointers and merge `allOf` within a schema.
 * `visited` tracks refs to prevent infinite cycles.
 */
export function resolveRef(
  prop: JsonSchemaProperty,
  root: JsonSchemaProperty,
  visited?: Set<string>,
): JsonSchemaProperty {
  const seen = visited ?? new Set<string>();

  if (prop.$ref) {
    if (seen.has(prop.$ref)) return prop;
    seen.add(prop.$ref);
    const resolved = findDefinition(root, prop.$ref);
    if (resolved) {
      return resolveRef(resolved, root, seen);
    }
    return prop;
  }

  if (prop.allOf && prop.allOf.length > 0) {
    return mergeAllOf(prop, root, seen);
  }

  return prop;
}

function mergeAllOf(
  prop: JsonSchemaProperty,
  root: JsonSchemaProperty,
  visited: Set<string>,
): JsonSchemaProperty {
  const merged: JsonSchemaProperty = { ...prop };
  delete merged.allOf;

  for (const sub of prop.allOf!) {
    const resolved = resolveRef(sub, root, new Set(visited));
    if (resolved.type && !merged.type) merged.type = resolved.type;
    if (resolved.properties) {
      merged.properties = { ...merged.properties, ...resolved.properties };
    }
    if (resolved.required) {
      merged.required = [
        ...new Set([...(merged.required ?? []), ...resolved.required]),
      ];
    }
    if (
      resolved.additionalProperties !== undefined &&
      merged.additionalProperties === undefined
    ) {
      merged.additionalProperties = resolved.additionalProperties;
    }
    if (resolved.items && !merged.items) merged.items = resolved.items;
    if (resolved.description && !merged.description)
      merged.description = resolved.description;
    if (resolved.title && !merged.title) merged.title = resolved.title;
    if (resolved.enum && !merged.enum) merged.enum = resolved.enum;
    if (resolved.minimum !== undefined && merged.minimum === undefined)
      merged.minimum = resolved.minimum;
    if (resolved.maximum !== undefined && merged.maximum === undefined)
      merged.maximum = resolved.maximum;
    if (resolved.minLength !== undefined && merged.minLength === undefined)
      merged.minLength = resolved.minLength;
    if (resolved.maxLength !== undefined && merged.maxLength === undefined)
      merged.maxLength = resolved.maxLength;
    if (resolved.pattern && !merged.pattern) merged.pattern = resolved.pattern;
    if (resolved.format && !merged.format) merged.format = resolved.format;
  }

  return merged;
}

export function getPropertySchema(
  schema: JsonSchema | JsonSchemaProperty,
  path: string,
  rootSchema?: JsonSchemaProperty,
): JsonSchemaProperty | undefined {
  const root = rootSchema ?? schema;
  const segments = path.split("/").filter(Boolean);
  let current: JsonSchemaProperty | undefined = resolveRef(schema, root);

  for (const seg of segments) {
    if (!current) return undefined;
    current = resolveRef(current, root);

    if (current.properties?.[seg]) {
      current = resolveRef(current.properties[seg], root);
      continue;
    }

    if (current.patternProperties) {
      const match = Object.entries(current.patternProperties).find(
        ([pattern]) => {
          try {
            return new RegExp(pattern).test(seg);
          } catch {
            return false;
          }
        },
      );
      if (match) {
        current = resolveRef(match[1], root);
        continue;
      }
    }

    if (
      current.additionalProperties &&
      typeof current.additionalProperties === "object"
    ) {
      current = resolveRef(current.additionalProperties, root);
      continue;
    }

    if (current.items) {
      if (Array.isArray(current.items)) {
        const idx = Number(seg);
        if (!isNaN(idx) && current.items[idx]) {
          current = resolveRef(current.items[idx], root);
          continue;
        }
      } else {
        current = resolveRef(current.items, root);
        continue;
      }
    }

    if (current.anyOf || current.oneOf) {
      const variants = current.anyOf ?? current.oneOf ?? [];
      let found: JsonSchemaProperty | undefined;
      for (const variant of variants) {
        const resolved = resolveRef(variant, root);
        found = getPropertySchema(resolved, seg, root);
        if (found) break;
      }
      if (found) {
        current = found;
        continue;
      }
      return undefined;
    }

    return undefined;
  }

  return current;
}

export function clearSchemaCache(): void {
  schemaCache.clear();
}
