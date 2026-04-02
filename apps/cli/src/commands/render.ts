import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { buildHtml, renderPdf } from "@typeset-ai/core";
import type { ContentTree, RenderOptions } from "@typeset-ai/core";

export const renderCommand = new Command("render")
  .description("Render content + layout into PDF")
  .requiredOption("--content <filepath>", "Path to content.json")
  .requiredOption("--css <filepath>", "Path to layout CSS file")
  .option("--format <format>", "Output format: pdf, pdf-proof", "pdf")
  .option("--output <filepath>", "Output file path", "output.pdf")
  .action(async (options) => {
    const { content: contentPath, css: cssPath, format, output } = options;
    const spinner = ora(`Rendering ${format}...`).start();
    try {
      const contentJson = readFileSync(resolve(process.cwd(), contentPath), "utf-8");
      const contentTree: ContentTree = JSON.parse(contentJson);
      const css = readFileSync(resolve(process.cwd(), cssPath), "utf-8");
      const html = buildHtml(contentTree, css);
      const renderOptions: RenderOptions = {
        format: format as "pdf" | "pdf-proof",
        outputPath: resolve(process.cwd(), output),
        colorProfile: format === "pdf-proof" ? "rgb" : "cmyk",
        includeBleed: format !== "pdf-proof",
        includeCropMarks: format !== "pdf-proof",
      };
      const pdfBuffer = await renderPdf(html, renderOptions);
      mkdirSync(dirname(renderOptions.outputPath), { recursive: true });
      writeFileSync(renderOptions.outputPath, pdfBuffer);
      const sizeMb = (pdfBuffer.length / 1024 / 1024).toFixed(2);
      spinner.succeed(chalk.green(`${format.toUpperCase()} saved to ${output} (${sizeMb} MB)`));
    } catch (err) {
      spinner.fail(chalk.red(`Failed to render: ${err}`));
      process.exit(1);
    }
  });
