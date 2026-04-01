import { readFileSync } from "node:fs";
import type { FlattenedMenuNode, MenuNode } from "./types";

export function loadMenuTree(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function flattenNodes(node: MenuNode, acc: FlattenedMenuNode[], pathNames: string[] = []): void {
  const menu = node.menuInf ?? {};
  const menuId = menu.menuId ?? node.id;
  const menuName = menu.menuName ?? node.name ?? "";
  const currentPathNames = [...pathNames, menuName];
  const pathIds = [...(node._pathIds ?? []), menuId].filter((item) => item !== undefined);
  acc.push({
    menuId,
    menuName,
    menuType: menu.menuType,
    restDocFlag: menu.restDocFlag,
    eventDocFlag: menu.eventDocFlag,
    pathNames: currentPathNames,
    pathIds,
    node,
  });
  for (const child of node.children ?? []) {
    child._pathIds = pathIds;
    flattenNodes(child, acc, currentPathNames);
  }
}
