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

export interface XftCredentials {
  appid: string;
  cscappuid: string;
  authoritySecret: string;
  cscprjcod?: string | null;
  cscusrnbr?: string | null;
  cscusruid?: string | null;
  encryptBody: boolean;
  signContentMode: "raw-body" | "digest-header";
}
