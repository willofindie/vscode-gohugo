import { commands, ExtensionContext, workspace } from "vscode";
import * as COMMANDS from "./commands";
import packageJSON from "../package.json";
import { WORKSPACE_FOLDER } from "./constants";

export function activate(context: ExtensionContext) {
  const commandNames = packageJSON.contributes.commands;
  let i = 0;
  context.subscriptions.push(
    commands.registerCommand(commandNames[i++].command, COMMANDS.getVersion),
    commands.registerCommand(commandNames[i++].command, COMMANDS.createNewSite),
    commands.registerCommand(commandNames[i++].command, COMMANDS.addTheme)
  );

  context.subscriptions.push(
    workspace.onDidChangeWorkspaceFolders(e => {
      let folderPath;
      console.log(e.added);
      if (e.added) {
        folderPath = e.added[0].uri.path;
      }
      WORKSPACE_FOLDER.set(folderPath);
    })
  );
}
