import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { parseMarkdown, scanReference } from "@typeset-ai/core";
import type { ScanResult } from "@typeset-ai/core";

export const ingestCommand = new Command("ingest")
  .description("Ingest content from various sources into a ContentTree")
  .requiredOption("--source <type>", "Source type: markdown, reference")
  .requiredOption("--path <filepath>", "Path to the source file")
  .option("--output <filepath>", "Output path for the content tree JSON", "content.json")
  .action(async (options) => {
    const { source, path: filePath, output } = options;
    const absolutePath = resolve(process.cwd(), filePath);
    const outputPath = resolve(process.cwd(), output);

    if (source === "markdown") {
      const spinner = ora("Parsing markdown...").start();
      try {
        const markdown = readFileSync(absolutePath, "utf-8");
        const contentTree = parseMarkdown(markdown);
        mkdirSync(dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, JSON.stringify(contentTree, null, 2));
        spinner.succeed(
          chalk.green(`Content tree saved to ${output} (${contentTree.chapters.length} chapters, ${contentTree.assets.length} assets)`),
        );
      } catch (err) {
        spinner.fail(chalk.red(`Failed to parse: ${err}`));
        process.exit(1);
      }
    } else if (source === "reference") {
      const spinner = ora("Analyzing reference design with AI...").start();
      try {
        const result: ScanResult = await scanReference(absolutePath);
        const cssOutput = outputPath.replace(/\.json$/, ".css");
        writeFileSync(cssOutput, result.css);
        spinner.succeed(chalk.green(`Reference CSS saved to ${cssOutput}`));
        console.log(chalk.cyan("\nDesign Analysis:"));
        console.log(result.analysis);
      } catch (err) {
        spinner.fail(chalk.red(`Failed to analyze: ${err}`));
        process.exit(1);
      }
    } else {
      console.error(chalk.red(`Unknown source type: ${source}. Use: markdown, reference`));
      process.exit(1);
    }
  });
