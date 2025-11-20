/**
 * Welcome State
 *
 * Shows welcome screen, detects system info, and explains what will be installed.
 */

const logger = require('../utils/logger');
const system = require('../utils/system');
const prompt = require('../utils/prompt');
const config = require('../config');

module.exports = {
  name: 'welcome',

  async check(context) {
    // Welcome state always runs
    return { found: false, canSkip: false };
  },

  async run(context) {
    // Clear screen for clean start
    logger.clear();

    // Show welcome message in a box
    const welcomeMessage = `
Welcome to yoblox-setup!

This wizard will help you set up everything needed
to build Roblox games with AI assistance.

We'll install:
  • Roblox Studio
  • VS Code + Luau extensions
  • Rojo (for live code sync)
  • AI CLI (Claude or Gemini)

And then scaffold a new project using yoblox.

Estimated time: 15-30 minutes
`;

    logger.box(welcomeMessage, { borderColor: 'cyan' });

    // Detect and show system info
    const os = system.getOS();
    const shell = system.getShell();
    const nodeVersion = system.getNodeVersion();
    const arch = system.getArch();

    logger.info('System Information:');
    logger.list([
      `OS: ${os} (${arch})`,
      `Shell: ${shell}`,
      `Node.js: v${nodeVersion}`
    ]);

    logger.newline();

    // Check if Windows
    if (!system.isWindows()) {
      logger.warning('Note: This wizard is optimized for Windows.');
      logger.warning('Some features may not work correctly on other platforms.');
      logger.newline();

      const shouldContinue = await prompt.confirm('Continue anyway?', false);

      if (!shouldContinue) {
        logger.info('Setup cancelled.');
        return { success: false, retry: false };
      }
    }

    // Check if admin (Windows)
    if (system.isWindows() && !system.isAdmin()) {
      logger.warning('Not running as Administrator.');
      logger.info('Some installations may require elevated privileges.');
      logger.newline();
    }

    // Ask to continue
    logger.newline();
    const ready = await prompt.confirm('Ready to begin setup?', true);

    if (!ready) {
      logger.info('Setup cancelled. Run yoblox-setup again when ready.');
      return { success: false, retry: false };
    }

    // Store OS in context
    return {
      success: true,
      data: {
        os,
        shell,
        nodeVersion
      }
    };
  }
};
