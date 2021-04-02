import { homedir } from "os";
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
}
export const getConfig = (() => {
  let configs: Config;
  const update = () => {
    const config = workspace.getConfiguration(EXTENSION_NAME);
    configs = {
      configPath: config.get<string>("config") || "config.toml",
    };
    return configs;
  };
  configs = update();

  return () => [configs, update] as [Config, () => Config];
})();

export const CACHE: {
  HUGO_THEMES: {
    url: string;
    name: string;
  }[];
} = {
  HUGO_THEMES: [],
};
