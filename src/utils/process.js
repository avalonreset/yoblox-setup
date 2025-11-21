/**
 * Process Management Utility
 *
 * Manages background processes like Rojo server, providing
 * start, stop, status checking, and cleanup functionality.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Active processes registry
const processes = new Map();

/**
 * Start a background process
 * @param {string} command - Command to run
 * @param {Array<string>} args - Command arguments
 * @param {string} name - Process name for tracking
 * @param {Object} options - Spawn options
 * @returns {Promise<Object>} Process info
 */
async function startBackground(command, args = [], name = 'process', options = {}) {
  // Check if already running
  if (processes.has(name)) {
    const existing = processes.get(name);
    if (existing.process && !existing.process.killed) {
      logger.warning(`Process "${name}" is already running`);
      return existing;
    }
  }

  const defaultOptions = {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    detached: false,
    ...options
  };

  return new Promise((resolve, reject) => {
    try {
      const proc = spawn(command, args, defaultOptions);

      const processInfo = {
        name,
        command,
        args,
        process: proc,
        pid: proc.pid,
        startTime: Date.now(),
        stdout: '',
        stderr: ''
      };

      // Capture output
      if (proc.stdout) {
        proc.stdout.on('data', (data) => {
          processInfo.stdout += data.toString();
        });
      }

      if (proc.stderr) {
        proc.stderr.on('data', (data) => {
          processInfo.stderr += data.toString();
        });
      }

      // Handle process exit
      proc.on('exit', (code, signal) => {
        processInfo.exitCode = code;
        processInfo.signal = signal;
        processInfo.endTime = Date.now();

        logger.debug(`Process "${name}" exited with code ${code}`);
      });

      proc.on('error', (error) => {
        processInfo.error = error;
        logger.error(`Process "${name}" error: ${error.message}`);
      });

      // Store process
      processes.set(name, processInfo);

      // Give process time to start
      setTimeout(() => {
        if (proc.killed) {
          reject(new Error(`Process "${name}" failed to start`));
        } else {
          resolve(processInfo);
        }
      }, 1000);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Stop a background process
 * @param {string} name - Process name
 * @returns {Promise<boolean>} Success flag
 */
async function stop(name) {
  if (!processes.has(name)) {
    return false;
  }

  const processInfo = processes.get(name);
  const { process: proc } = processInfo;

  if (!proc || proc.killed) {
    processes.delete(name);
    return true;
  }

  return new Promise((resolve) => {
    // Try graceful shutdown first
    proc.kill('SIGTERM');

    // Force kill after timeout
    const killTimeout = setTimeout(() => {
      if (!proc.killed) {
        proc.kill('SIGKILL');
      }
    }, 5000);

    proc.on('exit', () => {
      clearTimeout(killTimeout);
      processes.delete(name);
      resolve(true);
    });
  });
}

/**
 * Stop all managed processes
 * @returns {Promise<void>}
 */
async function stopAll() {
  const names = Array.from(processes.keys());

  for (const name of names) {
    await stop(name);
  }
}

/**
 * Check if a process is running
 * @param {string} name - Process name
 * @returns {boolean} True if running
 */
function isRunning(name) {
  if (!processes.has(name)) {
    return false;
  }

  const processInfo = processes.get(name);
  return processInfo.process && !processInfo.process.killed;
}

/**
 * Get process status
 * @param {string} name - Process name
 * @returns {Object|null} Process info or null
 */
function getStatus(name) {
  if (!processes.has(name)) {
    return null;
  }

  const processInfo = processes.get(name);

  return {
    name: processInfo.name,
    pid: processInfo.pid,
    running: isRunning(name),
    startTime: processInfo.startTime,
    uptime: Date.now() - processInfo.startTime,
    stdout: processInfo.stdout,
    stderr: processInfo.stderr,
    exitCode: processInfo.exitCode,
    error: processInfo.error
  };
}

/**
 * Get all running processes
 * @returns {Array<string>} Array of process names
 */
function getRunning() {
  return Array.from(processes.keys()).filter(name => isRunning(name));
}

/**
 * Get output from a process
 * @param {string} name - Process name
 * @param {string} stream - 'stdout' or 'stderr'
 * @returns {string} Output content
 */
function getOutput(name, stream = 'stdout') {
  const processInfo = processes.get(name);
  if (!processInfo) {
    return '';
  }

  return stream === 'stderr' ? processInfo.stderr : processInfo.stdout;
}

/**
 * Wait for process output to contain a specific string
 * @param {string} name - Process name
 * @param {string} match - String to match
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<boolean>} True if found
 */
async function waitForOutput(name, match, timeout = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const processInfo = processes.get(name);
    if (!processInfo) {
      return false;
    }

    const output = processInfo.stdout + processInfo.stderr;
    if (output.includes(match)) {
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return false;
}

// Cleanup on process exit
process.on('exit', () => {
  stopAll();
});

process.on('SIGINT', async () => {
  await stopAll();
  process.exit(0);
});

module.exports = {
  startBackground,
  stop,
  stopAll,
  isRunning,
  getStatus,
  getRunning,
  getOutput,
  waitForOutput
};
