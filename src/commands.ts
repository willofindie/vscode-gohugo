import { spawn } from "child_process";
import { window } from "vscode";

const EXECUTABLE = "hugo";

const onError = (data: Buffer) => {
  const _data = data.toString();
  if (/command not found/.test(_data)) {
    console.log("Error: ", "Command Not Found: Please install `Hugo`");
  }
  window.showErrorMessage(data.toString());
};

const onVersion = (data: Buffer) => {
  const groups = data.toString().split(" ");
  window.showInformationMessage(data.toString());
  console.log("Data: ", groups[1]);
};

export const getVersion = () => {
  const observer = spawn(EXECUTABLE, ["version"], { shell: true });
  observer.stdout.once("data", onVersion);
  observer.stderr.once("data", onError);
  observer.stderr.once("error", onError);
};
