/**
 * Studio Sync State
 *
 * Launches Roblox Studio and guides the user through installing
 * the Rojo plugin and connecting it to the running Rojo server.
 *
 * This state is extremely user-friendly and handles all common errors.
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
    logger.info('This is a guided process - we will walk you through each step carefully.');
    logger.newline();

    // Verify prerequisites
    const studioCheck = await validator.checkRobloxStudio();
    if (!studioCheck.found) {
      logger.error('Roblox Studio is not installed!');
      logger.warning('Please complete the Studio installation step first.');
      return { success: false, retry: false };
    }

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

    // STEP 1: Launch Studio
    const studioLaunched = await launchStudio(studioCheck);
    if (!studioLaunched) {
      return { success: false, retry: true };
    }

    logger.divider();
    logger.newline();

    // STEP 2: Install Rojo Plugin
    const pluginInstalled = await installRojoPlugin();
    if (!pluginInstalled) {
      return { success: false, retry: true };
    }

    logger.divider();
    logger.newline();

    // STEP 3: Open Rojo Panel
    const panelOpened = await openRojoPanel();
    if (!panelOpened) {
      return { success: false, retry: true };
    }

    logger.divider();
    logger.newline();

    // STEP 4: Connect to Server
    const connected = await connectToServer(context);
    if (!connected) {
      return { success: false, retry: true };
    }

    // Success!
    logger.newline();
    logger.divider();
    logger.newline();

    logger.success('🎉 Studio successfully connected to Rojo server! 🎉');
    logger.newline();

    logger.info('Your setup:');
    logger.info(`  • Studio: Open and running`);
    logger.info(`  • Rojo plugin: Installed and active`);
    logger.info(`  • Connection: localhost:${context.rojoPort}`);
    logger.info(`  • Status: Connected and ready to sync`);
    logger.newline();

    logger.info('What happens now:');
    logger.list([
      'Any changes you make in VS Code will instantly sync to Studio',
      'You\'ll see the changes appear in the Explorer panel in real-time',
      'Keep the Rojo panel connected while developing',
      'You can disconnect and reconnect anytime by clicking the Rojo button'
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

/**
 * STEP 1: Launch Roblox Studio
 */
