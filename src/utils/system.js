/**
 * System Utilities
 *
 * Functions for detecting OS, shell, Node version, and system capabilities.
 */

const os = require('os');
const { execSync } = require('child_process');
const semver = require('semver');

/**
 * Get the operating system
 * @returns {string} 'windows', 'macos', or 'linux'
 */
function getOS() {
  const platform = os.platform();

  switch (platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'macos';
    case 'linux':
      return 'linux';
    default:
      return platform;
  }
}

/**
 * Get the current shell
 * @returns {string} 'powershell', 'cmd', 'bash', 'zsh', or 'unknown'
 */
function getShell() {
  if (process.env.SHELL) {
    const shell = process.env.SHELL.toLowerCase();
    if (shell.includes('bash')) return 'bash';
    if (shell.includes('zsh')) return 'zsh';
    if (shell.includes('fish')) return 'fish';
  }

  // Windows
  if (getOS() === 'windows') {
    if (process.env.PSModulePath) return 'powershell';
    return 'cmd';
  }

  return 'unknown';
}

/**
 * Check if running as administrator (Windows only)
 * @returns {boolean} True if running as admin
 */
function isAdmin() {
  if (getOS() !== 'windows') {
    return false;
  }

  try {
    execSync('net session', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get Node.js version
 * @returns {string} Node version (e.g., '18.12.0')
 */
function getNodeVersion() {
  return process.version.replace('v', '');
}

/**
 * Check if Node version meets minimum requirement
 * @param {string} current - Current version
 * @param {string} required - Required version
 * @returns {boolean} True if current >= required
 */
function isNodeVersionValid(current, required) {
  try {
    return semver.gte(current, required);
  } catch (error) {
    return false;
  }
}

/**
 * Get current PATH environment variable
 * @returns {string} PATH value
 */
function getPATH() {
  return process.env.PATH || '';
}

/**
 * Get home directory
 * @returns {string} Home directory path
 */
function getHomeDir() {
  return os.homedir();
}

/**
 * Get username
 * @returns {string} Current username
 */
function getUsername() {
  return os.userInfo().username;
}

/**
 * Expand environment variables in a path (Windows-style)
 * @param {string} path - Path with environment variables
 * @returns {string} Expanded path
 */
function expandPath(path) {
  if (!path) return path;

  // Replace Windows-style environment variables
  return path.replace(/%([^%]+)%/g, (_, name) => {
    return process.env[name] || `%${name}%`;
  });
}

/**
 * Check if running on Windows
 * @returns {boolean} True if Windows
 */
function isWindows() {
  return getOS() === 'windows';
}

/**
 * Check if running on macOS
 * @returns {boolean} True if macOS
 */
function isMacOS() {
  return getOS() === 'macos';
}

/**
 * Check if running on Linux
 * @returns {boolean} True if Linux
 */
function isLinux() {
  return getOS() === 'linux';
}

/**
 * Get system architecture
 * @returns {string} Architecture (e.g., 'x64', 'arm64')
 */
function getArch() {
  return os.arch();
}

module.exports = {
  getOS,
  getShell,
  isAdmin,
  getNodeVersion,
  isNodeVersionValid,
  getPATH,
  getHomeDir,
  getUsername,
  expandPath,
  isWindows,
  isMacOS,
  isLinux,
  getArch
};
