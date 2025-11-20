/**
 * VS Code State
 *
 * Checks if VS Code is installed and accessible via 'code' command.
 */

const logger = require('../utils/logger');
const validator = require('../utils/validator');
const installer = require('../utils/installer');
const prompt = require('../utils/prompt');
const system = require('../utils/system');
const config = require('../config');

module.exports = {
  name: 'vscode',

  async check(context) {
    const result = await validator.checkVSCode();
    return { found: result.found, canSkip: false };
  },

  async run(context) {
    logger.header('VS Code', 2, 9);

    // Check if already installed
    const checkResult = await this.check(context);

    if (checkResult.found) {
      logger.success(`✓ VS Code is already installed (${checkResult.version})`);
      return {
        success: true,
        data: {
          installedTools: {
            ...context.installedTools,
            vscode: true
          }
        }
      };
    }

    // Not found
    logger.warning('VS Code not found or not added to PATH');
    logger.info('VS Code is required for Luau development.');
    logger.newline();

    const shouldInstall = await prompt.confirm('Open VS Code download page?', true);

    if (!shouldInstall) {
      logger.warning('Skipping VS Code installation.');
      return { success: true, skip: true };
    }

    // Open download page
    logger.info('Opening VS Code download page...');
    await installer.openURL(config.VSCODE_DOWNLOAD_URL);

    logger.newline();
    logger.info('Instructions:');

    if (system.isWindows()) {
      logger.list([
        'Download the User Installer (64-bit)',
        'Run the installer',
        'IMPORTANT: Check "Add to PATH" during installation',
        'Complete the installation',
        'Restart your terminal after installation'
      ]);
    } else {
      logger.list([
        'Download VS Code for your platform',
        'Install and ensure "code" command is in PATH',
        'Complete the installation'
      ]);
    }

    logger.newline();

    // Wait for user
    await prompt.pressEnterToContinue('Press Enter after VS Code is installed...');

    // Recheck
    logger.info('Checking for VS Code...');
    const recheckResult = await validator.checkVSCode();

    if (recheckResult.found) {
      logger.success(`✓ VS Code detected! (${recheckResult.version})`);

      return {
        success: true,
        data: {
          installedTools: {
            ...context.installedTools,
            vscode: true
          }
        }
      };
    } else {
      logger.error('✗ VS Code still not found in PATH.');

      if (system.isWindows()) {
        logger.warning('You may need to:');
        logger.list([
          'Restart this terminal (close and reopen)',
          'Reinstall VS Code and check "Add to PATH"',
          'Manually add VS Code to your PATH'
        ]);
      }

      logger.newline();

      const retry = await prompt.confirm('Try checking again?', true);

      if (retry) {
        return { success: false, retry: true };
      } else {
        logger.warning('Continuing without VS Code.');
        logger.info('Install manually from: ' + config.VSCODE_DOWNLOAD_URL);
        return { success: true, skip: true };
      }
    }
  }
};
