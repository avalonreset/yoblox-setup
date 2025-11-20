/**
 * Installer Utilities
 *
 * Functions for downloading files, running installers, and opening URLs.
 */

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const got = require('got');
const execa = require('execa');
const open = require('open');
const logger = require('./logger');
const config = require('../config');

const streamPipeline = promisify(pipeline);

/**
 * Download a file from a URL with progress tracking
 * @param {string} url - URL to download from
 * @param {string} destination - Destination file path
 * @returns {Promise<void>}
 */
async function downloadFile(url, destination) {
  const dir = path.dirname(destination);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const downloadStream = got.stream(url);
  const fileWriterStream = fs.createWriteStream(destination);

  // Create progress bar
  let totalBytes = 0;
  let downloadedBytes = 0;
  let progressBar = null;

  downloadStream.on('downloadProgress', ({ transferred, total }) => {
    if (total && !progressBar) {
      totalBytes = total;
      progressBar = logger.progressBar();
      progressBar.start(total, 0, { label: 'Downloading' });
    }

    if (progressBar) {
      downloadedBytes = transferred;
      progressBar.update(transferred);
    }
  });

  try {
    await streamPipeline(downloadStream, fileWriterStream);

    if (progressBar) {
      progressBar.stop();
    }

    logger.success(`Downloaded to ${destination}`);
  } catch (error) {
    if (progressBar) {
      progressBar.stop();
    }
    throw new Error(`Download failed: ${error.message}`);
  }
}

/**
 * Run a command with live output streaming
 * @param {string} command - Command to run
 * @param {Array<string>} args - Command arguments
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Result with stdout, stderr, exitCode
 */
async function runCommand(command, args = [], options = {}) {
  const defaultOptions = {
    timeout: config.COMMAND_TIMEOUT,
    shell: true,
    stdio: 'inherit',
    ...options
  };

  try {
    const result = await execa(command, args, defaultOptions);

    return {
      success: true,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode
    };
  } catch (error) {
    return {
      success: false,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.exitCode || 1,
      error: error.message
    };
  }
}

/**
 * Run a command silently and return output
 * @param {string} command - Command to run
 * @param {Array<string>} args - Command arguments
 * @returns {Promise<Object>} Result with stdout and success flag
 */
async function runCommandSilent(command, args = []) {
  try {
    const result = await execa(command, args, {
      timeout: config.COMMAND_TIMEOUT,
      shell: true,
      stdio: 'pipe'
    });

    return {
      success: true,
      stdout: result.stdout,
      stderr: result.stderr
    };
  } catch (error) {
    return {
      success: false,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      error: error.message
    };
  }
}

/**
 * Install a VS Code extension
 * @param {string} extensionId - Extension ID
 * @returns {Promise<boolean>} Success flag
 */
async function installVSCodeExtension(extensionId) {
  const spin = logger.spinner(`Installing ${extensionId}...`).start();

  try {
    const result = await runCommandSilent('code', ['--install-extension', extensionId]);

    if (result.success) {
      spin.succeed(`Installed ${extensionId}`);
      return true;
    } else {
      spin.fail(`Failed to install ${extensionId}`);
      logger.error(result.stderr || result.error);
      return false;
    }
  } catch (error) {
    spin.fail(`Failed to install ${extensionId}`);
    logger.error(error.message);
    return false;
  }
}

/**
 * Install Rojo via Cargo
 * @returns {Promise<boolean>} Success flag
 */
async function installRojo() {
  logger.info('Installing Rojo via Cargo...');
  logger.warning('This may take 5-10 minutes. Please be patient.');
  logger.newline();

  const result = await runCommand('cargo', ['install', 'rojo']);

  if (result.success) {
    logger.success('Rojo installed successfully!');
    return true;
  } else {
    logger.error('Failed to install Rojo');
    logger.error(result.stderr || result.error);
    return false;
  }
}

/**
 * Install an npm package globally
 * @param {string} packageName - Package name
 * @returns {Promise<boolean>} Success flag
 */
async function installNpmPackage(packageName) {
  logger.info(`Installing ${packageName} globally...`);

  const result = await runCommand('npm', ['install', '-g', packageName]);

  if (result.success) {
    logger.success(`${packageName} installed successfully!`);
    return true;
  } else {
    logger.error(`Failed to install ${packageName}`);
    logger.error(result.stderr || result.error);
    return false;
  }
}

/**
 * Open a URL in the default browser
 * @param {string} url - URL to open
 * @returns {Promise<void>}
 */
async function openURL(url) {
  try {
    await open(url);
    logger.info(`Opened ${url} in your browser`);
  } catch (error) {
    logger.warning(`Could not open browser automatically. Please visit: ${url}`);
  }
}

/**
 * Wait for a file to exist (polling)
 * @param {string} filePath - Path to wait for
 * @param {number} timeout - Timeout in ms (default: 60000)
 * @param {number} interval - Check interval in ms (default: 1000)
 * @returns {Promise<boolean>} True if file was found
 */
async function waitForFile(filePath, timeout = 60000, interval = 1000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (fs.existsSync(filePath)) {
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return false;
}

/**
 * Execute a shell command and return output
 * @param {string} command - Full command string
 * @returns {Promise<string>} Command output
 */
async function execCommand(command) {
  try {
    const result = await execa.command(command, {
      shell: true,
      stdio: 'pipe'
    });
    return result.stdout;
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = {
  downloadFile,
  runCommand,
  runCommandSilent,
  installVSCodeExtension,
  installRojo,
  installNpmPackage,
  openURL,
  waitForFile,
  execCommand
};
