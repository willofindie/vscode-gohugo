import { window } from "vscode";
import fs from "fs";
import nodeFetch from "node-fetch";
import { platform, homedir } from "os";
import { spawn } from "child_process";
import { resolve } from "path";
import { promisify } from "util";
import Zipper from "adm-zip";
import { CACHE } from "./constants";

const asyncReadFile = promisify(fs.readFile);
const asyncWriteFile = promisify(fs.writeFile);
const asyncAppendFile = promisify(fs.appendFile);
const asyncRmdir = promisify(fs.rmdir);
const asyncRemove = promisify(fs.unlink);
const asyncRename = promisify(fs.rename);
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
  return spawn(EXECUTABLE, args, { shell: true });
};

export type ParseFn = (
  fn: ShowFn,
  ...options: any[]
) => (outputs: string[]) => string;
type ParseFn$1 = (outputs: string[]) => string;
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
) => f(data.toString().split(splitter));

export type ShowFn = (message: string, ...options: any[]) => string;
/**
 *  Show Info Popup or Modal
 *
 * @param data Message to display in Info Popupup
 * @param modal Boolean to make Popup display as Modal.
 */
export const showMessage: ShowFn = (
  data: string,
  { modal = false, error = false } = {}
) => {
  if (!error) {
    window.showInformationMessage(data, {
      modal,
    });
  } else {
    window.showErrorMessage(data, {
      modal,
    });
  }
  return data;
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
    const filePath = resolve(homedir(), filename);
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
  new Promise((res, rej) => {
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
