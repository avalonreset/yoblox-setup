/**
 * Scaffold State
 *
 * Runs npx yoblox to create a new project.
 */

const logger = require('../utils/logger');
const validator = require('../utils/validator');
const installer = require('../utils/installer');
const prompt = require('../utils/prompt');
const path = require('path');

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
    logger.info('Running: npx yoblox ' + projectName);
    logger.newline();

    // Run npx yoblox
    const result = await installer.runCommand('npx', ['yoblox', projectName], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });

    if (!result.success) {
      logger.error('Failed to create project.');
      logger.error(result.stderr || result.error);

      const retry = await prompt.confirm('Try again?', true);

      if (retry) {
        return { success: false, retry: true };
      } else {
        logger.error('Cannot continue without project scaffold.');
        return { success: false, retry: false };
      }
    }

    // Verify project was created
    const projectPath = path.join(process.cwd(), projectName);

    if (!validator.pathExists(projectPath)) {
      logger.error('Project folder not found after scaffold.');

      const retry = await prompt.confirm('Try again?', true);

      if (retry) {
        return { success: false, retry: true };
      } else {
        return { success: false, retry: false };
      }
    }

    logger.success(`✓ Project "${projectName}" created successfully!`);
    logger.info(`Location: ${projectPath}`);

    return {
      success: true,
      data: {
        projectName,
        projectPath
      }
    };
  }
};
