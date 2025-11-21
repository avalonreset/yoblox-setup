/**
 * VS Code Extensions State
 *
 * Installs required VS Code extensions (Luau LSP, Rojo).
 */

const logger = require('../utils/logger');
const validator = require('../utils/validator');
const installer = require('../utils/installer');
const versionChecker = require('../utils/versionChecker');
const prompt = require('../utils/prompt');
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

    logger.info('Checking VS Code extensions for Luau development.');
    logger.newline();

    let allSucceeded = true;
    const installedExtensions = [];
    const extensionsWithUpdates = [];

    // Check each extension
    for (const extension of config.VSCODE_EXTENSIONS) {
      // Check if already installed
      const checkResult = await validator.checkVSCodeExtension(extension.id);

      if (checkResult.found) {
        logger.success(`✓ ${extension.name} is already installed`);
        installedExtensions.push(extension.id);

        // Check for updates
        logger.info(`  Checking for updates...`);
        const updateInfo = await versionChecker.checkVSCodeExtensionUpdate(extension.id);

        if (updateInfo.error) {
          logger.warning(`  Could not check for updates: ${updateInfo.error}`);
        } else if (updateInfo.hasUpdate) {
          logger.warning(`  ⚠️  Update available: ${updateInfo.current} → ${updateInfo.latest}`);
          extensionsWithUpdates.push({ extension, updateInfo });
        } else {
          logger.info(`  Up-to-date (v${updateInfo.current})`);
        }

        logger.newline();
        continue;
      }

      // Install extension
      logger.info(`Installing ${extension.name}...`);
      const success = await installer.installVSCodeExtension(extension.id);

      if (success) {
        installedExtensions.push(extension.id);
      } else {
        allSucceeded = false;
        logger.error(`Failed to install ${extension.name}`);
      }

      logger.newline();
    }

    // Offer to update extensions if any updates are available
    if (extensionsWithUpdates.length > 0) {
      logger.newline();
      logger.warning(`${extensionsWithUpdates.length} extension(s) have updates available:`);
      extensionsWithUpdates.forEach(({ extension, updateInfo }) => {
        logger.info(`  • ${extension.name}: ${updateInfo.current} → ${updateInfo.latest}`);
      });
      logger.newline();

      const shouldUpdateAll = await prompt.confirm(
        'Would you like to update all extensions now?',
        true
      );

      if (shouldUpdateAll) {
        logger.newline();
        logger.info('Updating extensions...');
        logger.newline();

        for (const { extension } of extensionsWithUpdates) {
          const success = await installer.installVSCodeExtension(extension.id);
          if (success) {
            logger.success(`✓ ${extension.name} updated!`);
          } else {
            logger.error(`Failed to update ${extension.name}`);
          }
        }

        logger.newline();
        logger.success('Extension updates complete!');
      } else {
        logger.info('Continuing with current versions.');
        logger.info('You can update extensions later from VS Code.');
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
