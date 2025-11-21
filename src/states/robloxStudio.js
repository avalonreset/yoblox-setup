/**
 * Roblox Studio State
 *
 * Checks if Roblox Studio is installed, guides manual installation if needed.
 */

const logger = require('../utils/logger');
const validator = require('../utils/validator');
const installer = require('../utils/installer');
const versionChecker = require('../utils/versionChecker');
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
    const checkResult = await validator.checkRobloxStudio();

    if (checkResult.found) {
      logger.success('✓ Roblox Studio is already installed');
      if (checkResult.path) {
        logger.info(`  Location: ${checkResult.path}`);
      }
      if (checkResult.version) {
        logger.info(`  Version: ${checkResult.version}`);
      }
      logger.newline();

      // Check Studio age
      logger.info('Checking Studio freshness...');
      const ageInfo = versionChecker.checkStudioUpdateByAge(checkResult.path);

      if (ageInfo.error) {
        logger.warning(`Could not check Studio age: ${ageInfo.error}`);
        logger.info('Continuing with current installation...');
      } else if (ageInfo.needsUpdate) {
        logger.newline();
        logger.warning('⚠️  Your Roblox Studio installation is outdated!');
        logger.info(`  Last updated: ${ageInfo.daysSinceModified} days ago`);
        logger.info(`  Recommended: Update every 14 days`);
        logger.newline();

        logger.info('Studio updates automatically when you launch it.');
        logger.info('However, very old versions may have trouble updating.');
        logger.newline();

        const shouldUpdate = await prompt.confirm(
          'Would you like to download and install the latest Studio now? (Recommended)',
          true
        );

        if (shouldUpdate) {
          logger.newline();
          logger.info('Downloading latest Roblox Studio installer...');
          logger.newline();

          const downloadSuccess = await installer.downloadAndInstallStudio();

          if (downloadSuccess) {
            logger.newline();
            logger.info('💡 Complete the Studio installation wizard.');
            logger.info('When finished, Studio will open automatically.');
            logger.newline();

            await prompt.pressEnterToContinue('Press Enter after Studio installation completes...');

            // Verify new installation
            logger.info('Verifying Studio installation...');
            const verifyResult = await validator.checkRobloxStudio();

            if (verifyResult.found) {
              const newAgeInfo = versionChecker.checkStudioUpdateByAge(verifyResult.path);
              if (!newAgeInfo.needsUpdate) {
                logger.newline();
                logger.success('✓ Studio is now up-to-date!');
                logger.newline();
              } else {
                logger.warning('Studio may still need updating. Check when you launch it.');
              }
            }
          } else {
            logger.warning('Download failed. Continuing with current Studio version.');
            logger.info('Studio will attempt to auto-update when you launch it.');
          }
        } else {
          logger.info(`Continuing with current Studio installation.`);
          logger.warning('Studio will attempt to auto-update when you launch it.');
          logger.warning('If you encounter update errors, come back and install fresh.');
        }
      } else {
        logger.success(`✓ Studio is fresh (${ageInfo.daysSinceModified} days old)`);
        logger.info('Studio updates automatically when launched.');
      }

      logger.newline();
      logger.divider();
      logger.newline();

      return {
        success: true,
        data: {
          installedTools: {
            ...context.installedTools,
            robloxStudio: true
          },
          studioPath: checkResult.path,
          studioAge: ageInfo.daysSinceModified
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
