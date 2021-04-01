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
