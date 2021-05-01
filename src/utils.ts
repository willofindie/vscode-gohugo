import { window } from "vscode";
import fs from "fs";
import path from "path";
import nodeFetch from "node-fetch";
import { platform, homedir } from "os";
import { spawn } from "child_process";
import { promisify } from "util";
import Zipper from "adm-zip";
import { CACHE, WORKSPACE_FOLDER } from "./constants";

const asyncReadFile = promisify(fs.readFile);
const asyncWriteFile = promisify(fs.writeFile);
const asyncAppendFile = promisify(fs.appendFile);
const asyncRmdir = promisify(fs.rmdir);
const asyncRemove = promisify(fs.unlink);
const asyncRename = promisify(fs.rename);
const asyncReaddir = promisify(fs.readdir);

type FetchFn = (
  url: string,
  options?: nodeFetch.RequestInit
) => Promise<nodeFetch.Response>;
const fetch: FetchFn = (url, options = {}) =>
  nodeFetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

const EXECUTABLE = "hugo";
export const executeHugo = (...args: string[]) => {
  return spawn(EXECUTABLE, args, {
    shell: true,
    cwd: WORKSPACE_FOLDER.get(),
    windowsHide: true,
  });
};

type ParseFn$1 = (outputs: string[]) => Promise<string> | string;
export type ParseFn = (fn: ShowFn, ...options: any[]) => ParseFn$1;
/**
 * This Method helps to split the stdout string into
 * string[], which later can be consumed by Composable
 * function passed as param.
 *
 * @param f Function to be composed
 * @param splitter Regex Pattern for string to be splitted
 */
export const toStringArray = (f: ParseFn$1, splitter = /\s+/) => (
  data: Buffer | string
) => f(data.toString("utf8").split(splitter));

export interface ShowMessageOptions {
  modal?: boolean;
  /**
   * Status:
   * - 0: means success
   * - 1: means warn
   * - 2: means error
   */
  status?: 0 | 1 | 2;
}
export type ShowFn = (
  message: string,

  options?: ShowMessageOptions
) => Promise<string>;
/**
 *  Show Info Popup or Modal
 *
 * @param data Message to display in Info Popupup
 * @param props options to be se
 */
export const showMessage: ShowFn = async (
  data: string,
  { modal = false, status = 0 } = {}
) => {
  switch (status) {
    case 1:
      return (
        (await window.showWarningMessage(data, {
          modal,
        })) || data
      );
    case 2:
      return (
        (await window.showErrorMessage(data, {
          modal,
        })) || data
      );
    default:
      return (
        (await window.showInformationMessage(data, {
          modal,
        })) || data
      );
  }
};

export const getPlatformName = () => {
  switch (platform()) {
    case "darwin":
      return "MacOS";
    case "win32":
      return "Windows";
    case "android":
      return "Android";
    default:
      return "Linux";
  }
};

type DownloadedData = {
  path: string;
  name: string;
};
export const generateThemeUri = (repo: string) => `${repo}/archive/master.zip`;

export const downloadTheme = async (
  filename: string,
  uri: string
): Promise<DownloadedData | null> => {
  try {
    const filePath = path.resolve(homedir(), filename);
    const data = await fetch(uri, {
      headers: { "Content-Type": "application/zip" },
    }).then(res => {
      const disposition = res.headers.get("content-disposition");
      const matched = disposition?.match(/filename=(\w[\w-]+)\.zip/);
      const name = matched ? matched[1] : "";
      return res.buffer().then(buffer => ({
        binary: Buffer.from(buffer),
        name,
      }));
    });
    await asyncWriteFile(filePath, data.binary);
    return {
      path: filePath,
      name: data.name,
    };
  } catch (e) {
    window.showErrorMessage(`Unable to download theme from: ${uri}`);
    return null;
  }
};

export const unzip = async (src: string, dest: string) =>
  new Promise<void>((res, rej) => {
    const zipper = new Zipper(src);
    zipper.extractAllToAsync(dest, true, err => {
      if (err) {
        window.showErrorMessage(`Failed to extract contents: ${src}`);
        rej(err);
      }
      res();
    });
  });

export const deleteFile = (filename: string) => asyncRemove(filename);
export const renameFile = async (src: string, dest: string) => {
  if (!fs.existsSync(dest)) {
    return await asyncRename(src, dest);
  } else {
    await asyncRmdir(dest, { recursive: true });
    return await asyncRename(src, dest);
  }
};

