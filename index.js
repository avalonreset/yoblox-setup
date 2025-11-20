#!/usr/bin/env node

/**
 * yoblox-setup - Main Entry Point
 *
 * This is the top-level entry point for the yoblox-setup wizard.
 * It handles CLI argument parsing, error handling, and delegates
 * to the CLI orchestrator.
 */

const cli = require('./src/cli');
const logger = require('./src/utils/logger');

// Global error handlers
process.on('SIGINT', async () => {
  logger.warning('\n\nSetup interrupted by user.');
  logger.info('Progress has been saved. Run yoblox-setup again to resume.');
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  logger.error('\nUnexpected error occurred:');
  console.error(error);
  logger.info('\nPlease report this issue at: https://github.com/avalonreset/yoblox-setup/issues');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('\nFatal error occurred:');
  console.error(error);
  logger.info('\nPlease report this issue at: https://github.com/avalonreset/yoblox-setup/issues');
  process.exit(1);
});

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  reset: args.includes('--reset') || args.includes('-r'),
  help: args.includes('--help') || args.includes('-h'),
  version: args.includes('--version') || args.includes('-v')
};

// Show help
if (options.help) {
  console.log(`
yoblox-setup - Interactive Setup Wizard for Roblox Development

Usage:
  yoblox-setup              Start the setup wizard
  yoblox-setup --reset      Start fresh (ignore saved progress)
  yoblox-setup --help       Show this help message
  yoblox-setup --version    Show version number

The wizard will guide you through installing:
  • Roblox Studio
  • VS Code with Luau extensions
  • Rust + Cargo
  • Rojo
  • AI CLI tools (Claude or Gemini)

And then scaffold a new project using yoblox.
  `);
  process.exit(0);
}

// Show version
if (options.version) {
  const pkg = require('./package.json');
  console.log(`yoblox-setup v${pkg.version}`);
  process.exit(0);
}

// Run the CLI
async function main() {
  try {
    await cli.run(options);
  } catch (error) {
    logger.error('\nSetup failed:');
    console.error(error.message);
    process.exit(1);
  }
}

main();
