/**
 * Prompt Utilities
 *
 * Wrapper around enquirer for consistent user interaction patterns.
 */

const enquirer = require('enquirer');
const chalk = require('chalk');

/**
 * Ask a yes/no confirmation question
 * @param {string} message - Question to ask
 * @param {boolean} defaultValue - Default value (true = yes, false = no)
 * @returns {Promise<boolean>} User's answer
 */
async function confirm(message, defaultValue = true) {
  try {
    const response = await enquirer.prompt({
      type: 'confirm',
      name: 'answer',
      message,
      initial: defaultValue
    });

    return response.answer;
  } catch (error) {
    // User cancelled (Ctrl+C)
    if (error.message === '') {
      throw new Error('User cancelled');
    }
    throw error;
  }
}

/**
 * Ask user to select from multiple choices
 * @param {string} message - Question to ask
 * @param {Array<Object>} choices - Array of choice objects with name and value
 * @returns {Promise<*>} Selected value
 */
async function select(message, choices) {
  try {
    const response = await enquirer.prompt({
      type: 'select',
      name: 'answer',
      message,
      choices
    });

    return response.answer;
  } catch (error) {
    if (error.message === '') {
      throw new Error('User cancelled');
    }
    throw error;
  }
}

/**
 * Ask user for text input
 * @param {string} message - Question to ask
 * @param {string} defaultValue - Default value
 * @param {Function} validate - Validation function
 * @returns {Promise<string>} User's input
 */
async function input(message, defaultValue = '', validate = null) {
  try {
    const promptConfig = {
      type: 'input',
      name: 'answer',
      message,
      initial: defaultValue
    };

    if (validate) {
      promptConfig.validate = validate;
    }

    const response = await enquirer.prompt(promptConfig);

    return response.answer;
  } catch (error) {
    if (error.message === '') {
      throw new Error('User cancelled');
    }
    throw error;
  }
}

/**
 * Ask user to press Enter to continue
 * @param {string} message - Message to show (optional)
 * @returns {Promise<void>}
 */
async function pressEnterToContinue(message = 'Press Enter to continue...') {
  try {
    await enquirer.prompt({
      type: 'invisible',
      name: 'enter',
      message: chalk.gray(message)
    });
  } catch (error) {
    if (error.message === '') {
      throw new Error('User cancelled');
    }
    throw error;
  }
}

/**
 * Ask user to select multiple items
 * @param {string} message - Question to ask
 * @param {Array<Object>} choices - Array of choice objects
 * @returns {Promise<Array>} Selected values
 */
async function multiselect(message, choices) {
  try {
    const response = await enquirer.prompt({
      type: 'multiselect',
      name: 'answer',
      message,
      choices
    });

    return response.answer;
  } catch (error) {
    if (error.message === '') {
      throw new Error('User cancelled');
    }
    throw error;
  }
}

/**
 * Ask for password input (hidden)
 * @param {string} message - Question to ask
 * @returns {Promise<string>} User's input
 */
async function password(message) {
  try {
    const response = await enquirer.prompt({
      type: 'password',
      name: 'answer',
      message
    });

    return response.answer;
  } catch (error) {
    if (error.message === '') {
      throw new Error('User cancelled');
    }
    throw error;
  }
}

module.exports = {
  confirm,
  select,
  input,
  pressEnterToContinue,
  multiselect,
  password
};
