import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { buildHtml, exportSvg } from "@typeset-ai/core";
import type { ContentTree } from "@typeset-ai/core";

export const exportSvgCommand = new Command("export-svg")
  .description("Export content + layout as per-page SVG files for Illustrator")
  .requiredOption("--content <filepath>", "Path to content.json")
  .requiredOption("--css <filepath>", "Path to layout CSS file")
  .option("--output-dir <dirpath>", "Output directory for SVG files", "svg-output")
  .option("--embed-images", "Embed images as base64 instead of linking", false)
  .action(async (options) => {
    const {
      content: contentPath,
      css: cssPath,
      outputDir,
      embedImages,
    } = options;
    const spinner = ora("Generating SVG pages...").start();

    try {
      const contentJson = readFileSync(resolve(process.cwd(), contentPath), "utf-8");
      const contentTree: ContentTree = JSON.parse(contentJson);
      const css = readFileSync(resolve(process.cwd(), cssPath), "utf-8");

      const html = buildHtml(contentTree, css);
      const svgPages = await exportSvg(html, {
        embedImages: Boolean(embedImages),
        preserveText: true,
      });

      const outputPath = resolve(process.cwd(), outputDir);
      mkdirSync(outputPath, { recursive: true });

      for (let i = 0; i < svgPages.length; i++) {
        const pageNumber = String(i + 1).padStart(3, "0");
        const filename = `page-${pageNumber}.svg`;
        writeFileSync(join(outputPath, filename), svgPages[i]);
      }

      spinner.succeed(
        chalk.green(`${svgPages.length} SVG page(s) saved to ${outputDir}/`),
      );
    } catch (err) {
      spinner.fail(chalk.red(`Failed to export SVG: ${err}`));
      process.exit(1);
    }
  });
