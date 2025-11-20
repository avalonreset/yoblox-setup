/**
 * Complete State
 *
 * Shows success message and next steps.
 */

const logger = require('../utils/logger');
const prompt = require('../utils/prompt');
const installer = require('../utils/installer');
const path = require('path');

module.exports = {
  name: 'complete',

  async check(context) {
    return { found: false, canSkip: false };
  },

  async run(context) {
    logger.header('Setup Complete!', 9, 9);

    // Show success box
    const successMessage = `
🎉 Congratulations! 🎉

Your Roblox development environment is ready!
`;

    logger.box(successMessage, { borderColor: 'green' });

    // Show installed tools
    logger.info('Installed tools:');
    logger.newline();

    const tools = [];

    if (context.installedTools?.robloxStudio) tools.push('✓ Roblox Studio');
    if (context.installedTools?.vscode) tools.push('✓ VS Code');
    if (context.installedTools?.git) tools.push('✓ Git');
    if (context.installedTools?.rust) tools.push('✓ Rust + Cargo');
    if (context.installedTools?.rojo) tools.push('✓ Rojo');
    if (context.installedTools?.vscodeExtensions) {
      tools.push('✓ Luau LSP extension');
      tools.push('✓ Rojo extension');
    }
    if (context.userChoices?.aiCLI && context.userChoices.aiCLI !== 'none') {
      tools.push(`✓ ${context.userChoices.aiCLI.toUpperCase()} CLI`);
    }

    logger.list(tools);

    logger.newline();
    logger.divider();
    logger.newline();

    // Show next steps
    logger.info('Next steps:');
    logger.newline();

    if (context.projectName) {
      logger.command(`cd ${context.projectName}`);
      logger.command('code .');
      logger.newline();
      logger.info('Then in VS Code:');
      logger.list([
        'Open a terminal (Ctrl+`)',
        'Run: rojo serve',
        'Open Roblox Studio',
        'Install Rojo plugin from Roblox plugin marketplace',
        'Click "Connect" in the Rojo plugin',
        'Connect to localhost:34872'
      ]);

      logger.newline();
      logger.divider();
      logger.newline();

      logger.info('Start coding!');
      logger.list([
        'Read ARCHITECTURE.md to understand the project structure',
        'Read GAME_DESIGN.md to plan your game',
        'Check ai/AI_PROMPTS.md for tips on using AI assistants',
        'Write code in src/ and watch it sync to Roblox Studio!'
      ]);
    } else {
      logger.warning('No project was created.');
      logger.info('Run: npx yoblox my-game');
      logger.info('To scaffold a new project.');
    }

    logger.newline();
    logger.divider();
    logger.newline();

    // Offer to open project in VS Code
    if (context.projectName && context.installedTools?.vscode) {
      const shouldOpen = await prompt.confirm(
        'Open project in VS Code now?',
        true
      );

      if (shouldOpen) {
        logger.info('Opening VS Code...');
        const projectPath = path.join(process.cwd(), context.projectName);

        try {
          await installer.runCommand('code', [projectPath], {
            stdio: 'ignore',
            detached: true
          });

          logger.success('VS Code opened!');
        } catch (error) {
          logger.warning('Could not open VS Code automatically.');
          logger.info(`Run: code ${context.projectName}`);
        }
      }
    }

    logger.newline();
    logger.box('Happy coding! 🚀', { borderColor: 'cyan' });
    logger.newline();

    logger.info('Resources:');
    logger.list([
      'yoblox: https://github.com/avalonreset/yoblox',
      'Rojo docs: https://rojo.space/docs/',
      'Luau docs: https://luau-lang.org/',
      'Roblox Creator: https://create.roblox.com/docs'
    ]);

    logger.newline();

    return { success: true };
  }
};
