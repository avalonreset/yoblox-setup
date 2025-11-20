/**
 * VS Code Extensions State
 *
 * Installs required VS Code extensions (Luau LSP, Rojo).
 */

const logger = require('../utils/logger');
const validator = require('../utils/validator');
const installer = require('../utils/installer');
const config = require('../config');

module.exports = {
  name: 'vscodeExtensions',

  async check(context) {
    // Check if VS Code is installed
    if (!context.installedTools?.vscode) {
      return { found: false, canSkip: true };
    }

    // Check if all extensions are installed
    const results = await Promise.all(
      config.VSCODE_EXTENSIONS.map(ext => validator.checkVSCodeExtension(ext.id))
    );

    const allInstalled = results.every(r => r.found);

    return { found: allInstalled, canSkip: false };
  },

  async run(context) {
    logger.header('VS Code Extensions', 6, 9);

    // Skip if VS Code not installed
    if (!context.installedTools?.vscode) {
      logger.warning('VS Code not installed. Skipping extensions.');
      return { success: true, skip: true };
    }

    logger.info('Installing required VS Code extensions for Luau development.');
    logger.newline();

    let allSucceeded = true;
    const installedExtensions = [];

    // Install each extension
    for (const extension of config.VSCODE_EXTENSIONS) {
      // Check if already installed
      const checkResult = await validator.checkVSCodeExtension(extension.id);

      if (checkResult.found) {
        logger.success(`✓ ${extension.name} is already installed`);
        installedExtensions.push(extension.id);
        continue;
      }

      // Install extension
      const success = await installer.installVSCodeExtension(extension.id);

      if (success) {
        installedExtensions.push(extension.id);
      } else {
        allSucceeded = false;
        logger.error(`Failed to install ${extension.name}`);
      }
    }

    logger.newline();

    if (allSucceeded) {
      logger.success('✓ All VS Code extensions installed successfully!');

      return {
        success: true,
        data: {
          installedTools: {
            ...context.installedTools,
            vscodeExtensions: installedExtensions
          }
        }
      };
    } else {
      logger.warning('Some extensions failed to install.');
      logger.info('You can install them manually later from VS Code:');
      config.VSCODE_EXTENSIONS.forEach(ext => {
        if (!installedExtensions.includes(ext.id)) {
          logger.list([`${ext.name}: ${ext.id}`]);
        }
      });

      // Continue anyway
      return {
        success: true,
        data: {
          installedTools: {
            ...context.installedTools,
            vscodeExtensions: installedExtensions
          }
        }
      };
    }
  }
};
