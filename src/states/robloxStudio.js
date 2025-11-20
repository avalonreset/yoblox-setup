/**
 * Roblox Studio State
 *
 * Checks if Roblox Studio is installed, guides manual installation if needed.
 */

const logger = require('../utils/logger');
const validator = require('../utils/validator');
const installer = require('../utils/installer');
const prompt = require('../utils/prompt');
const config = require('../config');

module.exports = {
  name: 'robloxStudio',

  async check(context) {
    const result = await validator.checkRobloxStudio();
    return { found: result.found, canSkip: false };
  },

  async run(context) {
    logger.header('Roblox Studio', 1, 9);

    // Check if already installed
    const checkResult = await this.check(context);

    if (checkResult.found) {
      logger.success('✓ Roblox Studio is already installed');
      return {
        success: true,
        data: {
          installedTools: {
            ...context.installedTools,
            robloxStudio: true
          }
        }
      };
    }

    // Not found - guide installation
    logger.warning('Roblox Studio not found');
    logger.info('Roblox Studio must be installed manually.');
    logger.newline();

    const shouldInstall = await prompt.confirm('Open Roblox Studio download page?', true);

    if (!shouldInstall) {
      logger.warning('Skipping Roblox Studio installation.');
      logger.warning('You will need to install it manually later.');
      return { success: true, skip: true };
    }

    // Open download page
    logger.info('Opening Roblox Studio download page...');
    await installer.openURL(config.ROBLOX_STUDIO_URL);

    logger.newline();
    logger.info('Instructions:');
    logger.list([
      'Sign in to your Roblox account',
      'Click "Start Creating"',
      'Download and install Roblox Studio',
      'Complete the installation'
    ]);

    logger.newline();

    // Wait for user to complete installation
    await prompt.pressEnterToContinue('Press Enter after Roblox Studio is installed...');

    // Recheck
    logger.info('Checking for Roblox Studio...');
    const recheckResult = await validator.checkRobloxStudio();

    if (recheckResult.found) {
      logger.success('✓ Roblox Studio detected!');
      logger.info(`Found at: ${recheckResult.path}`);

      return {
        success: true,
        data: {
          installedTools: {
            ...context.installedTools,
            robloxStudio: true
          }
        }
      };
    } else {
      logger.error('✗ Roblox Studio still not found.');
      logger.warning('Make sure Roblox Studio is fully installed.');

      const retry = await prompt.confirm('Try checking again?', true);

      if (retry) {
        return { success: false, retry: true };
      } else {
        logger.warning('Continuing without Roblox Studio.');
        logger.info('You can install it later from: ' + config.ROBLOX_STUDIO_URL);
        return { success: true, skip: true };
      }
    }
  }
};