async function launchStudio(studioCheck) {
  logger.info('STEP 1 of 4: Launch Roblox Studio');
  logger.newline();

  logger.info('We need to open Roblox Studio to continue.');
  logger.info('If Studio is already open, that\'s perfectly fine!');
  logger.newline();

  // Check if Studio version is very old (might have update issues)
  const fs = require('fs');
  let studioIsVeryOld = false;

  if (studioCheck.path) {
    try {
      const stats = fs.statSync(studioCheck.path);
      const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
      studioIsVeryOld = daysSinceModified > 30; // More than 30 days old
    } catch (error) {
      // Ignore errors, just proceed
    }
  }

  // If Studio is very old, recommend fresh install instead
  if (studioIsVeryOld) {
    logger.warning('⚠️  DETECTED: Your Studio installation is over 30 days old');
    logger.newline();
    logger.info('Old Studio versions often fail to update properly.');
    logger.info('We recommend installing a fresh copy instead of trying to update.');
    logger.newline();

    const useFreshInstall = await prompt.confirm(
      'Would you like to install the latest Studio now? (Recommended)',
      true
    );

    logger.newline();

    if (useFreshInstall) {
      logger.info('Perfect! Let\'s automatically download and install the latest Studio.');
      logger.newline();

      logger.info('What will happen:');
      logger.list([
        '1. We\'ll download the Studio installer (about 2-3 MB)',
        '2. The installer will open automatically',
        '3. Follow the installation wizard (takes 1-2 minutes)',
        '4. Studio will open when installation is complete',
        '5. Come back here to continue the wizard'
      ]);
      logger.newline();

      logger.info('Benefits of fresh installation:');
      logger.list([
        '✓ Gets the absolute latest Studio version',
        '✓ Avoids all update failures and errors',
        '✓ Total time: 3-5 minutes',
        '✓ 100% reliable - no network errors'
      ]);
      logger.newline();

      logger.info('💡 TIP: The installer will update your existing Studio.');
      logger.info('You don\'t need to uninstall the old version first!');
      logger.newline();

      const confirmDownload = await prompt.confirm('Ready to download and install Studio?', true);
      logger.newline();

      if (confirmDownload) {
        // Auto-download and launch installer
        const downloadSuccess = await installer.downloadAndInstallStudio();

        if (downloadSuccess) {
          logger.info('The Studio installer is now running.');
          logger.info('Follow the installation wizard, then come back here.');
          logger.newline();
          await prompt.confirm('Press Enter when Studio is installed and open...', true);
          logger.newline();
          logger.success('✓ Excellent! You now have the latest Studio version.');
          logger.newline();
          return true;
        } else {
          // Download failed, fall back to manual
          logger.warning('Auto-download failed. Opening browser instead...');
          logger.newline();
          await installer.openURL('https://www.roblox.com/create');
          logger.info('Please download and install Studio manually, then come back here.');
          logger.newline();
          await prompt.confirm('Press Enter when Studio is installed and open...', true);
          logger.newline();
          return true;
        }
      } else {
        logger.info('Opening roblox.com/create in your browser instead...');
        await installer.openURL('https://www.roblox.com/create');
        logger.newline();
        logger.info('Download and install Studio manually, then come back here.');
        logger.newline();
        await prompt.confirm('Press Enter when Studio is installed and open...', true);
        logger.newline();
        return true;
      }
    } else {
      logger.warning('Okay, we\'ll try launching the old version.');
      logger.info('If you get errors, we recommend installing the latest Studio instead.');
      logger.newline();
    }
  }

  // Check for common Studio issues
  logger.warning('⚠️  IMPORTANT: About Studio Updates');
  logger.newline();
  logger.info('If Studio shows an error about "expired build" or "failed to download":');
  logger.list([
    '❌ DON\'T wait for the auto-update - it often fails with old versions',
    '✓ INSTEAD: Close the error and come back here',
    '✓ We\'ll help you install the latest Studio properly'
  ]);
  logger.newline();

  logger.info('The auto-update system is unreliable for old Studio versions.');
  logger.info('Fresh installation is faster and more reliable!');
  logger.newline();

  const shouldLaunch = await prompt.confirm('Ready to launch Roblox Studio?', true);
  logger.newline();

  if (shouldLaunch) {
    try {
      logger.info('Launching Roblox Studio...');

      if (os.platform() === 'win32') {
        if (studioCheck.path) {
          logger.info(`Found Studio at: ${studioCheck.path}`);
          logger.newline();

          // Use spawn to launch Studio without waiting for it to exit
          const { spawn } = require('child_process');
          spawn('cmd.exe', ['/c', 'start', '', studioCheck.path], {
            detached: true,
            stdio: 'ignore'
          }).unref();

          logger.success('✓ Studio launch command sent');
        } else {
          logger.info('Trying alternative launch method...');

          // Use spawn for protocol handler too
          const { spawn } = require('child_process');
          spawn('cmd.exe', ['/c', 'start', 'roblox-studio:'], {
            detached: true,
            stdio: 'ignore'
          }).unref();

          logger.success('✓ Studio launch command sent');
        }
      } else if (os.platform() === 'darwin') {
        // macOS - use spawn with detached
        const { spawn } = require('child_process');
        spawn('open', ['-a', 'Roblox Studio'], {
          detached: true,
          stdio: 'ignore'
        }).unref();

        logger.success('✓ Studio launch command sent');
      } else {
        logger.warning('Auto-launch not supported on this platform.');
        logger.info('Please open Roblox Studio manually from your applications.');
      }

      logger.newline();
      logger.info('Waiting for Studio to start...');
      logger.info('(This may take 10-30 seconds)');
      await new Promise(resolve => setTimeout(resolve, 8000));
      logger.newline();

    } catch (error) {
      logger.warning(`Could not auto-launch Studio: ${error.message}`);
      logger.newline();
      logger.info('No problem! Please open Roblox Studio manually:');
      logger.list([
        'Press the Windows key or open Start menu',
        'Type "Roblox Studio"',
        'Click on Roblox Studio to open it',
        'Wait for it to fully load'
      ]);
      logger.newline();
    }
  } else {
    logger.info('Please open Roblox Studio manually and continue when ready.');
    logger.newline();
  }

  // Auto-detect Studio and verify user is logged in
  logger.success('✓ Studio should be launching now!');
  logger.info('Checking if Studio is running...');
  logger.newline();

  // Try to auto-detect Studio for up to 15 seconds
  const maxDetectTime = 15000; // 15 seconds
  const startTime = Date.now();
  let studioDetected = false;

  while (Date.now() - startTime < maxDetectTime && !studioDetected) {
    if (system.isStudioRunning()) {
      studioDetected = true;
      logger.success('✓ Studio process detected!');
      logger.newline();
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
  }

  if (studioDetected) {
    logger.success('✓✓✓ Roblox Studio is running!');
    logger.newline();

    // Check if user is logged in
    logger.info('Checking login status...');
    const loginCheck = await validator.checkStudioLoggedIn();

    if (loginCheck.loggedIn && loginCheck.confidence === 'high') {
      logger.success(`✓ Login detected! (${loginCheck.reason})`);
      logger.newline();
      logger.info('Studio is ready. Continuing to next step...');
      logger.newline();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Brief pause
      return true;
    } else if (loginCheck.loggedIn && loginCheck.confidence === 'medium') {
      logger.warning(`⚠️  Login status uncertain: ${loginCheck.reason}`);
      logger.newline();
      logger.info('Studio is running, but we need to confirm you\'re logged in.');
      // Fall through to manual confirmation
    } else {
      logger.warning('⚠️  No login detected');
      logger.newline();
      logger.info('Studio is running, but you may need to log in.');
      logger.newline();
      logger.info('📋 Make sure you:');
      logger.list([
        'See the Studio home screen (not a login prompt)',
        'Are logged into your Roblox account',
        'Can see "Create", "Recent", etc. in Studio'
      ]);
      logger.newline();
      // Fall through to manual confirmation
    }
  }

  // Manual confirmation with clear criteria
  if (!studioDetected) {
    logger.warning('Could not auto-detect Studio.');
    logger.newline();
  }

  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('  ⏸️  MANUAL CONFIRMATION REQUIRED');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.newline();

  logger.info('Before we continue, verify Studio is FULLY READY:');
  logger.newline();
  logger.info('✅ Required checks:');
  logger.list([
    '✓ Studio window is open on your screen',
    '✓ You are LOGGED IN to your Roblox account',
    '✓ You see the Studio home screen (not a login/error screen)',
    '✓ You can see tabs like "Create", "Recent Games", etc.',
    '✓ No error popups or loading screens'
  ]);
  logger.newline();

  logger.warning('🚫 Do NOT continue if:');
  logger.list([
    'You see a login screen',
    'Studio is showing an error',
    'Studio is still loading/updating',
    'You\'re not logged in yet'
  ]);
  logger.newline();

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const studioOpen = await prompt.confirm('✅ Studio is open AND you are logged in?', true);

    if (studioOpen) {
      logger.newline();
      logger.success('✓ Studio is open and ready!');
      logger.newline();
      return true;
    }

    // Studio not open - provide help
    attempts++;
    logger.newline();

    if (attempts >= maxAttempts) {
      logger.error('Studio doesn\'t seem to be opening properly.');
      logger.newline();
      logger.info('Let\'s troubleshoot this:');
      logger.newline();

      const issue = await prompt.select('What happened when you tried to open Studio?', [
        { name: 'error', message: 'I got an error message' },
        { name: 'updating', message: 'It\'s updating/downloading something' },
        { name: 'nothing', message: 'Nothing happened at all' },
        { name: 'crash', message: 'It opened then closed/crashed' },
        { name: 'other', message: 'Something else' }
      ]);

      logger.newline();

      switch (issue) {
        case 'error':
          logger.info('Let\'s figure out which error you got:');
          logger.newline();

          const errorType = await prompt.select('Which error message did you see?', [
            { name: 'expired', message: 'Expired channel build' },
            { name: 'download', message: 'Failed to download / Network error / Forbidden' },
            { name: 'missing', message: 'Missing files / Corrupt installation' },
            { name: 'antivirus', message: 'Antivirus or security warning' },
            { name: 'other', message: 'Different error / Not sure' }
          ]);

          logger.newline();

          switch (errorType) {
            case 'expired':
              logger.info('✓ This is normal! Studio needs to update.');
              logger.list([
                '1. Click "OK" on the error',
                '2. Studio will start downloading the update',
                '3. You\'ll see a progress bar saying "Getting the latest Roblox..."',
                '4. Wait 1-3 minutes for the download',
                '5. Studio will reopen automatically when done',
                '6. Come back here and we\'ll continue'
              ]);
              logger.newline();
              logger.info('💡 TIP: Don\'t close this wizard - just wait for Studio to update!');
              break;

            case 'download':
              logger.error('Studio can\'t download the update!');
              logger.newline();
              logger.warning('💡 RECOMMENDED SOLUTION: Install fresh Studio automatically');
              logger.newline();
              logger.info('The auto-update system is failing. Let\'s download and install the latest Studio:');
              logger.list([
                '✓ We\'ll download the installer automatically (2-3 MB)',
                '✓ The installer will launch automatically',
                '✓ Follow the wizard (takes 1-2 minutes)',
                '✓ Avoids all update errors - 100% reliable'
              ]);
              logger.newline();

              const tryAutoDownload = await prompt.confirm(
                'Auto-download and install the latest Studio now?',
                true
              );

              logger.newline();

              if (tryAutoDownload) {
                logger.info('Starting automatic download...');
                logger.newline();

                const downloadSuccess = await installer.downloadAndInstallStudio();

                if (downloadSuccess) {
                  logger.info('Perfect! The installer is running.');
                  logger.info('Follow the installation wizard, then come back here.');
                  logger.newline();
                  await prompt.confirm('Press Enter when Studio is installed and open...', true);
                  logger.newline();
                  logger.success('✓ Excellent! You now have the latest Studio!');
                  logger.newline();
                  // Reset attempts to give them another chance
                  attempts = 0;
                  continue;
                } else {
                  logger.warning('Auto-download failed. Trying browser fallback...');
                  logger.newline();
                  await installer.openURL('https://www.roblox.com/create');
                  logger.info('Download manually from the page that opened, then come back here.');
                  logger.newline();
                  await prompt.confirm('Press Enter when Studio is installed and open...', true);
                  logger.newline();
                  attempts = 0;
                  continue;
                }
              }

              logger.newline();
              logger.info('Alternative fixes if you want to troubleshoot the update:');
              logger.list([
                '• Check your internet connection',
                '• Disable VPN if you\'re using one',
                '• Turn off firewall/antivirus temporarily',
                '• Try a different network (mobile hotspot)',
                '• Your network might be blocking Roblox\'s servers'
              ]);
              logger.newline();
              logger.warning('Note: Fresh install is faster and more reliable than troubleshooting!');
              break;

            case 'missing':
              logger.info('Studio installation might be corrupted.');
              logger.list([
                '1. Close all Roblox and Studio windows',
                '2. Go to roblox.com/create in your browser',
                '3. Download the Studio installer',
                '4. Run the installer (it will reinstall/repair)',
                '5. Once done, come back and run this wizard again'
              ]);
              break;

            case 'antivirus':
              logger.info('Your security software is blocking Studio.');
              logger.list([
                '1. Open your antivirus/security software',
                '2. Add RobloxStudioBeta.exe to exclusions/whitelist',
                '3. Allow Studio to access the internet',
                '4. Try launching Studio again',
                '5. If still blocked: Temporarily disable antivirus and try again'
              ]);
              break;

            default:
              logger.info('General error troubleshooting:');
              logger.list([
                'Take a screenshot of the error message',
                'Try restarting your computer',
                'Reinstall Studio from roblox.com/create',
                'Check if Windows/your OS needs updates',
                'Google the exact error message for specific fixes'
              ]);
          }
          break;

        case 'updating':
          logger.info('✓ Great! Studio is updating - this is completely normal.');
          logger.newline();
          logger.info('Here\'s what\'s happening:');
          logger.list([
            'Studio is downloading the latest version from Roblox servers',
            'You should see a progress bar: "Getting the latest Roblox..."',
            'The download is usually 50-200 MB',
            'It takes 1-5 minutes depending on your internet speed',
            'Studio will automatically close and reopen when done'
          ]);
          logger.newline();
          logger.warning('⚠️  IMPORTANT: Keep this wizard open!');
          logger.info('Don\'t close this window - we\'ll continue once Studio finishes updating.');
          logger.newline();

          const waitForUpdate = await prompt.confirm(
            'Is Studio still downloading? (Say No when it reopens)',
            true
          );

          logger.newline();

          if (waitForUpdate) {
            logger.info('Okay, let\'s wait together...');
            logger.newline();
            logger.info('💡 What to watch for:');
            logger.list([
              'Progress bar moving forward',
              'Percentage increasing (0% → 100%)',
              'Download speed shown (KB/s or MB/s)',
              'Studio window closing when download finishes',
              'Studio reopening with a fresh window'
            ]);
            logger.newline();
            logger.info('If the download fails with an error:');
            logger.list([
              'Click OK on any error',
              'Come back here and say No to try troubleshooting',
              'We\'ll help you fix the network/firewall issue'
            ]);
            logger.newline();

            // Wait a bit to let them watch
            logger.info('Take your time - I\'ll wait here.');
            logger.info('Press Enter when Studio has finished updating and reopened...');
            await prompt.confirm('', true);
            logger.newline();
            logger.success('✓ Great! Studio should now be updated and ready.');
          } else {
            logger.success('✓ Perfect! Studio has finished updating.');
          }
          logger.newline();
          break;

        case 'nothing':
          logger.info('If nothing happened:');
          logger.list([
            'Open Start menu and search for "Roblox Studio"',
            'Try right-clicking and "Run as administrator"',
            'Check Task Manager - Studio might be running in background',
            'Try reinstalling Studio from roblox.com/create'
          ]);
          break;

        case 'crash':
          logger.info('If Studio keeps crashing:');
          logger.list([
            'Update your graphics drivers',
            'Reinstall Studio from roblox.com/create',
            'Check if antivirus is blocking it',
            'Make sure Windows is up to date'
          ]);
          break;

        default:
          logger.info('General troubleshooting:');
          logger.list([
            'Make sure you\'re logged into Roblox in your browser',
            'Try restarting your computer',
            'Reinstall Studio from roblox.com/create',
            'Check roblox.com to make sure servers are up'
          ]);
      }

      logger.newline();
      const tryAgain = await prompt.confirm('Ready to try again?', true);
      if (!tryAgain) {
        logger.warning('Okay, we\'ll stop here. Fix the issue and run the wizard again.');
        return false;
      }

      attempts = 0; // Reset attempts after troubleshooting
      logger.newline();
      logger.info('Let\'s try again...');
      logger.newline();
    } else {
      logger.warning('Studio not open yet.');
      logger.info('Take your time - make sure Studio is fully loaded before continuing.');
      logger.newline();
    }
  }

  return false;
}

