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
  reparentSubtree,
} from "./tree";

export {
  setValue,
  setKey,
  addProperty,
  insertProperty,
  insertNode,
  removeNode,
  moveNode,
  reorderChildren,
  reorderChildrenMulti,
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
