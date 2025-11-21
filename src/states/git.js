/**
 * Git State
 *
 * Optionally checks for and guides Git installation.
 */

const logger = require('../utils/logger');
const validator = require('../utils/validator');
const installer = require('../utils/installer');
const prompt = require('../utils/prompt');
const versionChecker = require('../utils/versionChecker');
const config = require('../config');

module.exports = {
  name: 'git',

  async check(context) {
    const result = await validator.checkGit();
    return { found: result.found, canSkip: true };
  },

  async run(context) {
    logger.header('Git (Optional)', 3, 9);

    // Check if already installed
    const checkResult = await validator.checkGit();

    if (checkResult.found) {
      logger.success(`✓ Git is already installed`);
      logger.newline();

      // Check for updates
      logger.info('Checking for updates...');
      const updateInfo = await versionChecker.checkGitUpdate();

      if (updateInfo.error) {
        logger.warning(`Could not check for updates: ${updateInfo.error}`);
        logger.info('Continuing with current version...');
      } else if (updateInfo.hasUpdate) {
        logger.newline();
        logger.warning('⚠️  A newer version of Git is available!');
        logger.info(`  Current version: ${updateInfo.current}`);
        logger.info(`  Latest version: ${updateInfo.latest}`);
        logger.newline();

        const shouldUpdate = await prompt.confirm(
          `Would you like to update Git to ${updateInfo.latest}?`,
          true
        );

        if (shouldUpdate) {
          logger.newline();
          logger.info('Opening Git download page...');
          logger.info('Download and install the latest version, then come back here.');
          logger.newline();

          await installer.openURL(config.GIT_DOWNLOAD_URL);

          logger.info('Instructions:');
          logger.list([
            'Download the installer for your platform',
            'Run the installer (default options are fine)',
            'Complete the installation',
            'Come back to this wizard'
          ]);
          logger.newline();

          await prompt.pressEnterToContinue('Press Enter after Git is updated...');

          // Verify update
          logger.info('Verifying Git update...');
          const verifyResult = await validator.checkGit();

          if (verifyResult.found) {
            const newUpdateInfo = await versionChecker.checkGitUpdate();
            if (!newUpdateInfo.hasUpdate) {
              logger.newline();
              logger.success(`✓ Git updated to ${newUpdateInfo.current}!`);
              logger.newline();
            } else {
              logger.warning('Update may not have completed. Continuing...');
            }
          }
        } else {
          logger.info(`Continuing with Git ${updateInfo.current}`);
        }
      } else {
        logger.success(`✓ Git is up-to-date (v${updateInfo.current})`);
      }

      logger.newline();
      logger.divider();
      logger.newline();

      return {
        success: true,
        data: {
          installedTools: {
            ...context.installedTools,
            git: true
          },
          gitVersion: updateInfo.current || checkResult.version
        }
      };
    }

    // Not found - ask if they want it
    logger.info('Git is not installed.');
    logger.info('Git is recommended for version control of your game code.');
    logger.newline();

    const wantsGit = await prompt.confirm('Do you want to install Git?', true);

    if (!wantsGit) {
      logger.info('Skipping Git installation.');
      return {
        success: true,
        data: {
          installedTools: {
            ...context.installedTools,
            git: false
          }
        }
      };
    }

    // User wants Git
    logger.info('Opening Git download page...');
    await installer.openURL(config.GIT_DOWNLOAD_URL);

    logger.newline();
    logger.info('Instructions:');
    logger.list([
      'Download the installer for your platform',
      'Run the installer (default options are fine)',
      'Complete the installation',
      'Restart your terminal after installation'
    ]);

    logger.newline();

    // Wait for user
    await prompt.pressEnterToContinue('Press Enter after Git is installed...');

    // Recheck
    logger.info('Checking for Git...');
    const recheckResult = await validator.checkGit();

    if (recheckResult.found) {
      logger.success(`✓ Git detected! (${recheckResult.version})`);

      return {
        success: true,
        data: {
          installedTools: {
            ...context.installedTools,
            git: true
          }
        }
      };
    } else {
      logger.error('✗ Git still not found.');
      logger.warning('You may need to restart your terminal.');

      const retry = await prompt.confirm('Try checking again?', true);

      if (retry) {
        return { success: false, retry: true };
      } else {
        logger.info('Continuing without Git.');
        logger.info('You can install it later from: ' + config.GIT_DOWNLOAD_URL);
        return {
          success: true,
          data: {
            installedTools: {
              ...context.installedTools,
              git: false
            }
          }
        };
      }
    }
  }
};
