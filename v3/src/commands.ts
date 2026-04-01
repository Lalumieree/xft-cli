import ApiCallCommand from "./commands/api/call";
import AuthCommand from "./commands/auth";
import CityRefreshCommand from "./commands/city/refresh";
import CityResolveCommand from "./commands/city/resolve";
import ConfigGetCommand from "./commands/config/get";
import ConfigListCommand from "./commands/config/list";
import ConfigSetCommand from "./commands/config/set";
import DocFetchCommand from "./commands/doc/fetch";
import DocFindCommand from "./commands/doc/find";

const commands = {
  "api:call": ApiCallCommand,
  auth: AuthCommand,
  "city:refresh": CityRefreshCommand,
  "city:resolve": CityResolveCommand,
  "config:get": ConfigGetCommand,
  "config:list": ConfigListCommand,
  "config:set": ConfigSetCommand,
  "doc:fetch": DocFetchCommand,
  "doc:find": DocFindCommand,
};

export default commands;
