/**
 * Scaffold State
 *
 * Downloads the yoblox template from GitHub and creates a new project.
 * No dependency on npx or npm packages - uses direct GitHub codeload.
 */

const logger = require('../utils/logger');
const validator = require('../utils/validator');
const installer = require('../utils/installer');
const prompt = require('../utils/prompt');
const path = require('path');
const os = require('os');
const fs = require('fs');

// GitHub repo config
const GITHUB_REPO = 'avalonreset/yoblox';
const GITHUB_BRANCH = 'master';
const GITHUB_CODELOAD_URL = `https://codeload.github.com/${GITHUB_REPO}/zip/refs/heads/${GITHUB_BRANCH}`;

module.exports = {
  name: 'scaffold',

  async check(context) {
    // Check if project already created
    if (context.projectName) {
      return { found: true, canSkip: true };
    }
    return { found: false, canSkip: false };
  },

  async run(context) {
    logger.header('Create Your Project', 8, 9);

    logger.info('Time to create your first Roblox game project!');
    logger.info('We will download the yoblox template from GitHub and set it up for you.');
    logger.newline();

    // Ask for project name
    let projectName = '';
    let validationResult;

    do {
      projectName = await prompt.input(
        'What do you want to name your project?',
        'my-roblox-game'
      );

      validationResult = validator.validateProjectName(projectName);

      if (!validationResult.valid) {
        logger.error(`Invalid project name: ${validationResult.reason}`);
        logger.newline();
      }
    } while (!validationResult.valid);

    logger.newline();
    logger.info(`Creating project: ${projectName}`);
    logger.newline();

    // Create project directory
    const projectPath = path.join(process.cwd(), projectName);

    try {
      // Step 1: Download template from GitHub
      const downloaded = await downloadTemplate();

      if (!downloaded) {
        logger.error('Failed to download yoblox template from GitHub.');
        const retry = await prompt.confirm('Try again?', true);
        if (retry) {
          return { success: false, retry: true };
        } else {
          return { success: false, retry: false };
        }
      }

      // Step 2: Extract and setup project
      const extractSuccess = await extractAndSetupProject(
        downloaded.zipPath,
        downloaded.tempDir,
        projectPath,
        projectName
      );

      if (!extractSuccess) {
        logger.error('Failed to setup project.');
        const retry = await prompt.confirm('Try again?', true);
        if (retry) {
          return { success: false, retry: true };
        } else {
          return { success: false, retry: false };
        }
      }

      // Success!
      logger.success(`✓ Project "${projectName}" created successfully!`);
      logger.info(`Location: ${projectPath}`);
      logger.newline();
      logger.divider();
      logger.newline();

      // Show next steps
      showNextSteps(projectName);

      return {
        success: true,
        data: {
          projectName,
          projectPath
        }
      };
    } catch (error) {
      logger.error(`Error creating project: ${error.message}`);

      const retry = await prompt.confirm('Try again?', true);

      if (retry) {
        return { success: false, retry: true };
      } else {
        return { success: false, retry: false };
      }
    }
  }
};

/**
 * Download the yoblox template from GitHub
 * @returns {Promise<Object|null>} Object with zipPath and tempDir, or null on failure
 */
async function downloadTemplate() {
  logger.info('Downloading yoblox template from GitHub...');

  const tempDir = path.join(os.tmpdir(), `yoblox-setup-${Date.now()}`);
  const zipPath = path.join(tempDir, 'yoblox.zip');

  try {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Download zip from GitHub codeload
    await installer.downloadFile(GITHUB_CODELOAD_URL, zipPath);

    logger.success('✓ Template downloaded');
    logger.newline();

    return { zipPath, tempDir };
  } catch (error) {
    logger.error(`Failed to download: ${error.message}`);

    // Cleanup on error
    try {
      await installer.cleanupDirectory(tempDir);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    return null;
  }
}

/**
 * Extract zip and copy template folder to project directory
 * @param {string} zipPath - Path to downloaded zip
 * @param {string} tempDir - Temporary directory
 * @param {string} projectPath - Target project path
 * @param {string} projectName - Project name (for display)
 * @returns {Promise<boolean>} Success flag
 */
async function extractAndSetupProject(zipPath, tempDir, projectPath, projectName) {
  try {
    logger.info('Extracting template...');

    // Extract zip
    const extractDir = path.join(tempDir, 'extracted');
    await installer.extractZip(zipPath, extractDir);

    logger.success('✓ Template extracted');
    logger.newline();

    // Find the yoblox-main (or yoblox-branch) folder inside extracted zip
    logger.info('Locating template folder...');

    const yobloxFolder = installer.findDirectory(extractDir, 'yoblox-*');

    if (!yobloxFolder) {
      throw new Error('Could not find yoblox folder in extracted archive');
    }

    logger.success('✓ Template folder found');
    logger.newline();

    // Look for template folder inside yoblox repo
    const templateFolder = path.join(yobloxFolder, 'template');

    if (!fs.existsSync(templateFolder)) {
      throw new Error('Template folder not found inside yoblox repository');
    }

    logger.info('Creating project directory...');

    // Create project directory
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    logger.success('✓ Project directory created');
    logger.newline();

    logger.info('Copying template files...');

    // Copy template folder contents to project directory
    // Exclude .git, node_modules, and other non-essential files
    await installer.copyDirectory(
      templateFolder,
      projectPath,
      ['.git', '.gitignore', 'node_modules', '.DS_Store']
    );

    logger.success('✓ Template files copied');
    logger.newline();

    logger.info('Cleaning up temporary files...');

    // Cleanup temp directory
    await installer.cleanupDirectory(tempDir);

    logger.success('✓ Cleanup complete');
    logger.newline();

    return true;
  } catch (error) {
    logger.error(`Setup error: ${error.message}`);

    // Try to cleanup project on error
    try {
      if (fs.existsSync(projectPath)) {
        await installer.cleanupDirectory(projectPath);
      }
    } catch (cleanupError) {
      logger.warning(`Could not cleanup partial project: ${cleanupError.message}`);
    }

    // Always cleanup temp dir
    try {
      await installer.cleanupDirectory(tempDir);
    } catch (cleanupError) {
      // Ignore
    }

    return false;
  }
}

/**
 * Show next steps for the user
 * @param {string} projectName - Project name
 */
function showNextSteps(projectName) {
  logger.info('Next steps to get started:');
  logger.newline();

  logger.list([
    `${logger.command ? '1.' : '•'} cd ${projectName}`,
    `${logger.command ? '2.' : '•'} code . (to open in VS Code)`,
    `${logger.command ? '3.' : '•'} rojo serve (in terminal)`
  ]);

  logger.newline();
  logger.info('Then in Roblox Studio:');
  logger.list([
    'Install Rojo plugin from plugin marketplace',
    'Click "Connect" in Rojo plugin',
    'Connect to localhost:34872'
  ]);

  logger.newline();
  logger.info('To start coding:');
  logger.list([
    'Read ARCHITECTURE.md to understand project structure',
    'Read GAME_DESIGN.md to plan your game',
    'Check ai/AI_PROMPTS.md for AI coding tips',
    'Start editing src/ and watch it sync to Roblox Studio!'
  ]);

  logger.newline();
}
