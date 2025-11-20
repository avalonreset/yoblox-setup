/**
 * AI CLI State
 *
 * Lets user choose and install AI assistant CLI (Claude, Gemini, or skip).
 * This state blocks until the chosen CLI is installed or user explicitly skips.
 */

const logger = require('../utils/logger');
const validator = require('../utils/validator');
const installer = require('../utils/installer');
const prompt = require('../utils/prompt');
const system = require('../utils/system');
const config = require('../config');

module.exports = {
  name: 'aiCLI',

  async check(context) {
    // Check if user already successfully configured an AI CLI
    if (context.userChoices?.aiChoice && context.userChoices?.aiConfigured) {
      return { found: true, canSkip: true };
    }
    return { found: false, canSkip: true };
  },

  async run(context) {
    logger.header('AI Assistant CLI', 7, 9);

    logger.info('AI assistants help you generate code for your Roblox game.');
    logger.info('You can use them via browser or install a CLI for terminal access.');
    logger.newline();

    // Main selection loop - user can return here to switch AI choices
    while (true) {
      const choice = await showAiSelectionMenu();

      if (choice === 'none') {
        return handleSkipChoice(context);
      }

      // User chose Claude or Gemini - now we block until it's installed or they switch/skip
      const result = await handleAiInstallation(choice, context);

      if (result.switchAi) {
        // User wants to go back to the menu
        continue;
      }

      // Either success or they chose to skip after failing
      return result;
    }
  }
};

/**
 * Show the AI selection menu
 * @returns {Promise<string>} Selected AI id ('claude', 'gemini', or 'none')
 */
async function showAiSelectionMenu() {
  logger.info('Choose an AI assistant:');
  logger.newline();

  const choices = Object.values(config.AI_OPTIONS).map(ai => ({
    name: ai.id,
    message: ai.name,
    hint: ai.hint
  }));

  const selection = await prompt.select(
    'Which AI assistant do you want?',
    choices
  );

  return selection;
}

/**
 * Handle the "skip AI" choice
 * @param {Object} context - State context
 * @returns {Object} State result
 */
function handleSkipChoice(context) {
  logger.newline();
  logger.warning('Skipping AI setup.');
  logger.info('You can still use browser-based AI assistants or install a CLI later.');
  logger.newline();

  return {
    success: true,
    data: {
      userChoices: {
        ...context.userChoices,
        aiChoice: 'none',
        aiConfigured: true
      }
    }
  };
}

/**
 * Handle AI CLI installation with blocking loop
 * @param {string} aiId - AI identifier ('claude' or 'gemini')
 * @param {Object} context - State context
 * @returns {Promise<Object>} State result
 */
async function handleAiInstallation(aiId, context) {
  const aiConfig = config.AI_OPTIONS[aiId];
  const binary = aiConfig.binary;

  logger.newline();
  logger.info(`Setting up ${aiConfig.name}...`);
  logger.newline();

  // Installation loop - check, guide, recheck
  while (true) {
    // Check if CLI is already available
    const checkResult = await validator.checkAiCli(binary);

    if (checkResult.found) {
      logger.success(`✓ ${aiConfig.name} detected and ready to use!`);
      if (checkResult.version) {
        logger.info(`  Version: ${checkResult.version}`);
      }
      logger.newline();

      return {
        success: true,
        data: {
          userChoices: {
            ...context.userChoices,
            aiChoice: aiId,
            aiConfigured: true
          },
          installedTools: {
            ...context.installedTools,
            aiCLI: aiId
          }
        }
      };
    }

    // CLI not found - guide installation
    logger.warning(`✗ ${aiConfig.name} not detected in PATH.`);
    logger.newline();

    logger.info('Opening installation documentation in your browser...');
    await installer.openURL(aiConfig.docsUrl);

    logger.newline();
    logger.info('Installation instructions:');

    // Show OS-specific hints
    const hints = system.isWindows()
      ? aiConfig.installHintWindows
      : aiConfig.installHintUnix;

    logger.list(hints);

    logger.newline();
    logger.divider();
    logger.newline();

    // Prompt user for next action
    const action = await prompt.input(
      `Press Enter to recheck, or type 's' to switch/skip AI setup`,
      '',
      (value) => {
        if (value === '' || value.toLowerCase() === 's') {
          return true;
        }
        return 'Please press Enter or type "s"';
      }
    );

    if (action.toLowerCase() === 's') {
      logger.newline();
      return { switchAi: true };
    }

    // User pressed Enter - recheck
    logger.newline();
    logger.info(`Checking for ${binary} command...`);

    // Loop will recheck at the top
  }
}
