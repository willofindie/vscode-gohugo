import { window } from "vscode";
import { rmdir, writeFile } from "fs";
import fetch from "node-fetch";
import { platform, homedir } from "os";
import { spawn } from "child_process";
import { resolve } from "path";
import { promisify } from "util";
import Zipper from "adm-zip";

const asyncWriteFile = promisify(writeFile);
const asyncRmdir = promisify(rmdir);

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
export const showMessage: ShowFn = (data: string, modal = false) => {
  window.showInformationMessage(data, {
    modal,
  });
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

export const generateThemeUri = (repo: string) =>
  `https://github.com/theNewDynamic/${repo}/archive/master.zip`;
//
export const downloadTheme = async (
  filename: string,
  uri: string
): Promise<string> => {
  try {
    const filePath = resolve(homedir(), filename);
    const data = await fetch(uri, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }).then(res => {
      return res.buffer();
    });
    await asyncWriteFile(filePath, data);
    return filePath;
  } catch (e) {
    window.showErrorMessage(`Unable to download theme from: ${uri}`);
    return "";
  }
};

export const unzip = async (src: string, dest: string) =>
  new Promise(res => {
    const zipper = new Zipper(src);
    zipper.extractAllToAsync(dest, true, err => {
      if (err) {
        window.showErrorMessage(`Failed to extract contents: ${src}`);
      }
      (async () => {
        await asyncRmdir(src);
        res();
      })();
    });
  });

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
