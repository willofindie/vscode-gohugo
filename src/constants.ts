import { ChildProcessWithoutNullStreams } from "child_process";
import { homedir } from "os";
import { resolve } from "path";
import { workspace } from "vscode";

export const WORKSPACE_FOLDER = (() => {
  let DEFAULT_PATH = "";
  if (workspace.workspaceFolders) {
    DEFAULT_PATH = workspace.workspaceFolders[0].uri.path;
  } else {
    DEFAULT_PATH = homedir();
  }
  return {
    get: () => DEFAULT_PATH,
    set(newPath?: string) {
      console.log(newPath);
      DEFAULT_PATH = newPath || homedir();
    },
  };
})();

export const EXTENSION_NAME = "gohugo";

export interface Config {
  configPath: string;
  port: number;
}
export const getConfig = (() => {
  let configs: Config;
  const update = () => {
    const config = workspace.getConfiguration(EXTENSION_NAME);
    const dir = WORKSPACE_FOLDER.get();
    const configName = config.get<string>("config") || "config.toml";
    configs = {
      configPath: resolve(dir, configName),
      port: config.get<number>("port") || 3000,
    };
    return configs;
  };
  configs = update();

  const get = () => configs;

  return () => [get, update] as [() => Config, () => Config];
})();

export const CACHE: {
  HUGO_THEMES: {
    url: string;
    name: string;
  }[];
  SERVER_PROC_ID: ChildProcessWithoutNullStreams | null;
} = {
  HUGO_THEMES: [],
  SERVER_PROC_ID: null,
};
