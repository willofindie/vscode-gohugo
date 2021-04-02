import { QuickPickItem, Uri, window, workspace } from "vscode";
import { resolve } from "path";
import {
  deleteFile,
  downloadTheme,
  executeHugo,
  generateThemeUri,
  getHugoThemes,
  getPlatformName,
  getUserInput,
  ParseFn,
  renameFile,
  replaceTomlConfig,
  showMessage,
  ShowMessageOptions,
  toStringArray,
  unzip,
} from "./utils";
import { CACHE, getConfig, WORKSPACE_FOLDER } from "./constants";
import { existsSync } from "fs";

const onError = (data: Buffer | string) => {
  const _data = data.toString();
  if (/command not found/.test(_data)) {
    console.log("Error: ", "Command Not Found: Please install `Hugo`");
  }
  showMessage(data.toString(), { status: 2 });
};

//#region Get Hugo Version
const parseVersion: ParseFn = (fn, showModal = true) => outputs =>
  fn(
    `Command: ${outputs[0]}\nVersion: ${
      outputs[1]
    }\nPlatform: ${getPlatformName()}`,
    { modal: showModal }
  );
export const getVersion = () => {
  const observer = executeHugo("version");
  observer.stdout.once("data", toStringArray(parseVersion(showMessage)));
  observer.stderr.once("data", onError);
  observer.stderr.once("error", onError);
};
//#endregion Get Hugo Version

//#region Create New Hugo Site Project
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
//#endregion Create New Hugo Site Project

//#region Add/Select -> Update Theme
const getAndUpdateTheme = async (gitUrl?: string) => {
  if (!gitUrl) {
    return;
  }
  const [get] = getConfig();
  const Config = get();
  const themesPath = resolve(WORKSPACE_FOLDER.get(), "themes");
  const configTomlPath = resolve(WORKSPACE_FOLDER.get(), Config.configPath);
  if (!existsSync(configTomlPath)) {
    showMessage("Current Workspace is not a HUGO Project", { status: 2 });
    return;
  }
  try {
    const matcher = gitUrl.match(
      /https:\/\/github.com\/[\w\d][\w\d-]*\/(?<name>[\w\d-]+)/
    );
    const projectName =
      matcher && matcher.groups ? matcher.groups.name : "active-theme";
    const downloadedFolder = resolve(themesPath, projectName);
    if (!existsSync(downloadedFolder)) {
      const downloaded = await downloadTheme(
        "temp_theme.hugo.zip",
        generateThemeUri(gitUrl)
      );
      if (downloaded) {
        await unzip(downloaded.path, themesPath);
        await deleteFile(downloaded.path);
        await renameFile(
          resolve(themesPath, downloaded.name),
          downloadedFolder
        );
        await replaceTomlConfig(configTomlPath, "theme", projectName);
        showMessage(`Active Theme: ${projectName}`);
      }
    } else {
      showMessage(`Theme: ${projectName}, Already Exists`);
    }
  } catch (e) {
    // NOOP;
    showMessage(e.message, { status: 2 });
  }
};

export const addTheme = async () => {
  let gitUrl;
  try {
    gitUrl = await getUserInput({
      prompt: `Enter theme repo name`,
      placeHolder: "https://github.com/theNewDynamic/gohugo-theme-ananke",
      defaultRes: "https://github.com/theNewDynamic/gohugo-theme-ananke",
    });
  } catch (_) {
    // NOOP
  }
  await getAndUpdateTheme(gitUrl);
};

export const selectTheme = async () => {
  let gitUrl;
  try {
    const items = await getHugoThemes();
    const pickerItems = items.map<QuickPickItem>(item => ({
      label: item.name,
      description: item.url,
    }));
    const selected = await window.showQuickPick(pickerItems, {
      canPickMany: false,
    });
    gitUrl = selected?.description;
  } catch (_) {
    // NOOP
  }
  await getAndUpdateTheme(gitUrl);
};
//#endregion Add/Select -> Update Theme

//#region Start/Stop Server Commands
const parseServerOutput: ParseFn = fn => outputs => {
  const [get] = getConfig();
  const Config = get();
  for (const line of outputs) {
    if (/Web Server is available at/i.test(line)) {
      return fn(`Server Running at http://localhost:${Config.port}/`);
    } else if (/error/i.test(line)) {
      return fn(`${line}`, { status: 2 });
    }
  }
  return Promise.resolve("");
};
export const startServer = async () => {
  const [get] = getConfig();
  const Config = get();
  if (CACHE.SERVER_PROC_ID) {
    stopServer(
      `Stopped already running server at http://localhost:${Config.port}/`,
      { status: 1 }
    );
  }
  CACHE.SERVER_PROC_ID = executeHugo(
    "server",
    "-D",
    `--config ${Config.configPath}`,
    `--port ${Config.port}`
  );
  CACHE.SERVER_PROC_ID.stdout.on(
    "data",
    toStringArray(parseServerOutput(showMessage), /\r?\n/)
  );
  CACHE.SERVER_PROC_ID.stderr.on("data", onError);
  CACHE.SERVER_PROC_ID.stderr.on("error", onError);
};

export const stopServer = async (
  msg?: string,
  options?: ShowMessageOptions
) => {
  if (!CACHE.SERVER_PROC_ID) {
    showMessage(`No Server Running`, { status: 1 });
    return;
  }

  if (CACHE.SERVER_PROC_ID.kill("SIGTERM")) {
    CACHE.SERVER_PROC_ID = null;
    await showMessage(msg || `Server Stopped: Success`, options);
  } else {
    showMessage(
      `Unable to Stop Server running at PID: ${CACHE.SERVER_PROC_ID.pid}`,
      { status: 2 }
    );
  }
};
//#endregion Start/Stop Server Commands

const parseContentOutput: ParseFn = fn => outputs => fn(outputs[0]);
export const createNewContent = async () => {
  let contentPath;
  try {
    contentPath = await getUserInput({
      prompt: `Enter content path`,
      placeHolder: "posts/index.md",
      defaultRes: "posts/index.md",
    });
  } catch (_) {
    // NOOP
  }

  if (!contentPath) {
    return;
  }

  const [get] = getConfig();
  const Config = get();

  const observer = executeHugo(
    "new",
    `--config ${Config.configPath}`,
    contentPath
  );
  observer.stdout.once(
    "data",
    toStringArray(parseContentOutput(showMessage), /\r?\n/)
  );
  observer.stderr.once("data", onError);
  observer.stderr.once("error", onError);
};
