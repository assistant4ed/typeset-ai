import { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { generateLayout } from "@typeset-ai/core";
import type { ContentTree, BookType, LayoutOptions } from "@typeset-ai/core";

const VALID_BOOK_TYPES: BookType[] = [
  "novel", "coffee-table", "children-book", "textbook",
  "catalog", "corporate-report", "magazine",
];

export const layoutCommand = new Command("layout")
  .description("Generate AI-powered CSS layout for content")
  .requiredOption("--content <filepath>", "Path to content.json")
  .requiredOption("--type <booktype>", `Book type: ${VALID_BOOK_TYPES.join(", ")}`)
  .option("--page-size <size>", "Page size (e.g., 'A4', '129mm 198mm')", "A4")
  .option("--reference <filepath>", "Path to reference image for style matching")
  .option("--output <filepath>", "Output CSS file path", "layout.css")
  .action(async (options) => {
    const { content: contentPath, type: bookType, pageSize, reference, output } = options;
    if (!VALID_BOOK_TYPES.includes(bookType as BookType)) {
      console.error(chalk.red(`Invalid book type: ${bookType}. Valid types: ${VALID_BOOK_TYPES.join(", ")}`));
      process.exit(1);
    }
    const spinner = ora("Generating layout with AI...").start();
    try {
      const contentJson = readFileSync(resolve(process.cwd(), contentPath), "utf-8");
      const contentTree: ContentTree = JSON.parse(contentJson);
      const layoutOptions: LayoutOptions = {
        bookType: bookType as BookType,
        pageSize,
        referenceImagePath: reference ? resolve(process.cwd(), reference) : undefined,
      };
      const css = await generateLayout(contentTree, layoutOptions);
      const outputPath = resolve(process.cwd(), output);
      writeFileSync(outputPath, css);
      spinner.succeed(chalk.green(`Layout CSS saved to ${output} (${bookType}, ${pageSize})`));
    } catch (err) {
      spinner.fail(chalk.red(`Failed to generate layout: ${err}`));
      process.exit(1);
    }
  });