/**
 * STEP 2: Install Rojo Plugin
 */
async function installRojoPlugin() {
  logger.info('STEP 2 of 4: Install Rojo Plugin');
  logger.newline();

  logger.info('The Rojo plugin is what allows Studio to sync with your code.');
  logger.info('We need to install it from the Roblox plugin marketplace.');
  logger.newline();

  // Check browser login status first
  logger.warning('⚠️  CRITICAL: You must be logged into Roblox in your browser!');
  logger.newline();
  logger.info('Without logging in, you cannot install the plugin.');
  logger.newline();

  const isLoggedIn = await prompt.confirm('Are you currently logged into Roblox in your browser?', false);
  logger.newline();

  if (!isLoggedIn) {
    logger.info('No problem! Let\'s get you logged in now.');
    logger.newline();
    logger.info('Opening Roblox login page...');
    await installer.openURL('https://www.roblox.com/login');
    logger.success('✓ Login page opened in your browser');
    logger.newline();

    logger.info('📋 Follow these steps in your browser:');
    logger.newline();
    logger.list([
      '1. You should see the Roblox login page',
      '2. Enter your Roblox USERNAME (not email) and PASSWORD',
      '3. Click "Log In"',
      '4. Complete any security verification if prompted',
      '5. Wait until you see your Roblox home page'
    ]);
    logger.newline();

    logger.info('💡 Don\'t have a Roblox account yet?');
    logger.list([
      '• Click "Sign Up" on the login page',
      '• Create a FREE account (takes 2 minutes)',
      '• Verify your email',
      '• Then come back here'
    ]);
    logger.newline();

    logger.warning('⏸️  Please complete the login process before continuing.');
    logger.info('Take your time - this wizard will wait for you.');
    logger.newline();

    await prompt.confirm('Press Enter once you are logged into Roblox...', true);
    logger.newline();
    logger.success('✓ Great! You should now be logged in.');
    logger.newline();
  } else {
    logger.success('✓ Perfect! You\'re already logged in.');
    logger.newline();
  }

  const shouldOpen = await prompt.confirm('Ready to open the Rojo plugin page?', true);
  logger.newline();

  if (shouldOpen) {
    logger.info('Opening Rojo plugin page in your browser...');
    await installer.openURL(ROJO_PLUGIN_URL);
    logger.success('✓ Plugin page opened');
    logger.newline();
  } else {
    logger.info(`You can open it manually: ${ROJO_PLUGIN_URL}`);
    logger.newline();
  }

  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('  📋 PLUGIN INSTALLATION STEPS');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.newline();

  logger.info('In your browser (the page that just opened):');
  logger.newline();
  logger.info('Step 1: Verify you\'re on the right page');
  logger.list([
    '✓ Page title should say "Rojo" or "Rojo 7.x"',
    '✓ URL should be roblox.com/library/...',
    '✓ You should see plugin details and screenshots'
  ]);
  logger.newline();

  logger.info('Step 2: Find and click the Install button');
  logger.list([
    '✓ Look for a green "Get" or "Install" button',
    '✓ It\'s usually in the top-right area of the page',
    '✓ Click the button ONCE (don\'t spam click)'
  ]);
  logger.newline();
  logger.info('💡 LOOK FOR THIS:');
  logger.info('   ┌─────────────────┐');
  logger.info('   │  [Get Plugin]   │  ← Click this button');
  logger.info('   └─────────────────┘');
  logger.newline();

  logger.info('Step 3: Wait for confirmation');
  logger.list([
    '✓ Button should change to "Installing..." or show a checkmark',
    '✓ You might see "Successfully installed" message',
    '✓ Installation takes only a few seconds',
    '✓ The plugin will appear in Studio automatically'
  ]);
  logger.newline();

  logger.success('That\'s it! The plugin is now installed to your Studio account.');
  logger.info('You don\'t need to restart Studio - the plugin is ready to use!');
  logger.newline();

  logger.info('💡 Troubleshooting tips:');
  logger.list([
    'If you see "Log In": Click it and log into your Roblox account',
    'If no Install button: You might already have it installed! That\'s okay.',
    'If it says "Error": Try refreshing the page and clicking Install again',
    'If page won\'t load: Check your internet connection'
  ]);
  logger.newline();

  // Verification
  const installed = await prompt.confirm(
    'Did you successfully install the plugin (or is it already installed)?',
    true
  );

  logger.newline();

  if (!installed) {
    logger.error('Plugin not installed.');
    logger.newline();
    logger.info('Let\'s troubleshoot:');
    logger.newline();

    const issue = await prompt.select('What went wrong?', [
      { name: 'notloggedin', message: 'I\'m not logged into Roblox' },
      { name: 'nobutton', message: 'I don\'t see an Install button' },
      { name: 'error', message: 'I got an error when installing' },
      { name: 'pagenotload', message: 'The page didn\'t open/load' },
      { name: 'other', message: 'Something else' }
    ]);

    logger.newline();

    switch (issue) {
      case 'notloggedin':
        logger.info('Let\'s get you logged in right now!');
        logger.newline();
        logger.info('Opening Roblox login page...');
        await installer.openURL('https://www.roblox.com/login');
        logger.success('✓ Login page opened');
        logger.newline();

        logger.info('📋 In your browser:');
        logger.list([
          '1. Enter your Roblox USERNAME and PASSWORD',
          '2. Click "Log In"',
          '3. Complete any security verification',
          '4. Wait until you see your Roblox home page'
        ]);
        logger.newline();

        logger.warning('⏸️  Complete the login, then press Enter here to continue...');
        await prompt.confirm('', true);
        logger.newline();
        logger.success('✓ You should now be logged in!');
        logger.newline();
        logger.info('Now let\'s try installing the plugin again...');
        logger.info('Opening plugin page...');
        await installer.openURL(ROJO_PLUGIN_URL);
        logger.newline();
        break;

      case 'nobutton':
        logger.info('If there\'s no Install button:');
        logger.list([
          'The plugin might already be installed - check the button text',
          'If it says "Installed" or "Update": Great! You\'re good to go',
          'If the page looks wrong: Try this URL: ' + ROJO_PLUGIN_URL,
          'Make sure you\'re logged in to Roblox'
        ]);
        break;

      case 'error':
        logger.info('If you got an error:');
        logger.list([
          'Try refreshing the page (F5) and clicking Install again',
          'Make sure your internet connection is stable',
          'Try logging out and back in to Roblox',
          'Wait a minute and try again - Roblox servers might be slow'
        ]);
        break;

      case 'pagenotload':
        logger.info('If the page didn\'t open:');
        logger.list([
          'Copy this URL and paste it in your browser: ' + ROJO_PLUGIN_URL,
          'Make sure your default browser is set up',
          'Try opening any browser manually and pasting the URL',
          'Check your internet connection'
        ]);
        break;

      default:
        logger.info('General help:');
        logger.list([
          'Make sure you\'re at: ' + ROJO_PLUGIN_URL,
          'Make sure you\'re logged into Roblox',
          'Try a different browser if it\'s not working',
          'Ask for help in Roblox developer forums'
        ]);
    }

    logger.newline();
    const tryAgain = await prompt.confirm('Ready to try again?', true);
    return tryAgain ? installRojoPlugin() : false;
  }

  logger.success('✓ Rojo plugin installed!');
  logger.newline();
  return true;
}

