import { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import chalk from "chalk";
import ora from "ora";
import {
  createChatSession,
  sendChatMessage,
  undoLastChange,
  redoLastChange,
} from "@typeset-ai/core";
import type { ContentTree, ChatSession } from "@typeset-ai/core";

const CHAT_HELP = `
${chalk.bold("Chat Commands:")}
  ${chalk.cyan("/undo")}        Undo the last CSS change
  ${chalk.cyan("/redo")}        Redo the last undone change
  ${chalk.cyan("/diff")}        Show the last CSS diff
  ${chalk.cyan("/css")}         Print the current CSS
  ${chalk.cyan("/save <path>")} Save current CSS to file
  ${chalk.cyan("/ref <path>")}  Attach a reference image to your next message
  ${chalk.cyan("/help")}        Show this help
  ${chalk.cyan("/quit")}        Exit the chat
`;

function printDiff(patch: string): void {
  for (const line of patch.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      console.log(chalk.green(line));
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      console.log(chalk.red(line));
    } else if (line.startsWith("@@")) {
      console.log(chalk.cyan(line));
    } else {
      console.log(chalk.gray(line));
    }
  }
}

export const chatCommand = new Command("chat")
  .description("Start an interactive AI chat session for layout refinement")
  .requiredOption("--content <filepath>", "Path to content.json")
  .requiredOption("--css <filepath>", "Path to initial layout CSS file")
  .action(async (options) => {
    const { content: contentPath, css: cssPath } = options;

    let contentTree: ContentTree;
    let initialCss: string;

    try {
      const contentJson = readFileSync(resolve(process.cwd(), contentPath), "utf-8");
      contentTree = JSON.parse(contentJson);
      initialCss = readFileSync(resolve(process.cwd(), cssPath), "utf-8");
    } catch (err) {
      console.error(chalk.red(`Failed to load files: ${err}`));
      process.exit(1);
    }

    const session: ChatSession = createChatSession(contentTree, initialCss);
    let pendingImagePath: string | undefined;

    console.log(chalk.bold.blue("\n  TypeSet AI Chat\n"));
    console.log(chalk.gray("  Refine your layout with natural language."));
    console.log(chalk.gray(`  Book: "${contentTree.metadata.title}" by ${contentTree.metadata.author}`));
    console.log(chalk.gray(`  Type /help for commands.\n`));

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan("you > "),
    });

    rl.prompt();

    rl.on("line", async (line) => {
      const input = line.trim();

      if (!input) {
        rl.prompt();
        return;
      }

      if (input === "/quit" || input === "/exit") {
        console.log(chalk.gray("\n  Goodbye.\n"));
        rl.close();
        return;
      }

      if (input === "/help") {
        console.log(CHAT_HELP);
        rl.prompt();
        return;
      }

      if (input === "/css") {
        console.log(chalk.gray("\n--- Current CSS ---"));
        console.log(session.currentCss);
        console.log(chalk.gray("--- End CSS ---\n"));
        rl.prompt();
        return;
      }

      if (input === "/undo") {
        const didUndo = undoLastChange(session);
        if (didUndo) {
          console.log(chalk.yellow("  Undone. CSS reverted to previous state."));
        } else {
          console.log(chalk.gray("  Nothing to undo."));
        }
        rl.prompt();
        return;
      }

      if (input === "/redo") {
        const didRedo = redoLastChange(session);
        if (didRedo) {
          console.log(chalk.yellow("  Redone. CSS restored."));
        } else {
          console.log(chalk.gray("  Nothing to redo."));
        }
        rl.prompt();
        return;
      }

      if (input.startsWith("/save ")) {
        const savePath = input.slice(6).trim();
        if (!savePath) {
          console.log(chalk.red("  Usage: /save <filepath>"));
        } else {
          try {
            writeFileSync(resolve(process.cwd(), savePath), session.currentCss);
            console.log(chalk.green(`  CSS saved to ${savePath}`));
          } catch (err) {
            console.log(chalk.red(`  Failed to save: ${err}`));
          }
        }
        rl.prompt();
        return;
      }

      if (input.startsWith("/ref ")) {
        const refPath = input.slice(5).trim();
        pendingImagePath = resolve(process.cwd(), refPath);
        console.log(chalk.gray(`  Reference image attached: ${refPath}`));
        console.log(chalk.gray("  It will be included with your next message."));
        rl.prompt();
        return;
      }

      if (input === "/diff") {
        if (session.history.length === 0) {
          console.log(chalk.gray("  No changes yet."));
        } else {
          console.log(chalk.gray("\n  (Last change diff not stored in session — send a message to see diffs)\n"));
        }
        rl.prompt();
        return;
      }

      const spinner = ora("  AI is thinking...").start();

      try {
        const response = await sendChatMessage(session, input, pendingImagePath);
        pendingImagePath = undefined;
        spinner.stop();

        console.log(chalk.bold.magenta("\n  AI > ") + response.message + "\n");

        if (response.isApplied && response.diff.patch) {
          console.log(chalk.gray("  --- CSS Diff ---"));
          printDiff(response.diff.patch);
          console.log(chalk.gray("  --- End Diff ---\n"));
          console.log(chalk.green("  CSS updated. Use /undo to revert, /save <path> to export.\n"));
        }
      } catch (err) {
        spinner.fail(chalk.red(`  Error: ${err}`));
      }

      rl.prompt();
    });

    rl.on("close", () => {
      process.exit(0);
    });
  });