/**
 * This method will help replace a single lined key value pair in
 * Hugo Toml File, OR append a new Property=Value line to the file.
 * Since, there is no direct way of manipulating
 * TOML files as of now, I am going this way
 *
 * @param tomlPath Path to the Toml file we need to change
 * @param property Key or Property name to replace the value for
 * @param value new value that will replace the old one
 */
export const replaceTomlConfig = async (
  tomlPath: string,
  property: string,
  value: string
) => {
  const regex = new RegExp(`${property}\\s*=\\s*(.*)`, "g");
  const toml = await asyncReadFile(tomlPath, { encoding: "utf8" });
  const newData = `${property} = "${value}"`;
  // Following is not fullproof. It will make every value a string.
  // Anyways works in this case for now.
  if (toml.match(regex)) {
    await asyncWriteFile(tomlPath, toml.replace(regex, newData), {
      encoding: "utf8",
    });
  } else {
    await asyncAppendFile(tomlPath, newData, { encoding: "utf8" });
  }
};

/**
 * This Function will help fetch
 * and filter the list of all themes present
 * in hugoThemes Repo.
 *
 * Details for Github REST API:
 * https://docs.github.com/en/rest/reference/repos#get-repository-content
 */
export const getHugoThemes = async () => {
  if (CACHE.HUGO_THEMES.length > 0) {
    // Since PPL tend to close the Editor once in a while
    // Clearing Cache is not that imp as of now
    return CACHE.HUGO_THEMES;
  }
  const data = await fetch(
    "https://api.github.com/repos/gohugoio/hugoThemes/contents"
  ).then(
    res =>
      res.json() as Promise<
        {
          html_url: string;
          name: string;
          size: number;
          type: "file" | "dir";
        }[]
      >
  );
  CACHE.HUGO_THEMES = data
    .filter(item => item.type === "file" && item.size === 0 && item.html_url)
    .map(module => ({
      url: module.html_url.replace(/tree\/\b[0-9a-f]{5,40}\b/, ""),
      name: module.name,
    }));
  return CACHE.HUGO_THEMES;
};

export class CancelledError extends Error {
  name = "Cancelled";
}
type GetUserInputFn = (args: {
  prompt: string;
  placeHolder: string;
  defaultRes?: string;
}) => Promise<string>;
export const getUserInput: GetUserInputFn = async ({
  prompt,
  placeHolder,
  defaultRes = "",
}) =>
  await window.showInputBox({ prompt, placeHolder }).then(res => {
    if (res === undefined) {
      throw new CancelledError("Cancelled");
    }
    return res || defaultRes;
  });

//#region Following util helps to Setup Colors on VSCode terminal
export enum TermColors {
  BLACK = 0x00,
  BLUE = 0x01,
  GREEN = 0x02,
  YELLOW = 0x03,
  CYAN = 0x04,
  WHITE = 0x05,
  MAGENTA = 0x06,
  RED = 0x07,
}
export function colorText(text: string, color: TermColors): string {
  return `\x1b[3${color}m${text}\x1b[0m`;
}

export function addColorsToDebugLevels(text: string): string {
  return text.replace(/(warn)|(error)|(info)/gi, (...groups) => {
    if (groups[1]) {
      return colorText(groups[1], TermColors.YELLOW);
    } else if (groups[2]) {
      return colorText(groups[2], TermColors.RED);
    } else if (groups[3]) {
      return colorText(groups[3], TermColors.CYAN);
    }
    return groups[0];
  });
}
//#endregion

//#region Archetype Detector
/**
 * Following method helps to get all possible
 * Archetype templates.
 */
export const getArchetypes = async () => {
  // archetypes
  const folderPath = path.resolve(WORKSPACE_FOLDER.get(), "archetypes");
  let templates: {
    name: string;
    ext: string;
    isDir: boolean; // If not it's a file. Exclude anything else
  }[] = [];
  try {
    const dirents = await asyncReaddir(folderPath, { withFileTypes: true });
    templates = dirents
      .filter(dirent => dirent.isDirectory() || dirent.isFile())
      .map(dirent => {
        const parsed = path.parse(dirent.name);
        return {
          name: parsed.name,
          ext: parsed.ext,
          isDir: dirent.isDirectory(),
        };
      });
  } catch (e) {
    // Noop
  }
  return templates.filter(template => !/default/i.test(template.name));
};
//#endregion
