export interface MenuNode {
  id?: number | string;
  name?: string;
  children?: MenuNode[];
  menuInf?: {
    menuId?: number | string;
    menuName?: string;
    menuType?: number | string;
    restDocFlag?: string;
    eventDocFlag?: string;
  };
  _pathIds?: Array<number | string>;
}

export interface FlattenedMenuNode {
  menuId?: number | string;
  menuName: string;
  menuType?: number | string;
  restDocFlag?: string;
  eventDocFlag?: string;
  pathNames: string[];
  pathIds?: Array<number | string>;
  node?: MenuNode;
}

export interface GatewayCredentials {
  gatewayUrl: string;
  token: string;
}

export interface GatewayInterface {
  id: string;
  name: string;
  docid?: string | number;
}