/**
 * STEP 3: Open Rojo Panel in Studio
 */
async function openRojoPanel() {
  logger.info('STEP 3 of 4: Open Rojo Panel in Studio');
  logger.newline();

  logger.info('Now we need to open the Rojo plugin panel in Studio.');
  logger.info('This is where you\'ll connect to your project.');
  logger.newline();

  // CRITICAL: Must open a place first!
  logger.warning('⚠️  IMPORTANT: Plugins only work when you have a place open!');
  logger.newline();
  logger.info('First, let\'s make sure you have a place open in Studio:');
  logger.newline();

  const hasPlaceOpen = await prompt.confirm('Do you have a place/game open in Studio right now?', false);
  logger.newline();

  if (!hasPlaceOpen) {
    logger.info('No problem! Let\'s open a place now.');
    logger.newline();
    logger.info('📋 In Roblox Studio:');
    logger.list([
      '1. Look for the "New" button or "File" menu',
      '2. Click "New" or "File" → "New"',
      '3. Choose any template (Baseplate is easiest)',
      '4. Wait for the 3D viewport to appear',
      '5. You should see a 3D world with grid/baseplate'
    ]);
    logger.newline();

    logger.info('💡 Alternative: Open an existing place');
    logger.list([
      '• Click "File" → "Open from Roblox"',
      '• Select any of your existing games',
      '• Or just create a new Baseplate (quickest)'
    ]);
    logger.newline();

    logger.warning('⏸️  Open a place in Studio, then press Enter here...');
    await prompt.confirm('', true);
    logger.newline();
    logger.success('✓ Great! Now you have a place open.');
    logger.newline();
  } else {
    logger.success('✓ Perfect! You already have a place open.');
    logger.newline();
  }

  logger.info('📋 Now let\'s find the Rojo button:');
  logger.newline();

  logger.info('In Roblox Studio (with your place open):');
  logger.list([
    '1. Look at the top toolbar (where all the buttons are)',
    '2. Find a button that says "Rojo" with a red/orange icon',
    '3. Click the "Rojo" button',
    '4. A panel should appear on the right side of Studio',
    '5. The panel should say "Rojo" at the top'
  ]);
  logger.newline();

  logger.info('💡 Can\'t find the Rojo button?');
  logger.list([
    'Try the PLUGINS tab at the very top of Studio',
    'Look in the list of plugins for "Rojo"',
    'Click on "Rojo" to activate it',
    'The panel should appear on the right side',
    'If still not there: Close Studio, reopen it, and look again'
  ]);
  logger.newline();

  logger.info('The Rojo panel should look like:');
  logger.list([
    'Title: "Rojo" at the top',
    'A text box for server address',
    'A "Connect" button',
    'Maybe some status text'
  ]);
  logger.newline();

  // Verification
  const opened = await prompt.confirm('Can you see the Rojo panel open in Studio?', true);
  logger.newline();

  if (!opened) {
    logger.error('Rojo panel not found.');
    logger.newline();
    logger.info('Let\'s troubleshoot:');
    logger.newline();

    const issue = await prompt.select('What\'s happening?', [
      { name: 'nobutton', message: 'I don\'t see a Rojo button anywhere' },
      { name: 'nopanel', message: 'I clicked it but no panel appeared' },
      { name: 'wrongpanel', message: 'A different panel appeared' },
      { name: 'studiocrash', message: 'Studio crashed or froze' },
      { name: 'other', message: 'Something else' }
    ]);

    logger.newline();

    switch (issue) {
      case 'nobutton':
        logger.info('If you don\'t see the Rojo button:');
        logger.newline();
        logger.warning('⚠️  MOST COMMON ISSUE: Do you have a PLACE open?');
        logger.info('Plugins ONLY show up when you have a place/game open in Studio!');
        logger.newline();
        logger.list([
          '1. Make sure you have a place open (File → New → Baseplate)',
          '2. Wait for the 3D viewport to fully load',
          '3. Then look for the Rojo button in the toolbar',
          '4. If still not there: Close Studio, reopen it, open a place',
          '5. Check PLUGINS tab at the top → Manage Plugins → Enable Rojo'
        ]);
        logger.newline();
        logger.info('💡 The Rojo button will NEVER appear on the Studio home screen.');
        logger.info('You MUST open a place first!');
        break;

      case 'nopanel':
        logger.info('If you clicked but no panel appeared:');
        logger.list([
          'Check the right side of Studio - the panel might be hidden',
          'Look for a thin vertical bar on the right - click it to expand',
          'Try clicking the Rojo button again',
          'Close and reopen Studio',
          'The panel might be minimized - look for a small Rojo tab'
        ]);
        break;

      case 'wrongpanel':
        logger.info('Make sure you\'re looking for the right panel:');
        logger.list([
          'Panel should have "Rojo" written at the top',
          'Should have a text box for server address',
          'Should have a Connect button',
          'If you see a different plugin: Keep looking for the Rojo one',
          'Check the PLUGINS tab to find all available plugins'
        ]);
        break;

      case 'studiocrash':
        logger.info('If Studio crashed:');
        logger.list([
          'Restart Roblox Studio',
          'Update your graphics drivers',
          'Make sure Studio is fully updated',
          'Try running Studio as administrator',
          'Check if your computer meets Studio\'s system requirements'
        ]);
        break;

      default:
        logger.info('General troubleshooting:');
        logger.list([
          'Close and reopen Roblox Studio completely',
          'Make sure the Rojo plugin is actually installed',
          'Check PLUGINS tab → Manage Plugins → Enable Rojo',
          'Try reinstalling the plugin from the marketplace'
        ]);
    }

    logger.newline();
    const tryAgain = await prompt.confirm('Ready to try again?', true);
    return tryAgain ? openRojoPanel() : false;
  }

  logger.success('✓ Rojo panel is open!');
  logger.newline();
  return true;
}

