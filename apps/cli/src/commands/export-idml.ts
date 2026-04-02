import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { buildHtml, exportIdml } from "@typeset-ai/core";
import type { ContentTree } from "@typeset-ai/core";

export const exportIdmlCommand = new Command("export-idml")
  .description("Export content + layout as an InDesign IDML package")
  .requiredOption("--content <filepath>", "Path to content.json")
  .requiredOption("--css <filepath>", "Path to layout CSS file")
  .option("--output <filepath>", "Output IDML file path", "output.idml")
  .action(async (options) => {
    const { content: contentPath, css: cssPath, output } = options;
    const spinner = ora("Generating IDML package...").start();

    try {
      const contentJson = readFileSync(resolve(process.cwd(), contentPath), "utf-8");
      const contentTree: ContentTree = JSON.parse(contentJson);
      const css = readFileSync(resolve(process.cwd(), cssPath), "utf-8");

      const idmlBuffer = await exportIdml(contentTree, css);

      const outputPath = resolve(process.cwd(), output);
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, idmlBuffer);

      const sizeMb = (idmlBuffer.length / 1024 / 1024).toFixed(2);
      spinner.succeed(
        chalk.green(`IDML package saved to ${output} (${sizeMb} MB, ${contentTree.chapters.length} chapters)`),
      );
    } catch (err) {
      spinner.fail(chalk.red(`Failed to export IDML: ${err}`));
      process.exit(1);
    }
  });
