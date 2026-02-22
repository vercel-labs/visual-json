export type {
  JsonValue,
  JsonPrimitive,
  JsonArray,
  JsonObject,
  NodeType,
  TreeNode,
  TreeState,
  JsonSchema,
  JsonSchemaProperty,
} from "./types";

export {
  fromJson,
  toJson,
  findNode,
  findNodeByPath,
  isDescendant,
  resetIdCounter,
  getNodeType,
  generateId,
  buildSubtree,
} from "./tree";

export {
  setValue,
  setKey,
  addProperty,
  removeNode,
  moveNode,
  reorderChildren,
  changeType,
  duplicateNode,
} from "./operations";

export { History } from "./history";

export {
  resolveSchema,
  resolveRef,
  getPropertySchema,
  clearSchemaCache,
} from "./schema";

export { validateNode, type ValidationResult } from "./validate";

export { searchNodes, getAncestorIds, type SearchMatch } from "./search";

export {
  computeDiff,
  getDiffPaths,
  type DiffEntry,
  type DiffType,
} from "./diff";
