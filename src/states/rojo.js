/**
 * Rojo State
 *
 * Installs Rojo via Cargo.
 */

const logger = require('../utils/logger');
const validator = require('../utils/validator');
const installer = require('../utils/installer');
const prompt = require('../utils/prompt');

module.exports = {
  name: 'rojo',

  async check(context) {
    const result = await validator.checkRojo();
    return { found: result.found, canSkip: false };
  },

  async run(context) {
    logger.header('Rojo', 5, 9);

    // Check if already installed
    const checkResult = await this.check(context);

    if (checkResult.found) {
      logger.success(`✓ Rojo is already installed (${checkResult.version})`);
      return {
        success: true,
        data: {
          installedTools: {
            ...context.installedTools,
            rojo: true
          }
        }
      };
    }

    // Not installed - offer to install
    logger.info('Rojo syncs your code from VS Code to Roblox Studio in real-time.');
    logger.info('We can install it now using Cargo.');
    logger.newline();

    const shouldInstall = await prompt.confirm('Install Rojo via Cargo?', true);

    if (!shouldInstall) {
      logger.error('Cannot continue without Rojo.');
      return { success: false, retry: false };
    }

    // Install Rojo
    logger.newline();
    logger.warning('Installing Rojo. This will take 5-10 minutes...');
    logger.info('The build process is compiling from source. Please be patient.');
    logger.newline();

    const installSuccess = await installer.installRojo();

    if (!installSuccess) {
      logger.error('Failed to install Rojo.');
      logger.newline();
      logger.info('Common issues:');
      logger.list([
        'Network timeout (try again)',
        'Disk space insufficient',
        'Cargo not in PATH (restart terminal)',
        'Build dependencies missing'
      ]);

      logger.newline();

      const retry = await prompt.confirm('Try again?', true);

      if (retry) {
        return { success: false, retry: true };
      } else {
        logger.error('Cannot continue without Rojo.');
        logger.info('Try installing manually: cargo install rojo');
        return { success: false, retry: false };
      }
    }

    // Verify installation
    logger.info('Verifying Rojo installation...');
    const verifyResult = await validator.checkRojo();

    if (verifyResult.found) {
      logger.success(`✓ Rojo installed successfully! (${verifyResult.version})`);

      return {
        success: true,
        data: {
          installedTools: {
            ...context.installedTools,
            rojo: true
          }
        }
      };
    } else {
      logger.error('✗ Rojo installed but not found in PATH.');
      logger.warning('You may need to restart your terminal.');

      const retry = await prompt.confirm('Try checking again?', true);

      if (retry) {
        return { success: false, retry: true };
      } else {
        logger.error('Cannot continue without Rojo in PATH.');
        return { success: false, retry: false };
      }
    }
  }
};
