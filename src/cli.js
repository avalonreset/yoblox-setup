/**
 * CLI Orchestrator
 *
 * This module coordinates the overall setup flow by initializing
 * the state machine and running all setup states in sequence.
 */

const StateMachine = require('./statemachine');
const logger = require('./utils/logger');
const system = require('./utils/system');
const processManager = require('./utils/process');

// Import all states (13 states for v2.0)
const welcome = require('./states/welcome');
const robloxStudio = require('./states/robloxStudio');
const vscode = require('./states/vscode');
const git = require('./states/git');
const rust = require('./states/rust');
const rojo = require('./states/rojo');
const vscodeExtensions = require('./states/vscodeExtensions');
const aiCLI = require('./states/aiCLI');
const scaffold = require('./states/scaffold');
const rojoServer = require('./states/10-rojoServer');
const studioSync = require('./states/11-studioSync');
const syncVerification = require('./states/12-syncVerification');
const finalSummary = require('./states/13-finalSummary');

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

  // Define all states in order (13 states for v2.0)
  const states = [
    welcome,           // 1. Welcome & Prerequisites Check
    robloxStudio,      // 2. Roblox Studio Installation
    vscode,            // 3. VS Code Installation
    git,               // 4. Git Installation (Optional)
    rust,              // 5. Rust + Cargo Installation
    rojo,              // 6. Rojo Installation
    vscodeExtensions,  // 7. VS Code Extensions
    aiCLI,             // 8. AI CLI Selection & Installation
    scaffold,          // 9. Project Scaffolding
    rojoServer,        // 10. Rojo Server Launch (NEW)
    studioSync,        // 11. Studio Connection Setup (NEW)
    syncVerification,  // 12. End-to-End Sync Test (NEW)
    finalSummary       // 13. Final Summary & Actions (NEW)
  ];

  // Create and run state machine
  const machine = new StateMachine(states, options);

  // Setup graceful shutdown for background processes
  const cleanup = async () => {
    logger.newline();
    logger.warning('Shutting down...');
    await processManager.stopAll();
    logger.info('Cleanup complete.');
  };

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });

  try {
    await machine.run();
    logger.success('\nSetup completed successfully!');

    // Cleanup background processes after successful completion
    await processManager.stopAll();
  } catch (error) {
    logger.error('\nSetup failed:');

    // Cleanup on error
    await processManager.stopAll();
    throw error;
  }
}

module.exports = { run };
