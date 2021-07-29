import {
  EventEmitter,
  ProgressLocation,
  QuickPickItem,
  Uri,
  window,
  workspace,
} from "vscode";
import { resolve } from "path";
import {
  addColorsToDebugLevels,
  deleteFile,
  downloadTheme,
  executeHugo,
  generateThemeUri,
  getArchetypes,
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
import path from "path";

const onError = (data: Buffer | string) => {
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
  const matcher = gitUrl.match(
    /https:\/\/github.com\/[\w\d][\w\d-]*\/(?<name>[\w\d-]+)/
  );
  const projectName =
    matcher && matcher.groups ? matcher.groups.name : "active-theme";
  const downloadedFolder = resolve(themesPath, projectName);
  await window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: `Applying ${projectName} Theme`,
      cancellable: false,
    },
    async progress => {
      progress.report({
        increment: 0,
        message: `Downloading Theme: ${projectName}`,
      });
      if (!existsSync(downloadedFolder)) {
        const downloaded = await downloadTheme(
          "temp_theme.hugo.zip",
          generateThemeUri(gitUrl)
        );
        if (downloaded) {
          progress.report({
            increment: 75,
            message: `Unzipping Theme: ${projectName}`,
          });
          await unzip(downloaded.path, themesPath);
          progress.report({
            increment: 95,
            message: `Deleting temporary downloaded file`,
          });
          await deleteFile(downloaded.path);
          await renameFile(
            resolve(themesPath, downloaded.name),
            downloadedFolder
          );
          await replaceTomlConfig(configTomlPath, "theme", projectName);
        }
      } else {
        await replaceTomlConfig(configTomlPath, "theme", projectName);
      }
      progress.report({
        increment: 100,
        message: `Applied Theme: ${projectName}`,
      });
    }
  );
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
    const items = await window.withProgress(
      {
        location: ProgressLocation.Window,
        title: "Fetching Hugo Themes",
      },
      progress => {
        progress.report({ increment: 0 });
        return getHugoThemes();
      }
    );
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
  const writeEmitter = new EventEmitter<string>();
  const pty = {
    onDidWrite: writeEmitter.event,
    open: () => {
      // noop
    },
    handleInput: (data: string) => {
      if (Buffer.from(data)[0] === 3) {
        CACHE.TERMINAL?.dispose();
      }
    },
    close: () => {
      CACHE.SERVER_PROC_ID && stopServer();
    },
  };
  CACHE.TERMINAL = window.createTerminal({ name: "GoHugo Server", pty });
  CACHE.SERVER_PROC_ID = executeHugo(
    "server",
    "-D",
    `--config ${Config.configPath}`,
    `--port ${Config.port}`
  );
  CACHE.SERVER_PROC_ID.stdout.on(
    "data",
    toStringArray((outputs: string[]) => {
      outputs.forEach(output => {
        const _output = addColorsToDebugLevels(output);
        writeEmitter.fire(_output + "\r\n");
      });
      return parseServerOutput(showMessage)(outputs);
    }, /\r?\n/)
  );
  CACHE.SERVER_PROC_ID.stderr.on("data", onError);
  CACHE.SERVER_PROC_ID.stderr.on("error", err => onError(err.message));
  CACHE.SERVER_PROC_ID.on("close", code => {
    if (code !== 0) {
      CACHE.SERVER_PROC_ID?.kill("SIGTERM");
      CACHE.SERVER_PROC_ID = null;
    }
  });
  Config.showTerminal && CACHE.TERMINAL?.show();
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
    CACHE.TERMINAL?.dispose();
  } else {
    showMessage(
      `Unable to Stop Server running at PID: ${CACHE.SERVER_PROC_ID.pid}`,
      { status: 2 }
    );
  }
};
//#endregion Start/Stop Server Commands

const parseContentOutput: ParseFn = fn => outputs => fn(outputs[0]);
const DEFAULT_ARCHETYPE = { name: "[Default]", ext: "", isDir: false };
export const createNewContent = async () => {
  let contentPath;
  const templates = await getArchetypes();
  let templateFolder = DEFAULT_ARCHETYPE;
  if (templates.length > 0) {
    templates.unshift(DEFAULT_ARCHETYPE);
    templateFolder =
      (await window.showQuickPick(
        templates.map((template, index) => ({
          label: template.name,
          description: template.isDir ? "[DIR]" : "",
          picked: index === 0,
          ...template,
        })),
        {
          canPickMany: false,
        }
      )) || DEFAULT_ARCHETYPE;
  }
  const templatePath = /\[Default\]/.test(templateFolder.name)
    ? ""
    : `${templateFolder.name}/`;
  try {
    const arch = templatePath ? `[Archetype: ${templateFolder.name}] ` : "";
    contentPath = await getUserInput({
      prompt: `${arch}:::: Enter file/folder name: `,
      placeHolder: `default | default.md`,
      defaultRes: "default",
    });
  } catch (_) {
    // NOOP
  }

  if (!contentPath) {
    return;
  } else {
    const parsed = path.parse(contentPath);
    if (templateFolder.isDir) {
      contentPath = `${parsed.dir ? parsed.dir + "/" : ""}${parsed.name}`;
    } else {
      contentPath = !parsed.ext ? `${contentPath}.md` : contentPath;
      if (templatePath) {
        contentPath = `${templatePath}${contentPath}`;
      }
    }
  }

  const [get] = getConfig();
  const Config = get();

  const observer = executeHugo(
    "new",
    `--config ${Config.configPath}`,
    templateFolder.isDir ? `--kind ${templateFolder.name}` : "",
    contentPath
  );
  observer.stdout.once(
    "data",
    toStringArray(parseContentOutput(showMessage), /\r?\n/)
  );
  observer.stderr.once("data", onError);
  observer.stderr.once("error", onError);
};

//#region Prod Build
const parseBuildOutput = (outputs: string[]) => {
  const messages: string[] = [];
  for (const output of outputs) {
    const matched = output.match(
      /\s*(?<key>[\w\s-]*?)[\s\t]+\|[\s\t]+(?<value>\d+)/
    );
    if (matched && matched.groups) {
      messages.push(
        `${matched.groups.key.padEnd(18)}: ${matched.groups.value}`
      );
    }
  }
  return messages;
};
export const build = () => {
  const [get] = getConfig();
  const Config = get();
  const observer = executeHugo(`--config ${Config.configPath}`);
  let messages: string[] = ["Build Success:\n"];
  observer.stdout.on("data", (data: Buffer) => {
    const output = data.toString("utf8");
    const msgs = parseBuildOutput(output.split(/\r?\n/));
    messages = messages.concat(msgs);
  });
  observer.stderr.on("data", onError);
  observer.stderr.on("error", onError);
  observer.once("close", (code: number) => {
    setTimeout(() => {
      if (code === 0) {
        showMessage(messages.join("\n"), { modal: true });
      }
    }, 0);
  });
};
//#endregion Prod Build
