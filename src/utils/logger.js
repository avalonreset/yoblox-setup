/**
 * Logger Utilities
 *
 * Provides consistent, colorful output with spinners, progress bars,
 * and formatted messages.
 */

const chalk = require('chalk');
const boxen = require('boxen');
const ora = require('ora');
const cliProgress = require('cli-progress');

/**
 * Print info message
 * @param {string} message - Message to print
 */
function info(message) {
  console.log(chalk.blue('ℹ'), message);
}

/**
 * Print success message
 * @param {string} message - Message to print
 */
function success(message) {
  console.log(chalk.green('✓'), message);
}

/**
 * Print warning message
 * @param {string} message - Message to print
 */
function warning(message) {
  console.log(chalk.yellow('⚠'), message);
}

/**
 * Print error message
 * @param {string} message - Message to print
 */
function error(message) {
  console.log(chalk.red('✗'), message);
}

/**
 * Create a spinner
 * @param {string} text - Spinner text
 * @returns {Object} Spinner instance
 */
function spinner(text) {
  return ora({
    text,
    color: 'cyan'
  });
}

/**
 * Print a message in a box
 * @param {string} message - Message to box
 * @param {Object} options - Boxen options
 */
function box(message, options = {}) {
  const defaultOptions = {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
    ...options
  };

  console.log(boxen(message, defaultOptions));
}

/**
 * Create a progress bar
 * @param {Object} options - Progress bar options
 * @returns {Object} Progress bar instance
 */
function progressBar(options = {}) {
  const defaultOptions = {
    format: '{bar} {percentage}% | {value}/{total} | {label}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    ...options
  };

  return new cliProgress.SingleBar(defaultOptions, cliProgress.Presets.shades_classic);
}

/**
 * Print a section header
 * @param {string} text - Header text
 * @param {number} current - Current step number
 * @param {number} total - Total steps
 */
function header(text, current, total) {
  const prefix = current && total ? `[${current}/${total}]` : '';
  console.log('\n' + chalk.bold.cyan('━'.repeat(60)));
  console.log(chalk.bold.white(`${prefix} ${text}`));
  console.log(chalk.bold.cyan('━'.repeat(60)) + '\n');
}

/**
 * Print a blank line
 */
function newline() {
  console.log('');
}

/**
 * Print a divider
 */
function divider() {
  console.log(chalk.gray('─'.repeat(60)));
}

/**
 * Print step information
 * @param {number} current - Current step
 * @param {number} total - Total steps
 * @param {string} text - Step description
 */
function step(current, total, text) {
  console.log(chalk.bold(`\n[${current}/${total}]`), text);
}

/**
 * Clear the console
 */
function clear() {
  console.clear();
}

/**
 * Print a list of items
 * @param {Array<string>} items - Items to list
 * @param {string} symbol - Symbol to use (default: bullet)
 */
function list(items, symbol = '•') {
  items.forEach(item => {
    console.log(`  ${chalk.cyan(symbol)} ${item}`);
  });
}

/**
 * Print command to run
 * @param {string} command - Command to display
 */
function command(command) {
  console.log(chalk.gray('$'), chalk.white(command));
}

/**
 * Print verbose debug information (only if DEBUG env var is set)
 * @param {string} message - Debug message
 */
function debug(message) {
  if (process.env.DEBUG) {
    console.log(chalk.gray('[DEBUG]'), message);
  }
}

module.exports = {
  info,
  success,
  warning,
  error,
  spinner,
  box,
  progressBar,
  header,
  newline,
  divider,
  step,
  clear,
  list,
  command,
  debug
};
