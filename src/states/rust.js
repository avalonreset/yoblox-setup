/**
 * Rust + Cargo State
 *
 * Checks for Rust and Cargo, guides rustup installation if needed.
 */

const logger = require('../utils/logger');
const validator = require('../utils/validator');
const installer = require('../utils/installer');
const prompt = require('../utils/prompt');
const versionChecker = require('../utils/versionChecker');
const system = require('../utils/system');
const config = require('../config');

module.exports = {
  name: 'rust',

  async check(context) {
    const result = await validator.checkRust();
    return { found: result.found, canSkip: false };
  },

  async run(context) {
    logger.header('Rust + Cargo', 4, 9);

    // Check if already installed
    const checkResult = await validator.checkRust();

    if (checkResult.found) {
      logger.success(`✓ Rust is already installed`);
      logger.newline();

      // Check for updates
      logger.info('Checking for updates...');
      const updateInfo = await versionChecker.checkRustUpdate();

      if (updateInfo.error) {
        logger.warning(`Could not check for updates: ${updateInfo.error}`);
        logger.info('Continuing with current version...');
      } else if (updateInfo.hasUpdate) {
        logger.newline();
        logger.warning('⚠️  A newer version of Rust is available!');
        logger.info(`  Current version: ${updateInfo.current}`);
        logger.info(`  Latest version: ${updateInfo.latest}`);
        logger.newline();

        const shouldUpdate = await prompt.confirm(
          `Would you like to update Rust to ${updateInfo.latest}?`,
          true
        );

        if (shouldUpdate) {
          logger.newline();
          logger.info('Updating Rust via rustup...');
          logger.info('This will take a few minutes...');
          logger.newline();

          // Run rustup update
          const updateResult = await installer.runCommand('rustup', ['update']);

          if (updateResult.success) {
            logger.newline();
            logger.success(`✓ Rust updated successfully!`);
            logger.newline();

            // Verify update
            const verifyResult = await validator.checkRust();
            if (verifyResult.found) {
              logger.info(`  rustc: ${verifyResult.rustc}`);
              logger.info(`  cargo: ${verifyResult.cargo}`);
            }
          } else {
            logger.error('Update failed. Continuing with current version...');
            logger.info('You can try updating manually with: rustup update');
          }
        } else {
          logger.info(`Continuing with Rust ${updateInfo.current}`);
        }
      } else {
        logger.success(`✓ Rust is up-to-date (v${updateInfo.current})`);
      }

      logger.newline();
      logger.divider();
      logger.newline();

      return {
        success: true,
        data: {
          installedTools: {
            ...context.installedTools,
            rust: true,
            cargo: true
          },
          rustVersion: updateInfo.current || checkResult.rustc
        }
      };
    }

    // Not found
    logger.info('Rust and Cargo are required to install Rojo.');
    logger.info('Rojo is the tool that syncs your code to Roblox Studio.');
    logger.newline();

    const shouldInstall = await prompt.confirm('Install Rust + Cargo?', true);

    if (!shouldInstall) {
      logger.error('Cannot continue without Rust and Cargo.');
      return { success: false, retry: false };
    }

    // Open rustup page
    logger.info('Opening Rustup installer page...');
    await installer.openURL(config.RUSTUP_URL);

    logger.newline();
    logger.info('Instructions:');

    if (system.isWindows()) {
      logger.list([
        'Download and run rustup-init.exe',
        'Follow the installer prompts (default options are fine)',
        'Wait for installation to complete (may take 5-10 minutes)',
        'The installer will add Rust to your PATH automatically',
        'You may need to restart your terminal after installation'
      ]);
    } else {
      logger.list([
        'Run the curl command shown on the page',
        'Follow the prompts',
        'Wait for installation to complete',
        'Restart your terminal after installation'
      ]);
    }

    logger.newline();
    logger.warning('This installation may take several minutes. Please be patient.');
    logger.newline();

    // Wait for user
    await prompt.pressEnterToContinue('Press Enter after Rust installation is complete...');

    // Recheck
    logger.info('Checking for Rust and Cargo...');
    const recheckResult = await validator.checkRust();

    if (recheckResult.found) {
      logger.success('✓ Rust and Cargo detected!');
      logger.info(`  rustc: ${recheckResult.rustc}`);
      logger.info(`  cargo: ${recheckResult.cargo}`);

      return {
        success: true,
        data: {
          installedTools: {
            ...context.installedTools,
            rust: true,
            cargo: true
          }
        }
      };
    } else {
      logger.error('✗ Rust and Cargo still not found.');
      logger.newline();
      logger.warning('Troubleshooting:');
      logger.list([
        'Make sure the installation completed successfully',
        'Restart your terminal (close and reopen)',
        'Check that Cargo is in your PATH',
        'On Windows, check: %USERPROFILE%\\.cargo\\bin'
      ]);

      logger.newline();

      const retry = await prompt.confirm('Try checking again?', true);

      if (retry) {
        return { success: false, retry: true };
      } else {
        logger.error('Cannot continue without Rust and Cargo.');
        logger.info('Please install manually from: ' + config.RUSTUP_URL);
        logger.info('Then run yoblox-setup again.');
        return { success: false, retry: false };
      }
    }
  }
};
