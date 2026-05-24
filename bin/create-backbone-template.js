#!/usr/bin/env node

import { runCli } from "../src/create-backbone-template.js"

process.exitCode = await runCli()
