import { Command } from "commander";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import chalk from "chalk";
import { runPreflight } from "@typeset-ai/core";
import type { ContentTree } from "@typeset-ai/core";

export const preflightCommand = new Command("preflight")
  .description("Run print preflight checks on content and CSS")
  .requiredOption("--content <filepath>", "Path to content.json")
  .requiredOption("--css <filepath>", "Path to layout CSS file")
  .action((options) => {
    const { content: contentPath, css: cssPath } = options;
    try {
      const contentJson = readFileSync(resolve(process.cwd(), contentPath), "utf-8");
      const contentTree: ContentTree = JSON.parse(contentJson);
      const css = readFileSync(resolve(process.cwd(), cssPath), "utf-8");
      const result = runPreflight(contentTree, css);
      if (result.errors.length > 0) {
        console.log(chalk.red.bold(`\n  ${result.errors.length} Error(s):\n`));
        for (const error of result.errors) {
          console.log(chalk.red(`  [${error.code}] ${error.message}`));
          if (error.element) console.log(chalk.gray(`    File: ${error.element}`));
        }
      }
      if (result.warnings.length > 0) {
        console.log(chalk.yellow.bold(`\n  ${result.warnings.length} Warning(s):\n`));
        for (const warning of result.warnings) {
          console.log(chalk.yellow(`  [${warning.code}] ${warning.message}`));
          if (warning.element) console.log(chalk.gray(`    File: ${warning.element}`));
        }
      }
      if (result.isValid && result.warnings.length === 0) {
        console.log(chalk.green.bold("\n  All preflight checks passed.\n"));
      } else if (result.isValid) {
        console.log(chalk.yellow.bold("\n  Preflight passed with warnings. Review above.\n"));
      } else {
        console.log(chalk.red.bold("\n  Preflight FAILED. Fix errors above before printing.\n"));
        process.exit(1);
      }
    } catch (err) {
      console.error(chalk.red(`Failed to run preflight: ${err}`));
      process.exit(1);
    }
  });
