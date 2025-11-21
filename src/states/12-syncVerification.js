/**
 * Sync Verification State
 *
 * THE MOST CRITICAL STATE - Proves end-to-end that everything works.
 * Creates a test file, verifies it appears in Studio, then cleans up.
 * If this works, the entire setup is confirmed working.
 */

const logger = require('../utils/logger');
const prompt = require('../utils/prompt');
const fs = require('fs');
const path = require('path');

// Test file configuration
const TEST_FILE_NAME = '_yoblox_test_sync.lua';
const TEST_FILE_CONTENT = `-- Test file created by yoblox-setup wizard
-- If you can see this file in Roblox Studio, your sync is working!
print("✓ Sync test successful! Your development environment is ready!")

return {
  message = "This is a test file - it will be automatically deleted",
  timestamp = "${new Date().toISOString()}",
  setupVersion = "2.0"
}
`;

module.exports = {
  name: 'syncVerification',
  order: 12,

  async check(context) {
    // Check if sync already verified
    if (context.syncVerified) {
      return { found: true, canSkip: true };
    }
    return { found: false, canSkip: false };
  },

  async verify(context) {
    // User confirmation is the verification
    if (context.syncVerified) {
      return { verified: true, issues: [] };
    }
    return { verified: false, issues: ['Sync not verified'] };
  },

  async cleanup(context) {
    // Clean up test file if it exists
    if (context.projectPath) {
      const testFilePath = path.join(context.projectPath, 'src', TEST_FILE_NAME);
      if (fs.existsSync(testFilePath)) {
        try {
          fs.unlinkSync(testFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  },

  async run(context) {
    logger.header('Verify End-to-End Sync', 12, 13);

    logger.info('This is the final verification step!');
    logger.info('We will create a test file and confirm you can see it in Studio.');
    logger.info('If this works, your ENTIRE setup is confirmed working perfectly.');
    logger.newline();

    // Verify prerequisites
    if (!context.projectPath) {
      logger.error('No project path found.');
      return { success: false, retry: false };
    }

    if (!context.rojoRunning) {
      logger.error('Rojo server is not running.');
      return { success: false, retry: false };
    }

    if (!context.studioConnected) {
      logger.error('Studio is not connected.');
      return { success: false, retry: false };
    }

    logger.success('✓ Project created');
    logger.success('✓ Rojo server running');
    logger.success('✓ Studio connected');
    logger.newline();

    logger.divider();
    logger.newline();

    // Step 1: Prepare for test
    logger.info('STEP 1: Prepare');
    logger.newline();

    logger.info('Make sure:');
    logger.list([
      'Roblox Studio is open and visible',
      'The Rojo plugin shows "Connected" (green indicator)',
      'You can see the Explorer panel in Studio'
    ]);
    logger.newline();

    await prompt.confirm('Press Enter when ready...', true);
    logger.newline();

    logger.divider();
    logger.newline();

    // Step 2: Create test file
    logger.info('STEP 2: Create Test File');
    logger.newline();

    const testFilePath = path.join(context.projectPath, 'src', TEST_FILE_NAME);

    logger.info(`Creating test file: src/${TEST_FILE_NAME}`);
    logger.newline();

    try {
      // Ensure src directory exists
      const srcDir = path.join(context.projectPath, 'src');
      if (!fs.existsSync(srcDir)) {
        fs.mkdirSync(srcDir, { recursive: true });
      }

      // Write test file
      fs.writeFileSync(testFilePath, TEST_FILE_CONTENT, 'utf8');

      logger.success('✓ Test file created!');
      logger.newline();
    } catch (error) {
      logger.error(`Failed to create test file: ${error.message}`);
      logger.newline();
      return { success: false, retry: false };
    }

    // Step 3: Wait for sync
    logger.info('STEP 3: Check Studio');
    logger.newline();

    logger.info('The file should appear in Roblox Studio within a few seconds.');
    logger.newline();

    logger.info('In Roblox Studio, look for:');
    logger.list([
      'Open the Explorer panel (View → Explorer)',
      'Look in ServerScriptService or ReplicatedStorage',
      `Find a file named: ${TEST_FILE_NAME}`,
      'It should appear automatically (Rojo syncs it)'
    ]);
    logger.newline();

    logger.warning('NOTE: The sync usually happens instantly, but can take up to 5 seconds.');
    logger.newline();

    // Give user time to look
    logger.info('Waiting for file to sync...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    logger.newline();

    // Step 4: User confirmation
    logger.info('STEP 4: Confirm Sync');
    logger.newline();

    const canSeeFile = await prompt.confirm(
      `Can you see the file "${TEST_FILE_NAME}" in Studio's Explorer?`,
      true
    );

    logger.newline();

    if (!canSeeFile) {
      logger.error('File not visible in Studio.');
      logger.newline();

      logger.info('Troubleshooting:');
      logger.list([
        'Check that Rojo plugin still shows "Connected"',
        'Try clicking "Reconnect" in the Rojo panel',
        'Look in different locations: ServerScriptService, ReplicatedStorage',
        'Wait a few more seconds and check again',
        'Check VS Code - is the file there? Open: ' + testFilePath
      ]);
      logger.newline();

      // Check if file was actually created
      if (!fs.existsSync(testFilePath)) {
        logger.error('Test file was not created on disk!');
        logger.info('This is a wizard bug - please report this issue.');
        return { success: false, retry: false };
      }

      logger.info('The file exists on disk, but Rojo did not sync it to Studio.');
      logger.newline();

      const tryAgain = await prompt.confirm('Try creating the test file again?', true);

      if (tryAgain) {
        // Delete and recreate
        try {
          fs.unlinkSync(testFilePath);
          logger.info('Deleted old test file.');
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          // Ignore
        }
        return { success: false, retry: true };
      }

      logger.warning('Sync verification failed.');
      logger.info('You can continue, but manual verification is recommended.');
      logger.newline();

      const continueAnyway = await prompt.confirm('Continue anyway?', false);

      if (continueAnyway) {
        return {
          success: true,
          data: {
            syncVerified: false,
            syncSkipped: true
          }
        };
      }

      return { success: false, retry: false };
    }

    // SUCCESS!
    logger.divider();
    logger.newline();

    logger.success('🎉 SYNC VERIFIED! 🎉');
    logger.newline();

    logger.success('Your entire development environment is working perfectly!');
    logger.newline();

    logger.info('What this proves:');
    logger.list([
      '✓ VS Code can create and edit files',
      '✓ Rojo server is monitoring your project',
      '✓ Rojo plugin is connected to the server',
      '✓ File changes sync from VS Code → Rojo → Studio',
      '✓ You can see synced files in Studio\'s Explorer',
      '✓ The entire pipeline is working end-to-end'
    ]);
    logger.newline();

    logger.info('This means:');
    logger.list([
      'You can now write code in VS Code',
      'Changes will instantly appear in Studio',
      'You can test your game in real-time',
      'Your AI assistant can help you code',
      'Everything is ready to build your game!'
    ]);
    logger.newline();

    logger.divider();
    logger.newline();

    // Step 5: Cleanup
    logger.info('Cleaning up test file...');

    try {
      fs.unlinkSync(testFilePath);
      logger.success('✓ Test file removed');
    } catch (error) {
      logger.warning('Could not remove test file - you can delete it manually.');
    }

    logger.newline();

    logger.info('The test file has been removed from VS Code.');
    logger.info('It should also disappear from Studio automatically.');
    logger.newline();

    await prompt.confirm('Press Enter to continue to the final summary...', true);
    logger.newline();

    return {
      success: true,
      data: {
        syncVerified: true,
        syncWorking: true,
        endToEndConfirmed: true
      }
    };
  }
};