/**
 * STEP 4: Connect to Rojo Server
 */
async function connectToServer(context) {
  logger.info('STEP 4 of 4: Connect to Rojo Server');
  logger.newline();

  logger.info('Now for the final step: connecting Studio to your Rojo server.');
  logger.info('This creates the live sync connection between VS Code and Studio.');
  logger.newline();

  logger.info('📋 Step-by-step instructions:');
  logger.newline();

  logger.info('In the Rojo panel in Studio:');
  logger.list([
    '1. Find the text box (usually says "localhost:34872" or is empty)',
    `2. Type this exactly: localhost:${context.rojoPort}`,
    '3. Click the "Connect" button',
    '4. Wait 2-3 seconds',
    '5. You should see "Connected" with a GREEN indicator'
  ]);
  logger.newline();

  logger.info('✅ When connected successfully, you\'ll see:');
  logger.list([
    '"Connected" or "Synced" text',
    'A green checkmark or green dot',
    `Project name: ${context.projectName || 'your project name'}`,
    'Status showing it\'s ready to sync'
  ]);
  logger.newline();

  logger.warning('⚠️  IMPORTANT: Keep the Rojo panel OPEN while developing!');
  logger.info('If you close it, the sync will stop. Just click Rojo button to reconnect.');
  logger.newline();

  // Verification
  const connected = await prompt.confirm(
    'Do you see "Connected" with a green indicator?',
    true
  );

  logger.newline();

  if (!connected) {
    logger.error('Connection not established.');
    logger.newline();
    logger.info('Let\'s troubleshoot the connection:');
    logger.newline();

    const issue = await prompt.select('What\'s showing in the Rojo panel?', [
      { name: 'error', message: 'It says "Error" or shows an error message' },
      { name: 'connecting', message: 'It says "Connecting..." and stays that way' },
      { name: 'nothing', message: 'Nothing happens when I click Connect' },
      { name: 'wrongport', message: 'It says connection failed or refused' },
      { name: 'other', message: 'Something else' }
    ]);

    logger.newline();

    switch (issue) {
      case 'error':
        logger.info('If you see an error:');
        logger.list([
          `Double-check you typed: localhost:${context.rojoPort} (exactly like that)`,
          'Make sure there are no extra spaces',
          'The Rojo server needs to be running - check this window\'s previous steps',
          'Try clicking Disconnect then Connect again',
          'Check if your firewall is blocking the connection'
        ]);
        break;

      case 'connecting':
        logger.info('If it stays on "Connecting...":');
        logger.list([
          'Wait a bit longer - sometimes it takes 10-15 seconds',
          'Check if Rojo server is still running (look earlier in this window)',
          `Make sure you entered: localhost:${context.rojoPort}`,
          'Click Disconnect, wait 3 seconds, then Connect again',
          'Your firewall might be blocking it - allow Roblox Studio through firewall'
        ]);
        break;

      case 'nothing':
        logger.info('If nothing happens:');
        logger.list([
          'Make sure you entered the server address in the text box',
          'Make sure you clicked the Connect button',
          'Try closing the Rojo panel and opening it again',
          'Close and reopen Studio completely',
          'Make sure Rojo server is running (check earlier steps)'
        ]);
        break;

      case 'wrongport':
        logger.info('If connection refused or failed:');
        logger.list([
          `Make sure the server address is EXACTLY: localhost:${context.rojoPort}`,
          'The Rojo server must be running - check earlier in this window',
          'Try disconnecting and reconnecting',
          'Windows Firewall might be blocking - allow Studio in firewall settings',
          'Try restarting the Rojo server (we can help with this)'
        ]);
        break;

      default:
        logger.info('General connection troubleshooting:');
        logger.list([
          `Verify server address: localhost:${context.rojoPort}`,
          'Check Rojo server is still running',
          'Try closing and reopening the Rojo panel',
          'Close and reopen Studio completely',
          'Check Windows Firewall settings',
          'Try running Studio as administrator'
        ]);
    }

    logger.newline();
    logger.info('Need to restart the Rojo server?');
    logger.info('You can stop this wizard (Ctrl+C) and run it again.');
    logger.newline();

    const tryAgain = await prompt.confirm('Ready to try connecting again?', true);
    return tryAgain ? connectToServer(context) : false;
  }

  logger.success('✓ Successfully connected to Rojo server!');
  logger.newline();
  return true;
}
