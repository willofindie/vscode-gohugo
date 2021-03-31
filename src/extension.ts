import { commands, ExtensionContext } from "vscode";
import * as COMMANDS from "./commands";
import packageJSON from "../package.json";

export function activate(context: ExtensionContext) {
  const commandNames = packageJSON.contributes.commands;
  context.subscriptions.push(
    commands.registerCommand(commandNames[0].command, COMMANDS.getVersion)
  );
}
