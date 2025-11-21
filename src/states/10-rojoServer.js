/**
 * Rojo Server State
 *
 * Automatically starts the Rojo server in the background and verifies
 * it's listening on the correct port. Falls back to alternative ports
 * if there are conflicts.
 */

const logger = require('../utils/logger');
const process = require('../utils/process');
const network = require('../utils/network');
const prompt = require('../utils/prompt');
const path = require('path');
const config = require('../config');

// Rojo server configuration
const DEFAULT_PORT = 34872;
const FALLBACK_PORTS = [34873, 34874, 34875, 34876];
const STARTUP_TIMEOUT = 15000;
const PORT_CHECK_TIMEOUT = 10000;

module.exports = {
  name: 'rojoServer',
  order: 10,

  async check(context) {
    // Check if Rojo server is already running
    if (context.rojoPort && process.isRunning('rojo-server')) {
      return { found: true, canSkip: true };
    }
    return { found: false, canSkip: false };
  },

  async verify(context) {
    // Verify Rojo server is running and port is open
    if (!context.rojoPort) {
      return { verified: false, issues: ['No Rojo port configured'] };
    }

    const running = process.isRunning('rojo-server');
    const portOpen = await network.isPortOpen(context.rojoPort);

    if (!running) {
      return { verified: false, issues: ['Rojo server process not running'] };
    }

    if (!portOpen) {
      return { verified: false, issues: [`Port ${context.rojoPort} not listening`] };
    }

    return { verified: true, issues: [] };
  },

  async cleanup(context) {
    // Stop Rojo server if running
    if (process.isRunning('rojo-server')) {
      logger.info('Stopping Rojo server...');
      await process.stop('rojo-server');
    }
  },

  async run(context) {
    logger.header('Start Rojo Server', 10, 13);

    logger.info('Now we will start the Rojo server in the background.');
    logger.info('This server syncs your code from VS Code to Roblox Studio in real-time.');
    logger.newline();

    // Verify we have a project to serve
    if (!context.projectPath) {
      logger.error('No project path found. Cannot start Rojo server.');
      logger.warning('Please complete the project scaffolding step first.');
      return { success: false, retry: false };
    }

    const projectPath = context.projectPath;

    logger.info(`Project location: ${projectPath}`);
    logger.newline();

    try {
      // Step 1: Find an available port
      logger.info('Finding available port for Rojo server...');

      let selectedPort = null;

      // Check if default port is available
      const defaultAvailable = await network.isPortAvailable(DEFAULT_PORT);

      if (defaultAvailable) {
        selectedPort = DEFAULT_PORT;
        logger.success(`✓ Port ${DEFAULT_PORT} is available`);
      } else {
        logger.warning(`Port ${DEFAULT_PORT} is already in use`);
        logger.info('Trying fallback ports...');

        // Try fallback ports
        for (const port of FALLBACK_PORTS) {
          const available = await network.isPortAvailable(port);
          if (available) {
            selectedPort = port;
            logger.success(`✓ Port ${port} is available`);
            break;
          }
        }

        if (!selectedPort) {
          logger.error('All Rojo ports are occupied.');
          logger.warning('Please close any running Rojo servers and try again.');

          const retry = await prompt.confirm('Try again?', true);
          return { success: false, retry };
        }
      }

      logger.newline();

      // Step 2: Start Rojo server
      logger.info(`Starting Rojo server on port ${selectedPort}...`);
      logger.info('Command: rojo serve --port ' + selectedPort);
      logger.newline();

      const rojoProcess = await process.startBackground(
        'rojo',
        ['serve', '--port', selectedPort.toString()],
        'rojo-server',
        {
          cwd: projectPath,
          stdio: ['ignore', 'pipe', 'pipe']
        }
      );

      logger.success(`✓ Rojo server started (PID: ${rojoProcess.pid})`);
      logger.newline();

      // Step 3: Wait for port to open
      logger.info('Waiting for server to be ready...');

      const portReady = await network.waitForPort(
        selectedPort,
        PORT_CHECK_TIMEOUT,
        'localhost',
        500
      );

      if (!portReady) {
        logger.error('Rojo server started but port is not listening.');
        logger.newline();

        // Show server output for debugging
        const status = process.getStatus('rojo-server');
        if (status) {
          if (status.stderr) {
            logger.warning('Server error output:');
            logger.info(status.stderr);
            logger.newline();
          }
          if (status.stdout) {
            logger.info('Server output:');
            logger.info(status.stdout);
            logger.newline();
          }
        }

        // Cleanup
        await process.stop('rojo-server');

        const retry = await prompt.confirm('Try again?', true);
        return { success: false, retry };
      }

      logger.success('✓ Server is ready and listening!');
      logger.newline();

      // Step 4: Verify server is responding
      logger.info('Verifying server connection...');

      const connectionTest = await network.testConnection(
        `http://localhost:${selectedPort}`,
        3000
      );

      if (!connectionTest.success) {
        logger.warning('Server is listening but not responding to requests.');
        logger.info('This might be normal - continuing anyway...');
      } else {
        logger.success('✓ Server is responding to requests');
      }

      logger.newline();

      // Success summary
      logger.divider();
      logger.newline();
      logger.success('Rojo server is running!');
      logger.newline();
      logger.info('Server details:');
      logger.info(`  • Port: ${selectedPort}`);
      logger.info(`  • URL: http://localhost:${selectedPort}`);
      logger.info(`  • Project: ${path.basename(projectPath)}`);
      logger.info(`  • Status: Running in background`);
      logger.newline();

      logger.info('The server will keep running throughout the setup process.');
      logger.info('You can connect to it from Roblox Studio using the Rojo plugin.');
      logger.newline();

      logger.divider();
      logger.newline();

      return {
        success: true,
        data: {
          rojoPort: selectedPort,
          rojoUrl: `http://localhost:${selectedPort}`,
          rojoRunning: true
        }
      };
    } catch (error) {
      logger.error(`Failed to start Rojo server: ${error.message}`);
      logger.newline();

      // Show detailed error info
      if (error.code) {
        logger.warning(`Error code: ${error.code}`);
      }

      // Offer troubleshooting
      logger.info('Common issues:');
      logger.list([
        'Rojo not installed correctly',
        'Another Rojo server already running',
        'Project missing default.project.json',
        'Firewall blocking the port'
      ]);
      logger.newline();

      logger.info('Try these commands manually:');
      logger.info(`  cd ${projectPath}`);
      logger.info(`  rojo serve --port ${DEFAULT_PORT}`);
      logger.newline();

      const retry = await prompt.confirm('Try again?', true);
      return { success: false, retry };
    }
  }
};
