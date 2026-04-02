#!/usr/bin/env node

import { Command } from "commander";
import { ingestCommand } from "./commands/ingest.js";
import { layoutCommand } from "./commands/layout.js";
import { renderCommand } from "./commands/render.js";
import { preflightCommand } from "./commands/preflight.js";
import { exportIdmlCommand } from "./commands/export-idml.js";

const program = new Command();

program
  .name("typeset")
  .description("AI-powered typesetting CLI for book design and print production")
  .version("0.1.0");

program.addCommand(ingestCommand);
program.addCommand(layoutCommand);
program.addCommand(renderCommand);
program.addCommand(preflightCommand);
program.addCommand(exportIdmlCommand);

program.parse();
