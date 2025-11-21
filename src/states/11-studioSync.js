/**
 * Studio Sync State
 *
 * Launches Roblox Studio and guides the user through installing
 * the Rojo plugin and connecting it to the running Rojo server.
 */

const logger = require('../utils/logger');
const validator = require('../utils/validator');
const installer = require('../utils/installer');
const prompt = require('../utils/prompt');
const system = require('../utils/system');
const os = require('os');

// Rojo plugin information
const ROJO_PLUGIN_URL = 'https://www.roblox.com/library/13916111004/Rojo';
const ROJO_PLUGIN_NAME = 'Rojo 7.x';

module.exports = {
  name: 'studioSync',
  order: 11,

  async check(context) {
    // Check if Studio sync already configured
    if (context.studioConnected) {
      return { found: true, canSkip: true };
    }
    return { found: false, canSkip: false };
  },

  async verify(context) {
    // User confirmation is the verification for this state
    if (context.studioConnected) {
      return { verified: true, issues: [] };
    }
    return { verified: false, issues: ['Studio not connected to Rojo'] };
  },

  async cleanup(context) {
    // No cleanup needed - Studio stays open
  },

  async run(context) {
    logger.header('Connect Roblox Studio', 11, 13);

    logger.info('Now we will set up Roblox Studio to sync with your project.');
    logger.info('This involves installing the Rojo plugin and connecting it to the server.');
    logger.newline();

    // Verify Studio is installed
    const studioCheck = await validator.checkRobloxStudio();
    if (!studioCheck.found) {
      logger.error('Roblox Studio is not installed!');
      logger.warning('Please complete the Studio installation step first.');
      return { success: false, retry: false };
    }

    // Verify Rojo server is running
    if (!context.rojoPort || !context.rojoRunning) {
      logger.error('Rojo server is not running!');
      logger.warning('Please complete the Rojo server step first.');
      return { success: false, retry: false };
    }

    logger.success('✓ Roblox Studio is installed');
    if (studioCheck.version) {
      logger.info(`  Version: ${studioCheck.version}`);
    }
    if (studioCheck.allVersions && studioCheck.allVersions > 1) {
      logger.info(`  Found ${studioCheck.allVersions} Studio versions - using most recent`);
    }
    logger.success(`✓ Rojo server is running on port ${context.rojoPort}`);
    logger.newline();

    logger.divider();
    logger.newline();

    // Step 1: Launch Roblox Studio
    logger.info('STEP 1: Launch Roblox Studio');
    logger.newline();

    logger.info('We will now open Roblox Studio for you.');
    logger.info('If Studio is already open, that\'s fine - just continue.');
    logger.newline();

    const shouldLaunch = await prompt.confirm('Launch Roblox Studio now?', true);

    if (shouldLaunch) {
      try {
        logger.info('Launching Roblox Studio...');

        if (os.platform() === 'win32') {
          // Windows: Launch the actual RobloxStudioBeta.exe
          if (studioCheck.path) {
            // Use the detected Studio path
            logger.info(`Found Studio at: ${studioCheck.path}`);
            await installer.execCommand(`start "" "${studioCheck.path}"`);
            logger.success('✓ Studio launched successfully');
          } else {
            // Fallback: try URI scheme
            logger.info('Trying URI scheme fallback...');
            await installer.execCommand('start roblox-studio:');
            logger.success('✓ Studio launch command sent');
          }
        } else if (os.platform() === 'darwin') {
          // macOS: Use open command
          await installer.execCommand('open -a "Roblox Studio"');
          logger.success('✓ Studio launch command sent');
        } else {
          logger.warning('Auto-launch not supported on this platform.');
          logger.info('Please open Roblox Studio manually.');
        }

        logger.newline();

        // Give Studio time to start
        logger.info('Waiting for Studio to start...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        logger.newline();
      } catch (error) {
        logger.warning(`Could not auto-launch Studio: ${error.message}`);
        logger.info('Please open Roblox Studio manually and continue.');
        logger.newline();
      }
    } else {
      logger.info('Please open Roblox Studio manually and continue when ready.');
      logger.newline();
    }

    await prompt.confirm('Press Enter when Studio is open...', true);
    logger.newline();

    logger.divider();
    logger.newline();

    // Step 2: Install Rojo Plugin
    logger.info('STEP 2: Install Rojo Plugin');
    logger.newline();

    logger.info('You need the Rojo plugin to sync code from VS Code to Studio.');
    logger.info('We will open the plugin page in your browser.');
    logger.newline();

    const shouldOpenPlugin = await prompt.confirm('Open Rojo plugin page?', true);

    if (shouldOpenPlugin) {
      logger.info('Opening Rojo plugin page...');
      await installer.openURL(ROJO_PLUGIN_URL);
      logger.success('✓ Plugin page opened in browser');
      logger.newline();
    }

    logger.info('In the browser:');
    logger.list([
      'Click the green "Install" button',
      'This will install the plugin in Roblox Studio'
    ]);
    logger.newline();

    logger.warning('NOTE: You may need to be logged into Roblox in your browser.');
    logger.newline();

    await prompt.confirm('Press Enter when plugin is installed...', true);
    logger.newline();

    logger.divider();
    logger.newline();

    // Step 3: Open Rojo Plugin in Studio
    logger.info('STEP 3: Open Rojo Plugin in Studio');
    logger.newline();

    logger.info('Now in Roblox Studio:');
    logger.list([
      'Look for the "Rojo" button in the toolbar at the top',
      'Click the Rojo button to open the plugin panel',
      'You should see the Rojo sync panel appear'
    ]);
    logger.newline();

    logger.info('If you don\'t see the Rojo button:');
    logger.list([
      'Go to the PLUGINS tab',
      'Look for "Rojo" in the plugins list',
      'Click it to open the sync panel'
    ]);
    logger.newline();

    await prompt.confirm('Press Enter when Rojo panel is open...', true);
    logger.newline();

    logger.divider();
    logger.newline();

    // Step 4: Connect to Rojo Server
    logger.info('STEP 4: Connect to Rojo Server');
    logger.newline();

    logger.info('In the Rojo plugin panel:');
    logger.list([
      `Enter this address: localhost:${context.rojoPort}`,
      'Click the "Connect" button',
      'You should see "Connected" with a green indicator'
    ]);
    logger.newline();

    logger.info('If it says "Connected", you will also see:');
    logger.list([
      `Project name: ${context.projectName || 'your project'}`,
      'Sync status: Ready',
      'Green checkmark indicator'
    ]);
    logger.newline();

    logger.warning('IMPORTANT: Keep the Rojo panel open! It must stay connected for syncing to work.');
    logger.newline();

    // Verification
    logger.info('Let\'s verify the connection...');
    logger.newline();

    const connected = await prompt.confirm(
      'Do you see "Connected" with a green indicator in the Rojo panel?',
      true
    );

    if (!connected) {
      logger.newline();
      logger.error('Connection not established.');
      logger.newline();

      logger.info('Troubleshooting:');
      logger.list([
        `Make sure you entered: localhost:${context.rojoPort}`,
        'Check that the Rojo server is still running',
        'Try closing and reopening the Rojo panel',
        'Make sure no firewall is blocking the connection'
      ]);
      logger.newline();

      const retry = await prompt.confirm('Try the connection steps again?', true);
      return { success: false, retry };
    }

    // Success!
    logger.newline();
    logger.divider();
    logger.newline();

    logger.success('✓ Studio connected to Rojo server!');
    logger.newline();

    logger.info('Your setup:');
    logger.info(`  • Studio: Open and running`);
    logger.info(`  • Rojo plugin: Installed`);
    logger.info(`  • Connection: localhost:${context.rojoPort}`);
    logger.info(`  • Status: Connected and ready to sync`);
    logger.newline();

    logger.info('What happens now:');
    logger.list([
      'Any changes you make in VS Code will instantly sync to Studio',
      'You\'ll see the changes appear in the Explorer panel',
      'Keep the Rojo panel connected while developing',
      'You can disconnect and reconnect anytime'
    ]);
    logger.newline();

    logger.divider();
    logger.newline();

    return {
      success: true,
      data: {
        studioConnected: true,
        studioLaunched: true,
        rojoPluginInstalled: true
      }
    };
  }
};
