import { Uri, window, workspace } from "vscode";
import { resolve } from "path";
import {
  downloadTheme,
  executeHugo,
  generateThemeUri,
  getPlatformName,
  getUserInput,
  ParseFn,
  showMessage,
  toStringArray,
  unzip,
} from "./utils";
import { WORKSPACE_FOLDER } from "./constants";

const onError = (data: Buffer | string) => {
  const _data = data.toString();
  if (/command not found/.test(_data)) {
    console.log("Error: ", "Command Not Found: Please install `Hugo`");
  }
  window.showErrorMessage(data.toString());
};

const parseVersion: ParseFn = (fn, showModal = true) => outputs =>
  fn(
    `Command: ${outputs[0]}\nVersion: ${
      outputs[1]
    }\nPlatform: ${getPlatformName()}`,
    showModal
  );
export const getVersion = () => {
  const observer = executeHugo("version");
  observer.stdout.once("data", toStringArray(parseVersion(showMessage)));
  observer.stderr.once("data", onError);
  observer.stderr.once("error", onError);
};

const parseNewSite: ParseFn = (
  fn,
  projectName: string,
  resolvedPath: string
) => outputs => {
  const success = workspace.updateWorkspaceFolders(0, 1, {
    name: projectName,
    uri: Uri.file(resolvedPath),
  });
  if (success) {
    WORKSPACE_FOLDER.set(resolvedPath);
  }
  return fn(`Created: ${projectName},\n\n${outputs[0]}`);
};
export const createNewSite = async () => {
  try {
    const projectName = await getUserInput({
      prompt: `Provide Project Name. Use absolute path to create Project under different directory.`,
      placeHolder: `${WORKSPACE_FOLDER.get()}/{Project Name}`,
      defaultRes: "go-hugo-site",
    });
    const resolvedPath = resolve(WORKSPACE_FOLDER.get(), projectName);
    const observer = executeHugo("new", "site", resolvedPath);
    observer.stdout.once(
      "data",
      toStringArray(
        parseNewSite(showMessage, projectName, resolvedPath),
        /\r?\n/
      )
    );
    observer.stderr.once("data", onError);
    observer.stderr.once("error", onError);
  } catch (e) {
    // NOOP;
  }
};

export const addTheme = async () => {
  try {
    const projectName = await getUserInput({
      prompt: `Enter theme repo name`,
      placeHolder: "gohugo-theme-ananke",
      defaultRes: "gohugo-theme-ananke",
    });
    const downloadedFilePath = await downloadTheme(
      "temp_theme.hugo.zip",
      generateThemeUri(projectName)
    );
    await unzip(downloadedFilePath, resolve(WORKSPACE_FOLDER.get(), "themes"));
    showMessage(`Download theme to: ${downloadedFilePath}`);
  } catch (e) {
    // NOOP;
  }
};
