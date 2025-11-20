/**
 * CLI Orchestrator
 *
 * This module coordinates the overall setup flow by initializing
 * the state machine and running all setup states in sequence.
 */

const StateMachine = require('./statemachine');
const logger = require('./utils/logger');
const system = require('./utils/system');

// Import all states
const welcome = require('./states/welcome');
const robloxStudio = require('./states/robloxStudio');
const vscode = require('./states/vscode');
const git = require('./states/git');
const rust = require('./states/rust');
const rojo = require('./states/rojo');
const vscodeExtensions = require('./states/vscodeExtensions');
const aiCLI = require('./states/aiCLI');
const scaffold = require('./states/scaffold');
const complete = require('./states/complete');

/**
 * Run the setup wizard
 * @param {Object} options - CLI options
 * @param {boolean} options.reset - Whether to ignore saved progress
 */
async function run(options = {}) {
  // Check Node version before starting
  const nodeVersion = system.getNodeVersion();
  const minNodeVersion = '14.0.0';

  if (!system.isNodeVersionValid(nodeVersion, minNodeVersion)) {
    logger.error(`Node.js ${minNodeVersion} or higher is required. You have ${nodeVersion}.`);
    logger.info('Please upgrade Node.js: https://nodejs.org/');
    process.exit(1);
  }

  // Define all states in order
  const states = [
    welcome,
    robloxStudio,
    vscode,
    git,
    rust,
    rojo,
    vscodeExtensions,
    aiCLI,
    scaffold,
    complete
  ];

  // Create and run state machine
  const machine = new StateMachine(states, options);

  try {
    await machine.run();
    logger.success('\nSetup completed successfully!');
  } catch (error) {
    logger.error('\nSetup failed:');
    throw error;
  }
}

module.exports = { run };
