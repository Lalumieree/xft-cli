import ApiCallCommand from "./commands/api/call";
import ApiInterfacesCommand from "./commands/api/interfaces";
import AuthCommand from "./commands/auth";
import CityRefreshCommand from "./commands/city/refresh";
import CityResolveCommand from "./commands/city/resolve";
import ConfigGetCommand from "./commands/config/get";
import ConfigListCommand from "./commands/config/list";
import ConfigSetCommand from "./commands/config/set";
import DocFetchCommand from "./commands/doc/fetch";

const commands = {
  "api:call": ApiCallCommand,
  "api:interfaces": ApiInterfacesCommand,
  auth: AuthCommand,
  "city:refresh": CityRefreshCommand,
  "city:resolve": CityResolveCommand,
  "config:get": ConfigGetCommand,
  "config:list": ConfigListCommand,
  "config:set": ConfigSetCommand,
  "doc:fetch": DocFetchCommand,
};

export default commands;
