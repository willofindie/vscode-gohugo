import { commands, ExtensionContext, workspace } from "vscode";
import * as COMMANDS from "./commands";
import packageJSON from "../package.json";
import { CACHE, getConfig, WORKSPACE_FOLDER } from "./constants";

const setup = () => {
  const [, update] = getConfig();
  update();
};

export function activate(context: ExtensionContext) {
  setup();
  const commandNames = packageJSON.contributes.commands;
  let i = 0;
  context.subscriptions.push(
    commands.registerCommand(commandNames[i++].command, COMMANDS.getVersion),
    commands.registerCommand(commandNames[i++].command, COMMANDS.createNewSite),
    commands.registerCommand(commandNames[i++].command, COMMANDS.addTheme),
    commands.registerCommand(commandNames[i++].command, COMMANDS.selectTheme),
    commands.registerCommand(commandNames[i++].command, COMMANDS.startServer),
    commands.registerCommand(commandNames[i++].command, COMMANDS.stopServer)
  );

  context.subscriptions.push(
    workspace.onDidChangeWorkspaceFolders(e => {
      let folderPath;
      console.log(e.added);
      if (e.added) {
        folderPath = e.added[0].uri.path;
      }
      WORKSPACE_FOLDER.set(folderPath);
      setup();
    })
  );
}

export function deactivate() {
  if (CACHE.SERVER_PROC_ID) {
    COMMANDS.stopServer();
  }
}
