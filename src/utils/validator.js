/**
 * Validator Utilities
 *
 * Functions to check if required tools and commands exist on the system.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const config = require('../config');
const system = require('./system');

/**
 * Check if a command exists in PATH
 * @param {string} command - Command to check
 * @returns {Promise<Object>} Result with found flag and version
 */
async function commandExists(command) {
  try {
    const versionCommand = `${command} --version`;
    const output = execSync(versionCommand, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });

    return {
      found: true,
      version: output.trim().split('\n')[0],
      command
    };
  } catch (error) {
    return {
      found: false,
      version: null,
      command
    };
  }
}

/**
 * Check if Roblox Studio is installed (Windows only)
 * @returns {Promise<Object>} Result with found flag and path
 */
async function checkRobloxStudio() {
  if (!system.isWindows()) {
    return {
      found: false,
      path: null,
      reason: 'Roblox Studio is only available on Windows'
    };
  }

  try {
    const fs = require('fs');

    // Try primary location
    const files = glob.sync(config.WINDOWS.ROBLOX_STUDIO_GLOB.replace(/\\/g, '/'));

    if (files.length > 0) {
      // If multiple versions found, pick the most recently modified one
      const mostRecent = getMostRecentFile(files);
      return {
        found: true,
        path: mostRecent,
        version: extractVersionFromPath(mostRecent),
        allVersions: files.length
      };
    }

    // Try alternative location
    const filesAlt = glob.sync(config.WINDOWS.ROBLOX_STUDIO_GLOB_ALT.replace(/\\/g, '/'));

    if (filesAlt.length > 0) {
      // If multiple versions found, pick the most recently modified one
      const mostRecent = getMostRecentFile(filesAlt);
      return {
        found: true,
        path: mostRecent,
        version: extractVersionFromPath(mostRecent),
        allVersions: filesAlt.length
      };
    }

    return {
      found: false,
      path: null
    };
  } catch (error) {
    return {
      found: false,
      path: null,
      error: error.message
    };
  }
}

/**
 * Get the most recently modified file from a list
 * @param {Array<string>} files - Array of file paths
 * @returns {string} Path to most recent file
 */
function getMostRecentFile(files) {
  const fs = require('fs');

  if (files.length === 1) {
    return files[0];
  }

  // Sort by modification time (most recent first)
  const sorted = files.sort((a, b) => {
    try {
      const statA = fs.statSync(a);
      const statB = fs.statSync(b);
      return statB.mtime.getTime() - statA.mtime.getTime();
    } catch (error) {
      return 0;
    }
  });

  return sorted[0];
}

/**
 * Extract version string from Studio path
 * @param {string} path - Path to RobloxStudioBeta.exe
 * @returns {string|null} Version string (e.g., "version-b0be9ce0740f40b4")
 */
function extractVersionFromPath(path) {
  const match = path.match(/version-([a-f0-9]+)/i);
  return match ? match[0] : null;
}

/**
 * Check if VS Code is installed
 * @returns {Promise<Object>} Result with found flag and version
 */
async function checkVSCode() {
  return await commandExists(config.WINDOWS.VSCODE_COMMAND);
}

/**
 * Check if Git is installed
 * @returns {Promise<Object>} Result with found flag and version
 */
async function checkGit() {
  return await commandExists(config.WINDOWS.GIT_COMMAND);
}

/**
 * Check if Rust is installed
 * @returns {Promise<Object>} Result with found flag and version
 */
async function checkRust() {
  const rustc = await commandExists(config.WINDOWS.RUSTC_COMMAND);
  const cargo = await commandExists(config.WINDOWS.CARGO_COMMAND);

  return {
    found: rustc.found && cargo.found,
    rustc: rustc.found ? rustc.version : null,
    cargo: cargo.found ? cargo.version : null
  };
}

/**
 * Check if Cargo is installed
 * @returns {Promise<Object>} Result with found flag and version
 */
async function checkCargo() {
  return await commandExists(config.WINDOWS.CARGO_COMMAND);
}

/**
 * Check if Rojo is installed
 * @returns {Promise<Object>} Result with found flag and version
 */
async function checkRojo() {
  return await commandExists(config.WINDOWS.ROJO_COMMAND);
}

/**
 * Check if a VS Code extension is installed
 * @param {string} extensionId - Extension ID (e.g., 'johnnymorganz.luau-lsp')
 * @returns {Promise<Object>} Result with found flag
 */
async function checkVSCodeExtension(extensionId) {
  try {
    const output = execSync('code --list-extensions', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });

    const extensions = output.split('\n').map(e => e.trim().toLowerCase());
    const found = extensions.includes(extensionId.toLowerCase());

    return {
      found,
      extensionId
    };
  } catch (error) {
    return {
      found: false,
      extensionId,
      error: error.message
    };
  }
}

/**
 * Check Node.js version
 * @returns {Object} Result with found flag and version
 */
function checkNodeVersion() {
  const version = system.getNodeVersion();
  const isValid = system.isNodeVersionValid(version, config.REQUIRED_NODE_VERSION);

  return {
    found: isValid,
    version,
    required: config.REQUIRED_NODE_VERSION
  };
}

/**
 * Check if a path exists
 * @param {string} filePath - Path to check
 * @returns {boolean} True if exists
 */
function pathExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Check if a directory is writable
 * @param {string} dir - Directory path
 * @returns {boolean} True if writable
 */
function isDirectoryWritable(dir) {
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate project name
 * @param {string} name - Project name
 * @returns {Object} Result with valid flag and reason
 */
function validateProjectName(name) {
  if (!name) {
    return {
      valid: false,
      reason: 'Project name is required'
    };
  }

  if (name.includes(' ')) {
    return {
      valid: false,
      reason: 'Project name cannot contain spaces'
    };
  }

  if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
    return {
      valid: false,
      reason: 'Project name can only contain letters, numbers, hyphens, and underscores'
    };
  }

  if (name.length > 50) {
    return {
      valid: false,
      reason: 'Project name is too long (max 50 characters)'
    };
  }

  // Check if directory already exists
  if (pathExists(path.join(process.cwd(), name))) {
    return {
      valid: false,
      reason: `Directory "${name}" already exists`
    };
  }

  return {
    valid: true,
    reason: null
  };
}

/**
 * Check if an AI CLI binary is available in PATH
 * @param {string} binaryName - Binary name to check (e.g., 'claude', 'gemini')
 * @returns {Promise<Object>} Result with found flag
 */
async function checkAiCli(binaryName) {
  if (!binaryName) {
    return { found: false, binary: null };
  }

  try {
    const result = await commandExists(binaryName);
    return {
      found: result.found,
      binary: binaryName,
      version: result.version
    };
  } catch (error) {
    return {
      found: false,
      binary: binaryName,
      error: error.message
    };
  }
}

module.exports = {
  commandExists,
  checkRobloxStudio,
  checkVSCode,
  checkGit,
  checkRust,
  checkCargo,
  checkRojo,
  checkVSCodeExtension,
  checkNodeVersion,
  pathExists,
  isDirectoryWritable,
  validateProjectName,
  checkAiCli
};
