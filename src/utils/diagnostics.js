/**
 * Diagnostics Utility
 *
 * Provides error diagnosis, system analysis, and recovery suggestions
 * to help users troubleshoot issues during setup.
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const validator = require('./validator');
const system = require('./system');

/**
 * Generate a comprehensive diagnostic report
 * @param {Object} context - Wizard context
 * @param {Error} error - Error that occurred (optional)
 * @param {string} stateName - Name of state where error occurred
 * @returns {Object} Diagnostic report
 */
async function generateDiagnosticReport(context = {}, error = null, stateName = 'unknown') {
  const report = {
    timestamp: new Date().toISOString(),
    system: await getSystemInfo(),
    environment: getEnvironmentInfo(),
    installedTools: await checkInstalledTools(),
    error: error ? formatError(error) : null,
    failedState: stateName,
    context: sanitizeContext(context),
    logs: []
  };

  return report;
}

/**
 * Get system information
 * @returns {Promise<Object>} System info
 */
async function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    version: os.version(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    memory: {
      total: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
      free: Math.round(os.freemem() / 1024 / 1024 / 1024) + ' GB'
    },
    uptime: Math.round(os.uptime() / 60 / 60) + ' hours',
    node: process.version,
    npm: await getToolVersion('npm')
  };
}

/**
 * Get environment information
 * @returns {Object} Environment info
 */
function getEnvironmentInfo() {
  return {
    cwd: process.cwd(),
    home: os.homedir(),
    path: process.env.PATH ? process.env.PATH.split(path.delimiter).slice(0, 10) : [],
    shell: process.env.SHELL || process.env.ComSpec || 'unknown',
    editor: process.env.EDITOR || process.env.VISUAL || 'not set'
  };
}

/**
 * Check which tools are installed
 * @returns {Promise<Object>} Installed tools status
 */
async function checkInstalledTools() {
  const tools = {
    git: await validator.checkGit(),
    rust: await validator.checkRust(),
    cargo: await validator.checkCargo(),
    rojo: await validator.checkRojo(),
    vscode: await validator.checkVSCode(),
    studio: await validator.checkRobloxStudio()
  };

  return tools;
}

/**
 * Get version of a tool
 * @param {string} command - Command to check
 * @returns {Promise<string>} Version string or null
 */
async function getToolVersion(command) {
  try {
    const result = await system.runCommand(`${command} --version`, { timeout: 5000 });
    return result.stdout.trim().split('\n')[0] || 'unknown';
  } catch (error) {
    return null;
  }
}

/**
 * Format error object for report
 * @param {Error} error - Error to format
 * @returns {Object} Formatted error
 */
function formatError(error) {
  return {
    message: error.message,
    code: error.code || 'UNKNOWN',
    stack: error.stack ? error.stack.split('\n').slice(0, 10) : [],
    name: error.name || 'Error'
  };
}

/**
 * Sanitize context to remove sensitive data
 * @param {Object} context - Context to sanitize
 * @returns {Object} Sanitized context
 */
function sanitizeContext(context) {
  const sanitized = { ...context };

  // Remove any potential sensitive data
  delete sanitized.credentials;
  delete sanitized.apiKeys;
  delete sanitized.tokens;

  return sanitized;
}

/**
 * Suggest fixes based on error type
 * @param {Error} error - Error that occurred
 * @param {string} stateName - State where error occurred
 * @returns {Object} Suggestions object with causes and fixes
 */
function suggestFix(error, stateName) {
  const suggestions = {
    state: stateName,
    error: error.message,
    possibleCauses: [],
    suggestedFixes: [],
    commands: []
  };

  // Network errors
  if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    suggestions.possibleCauses.push(
      'Network connection issue',
      'DNS resolution failure',
      'Firewall blocking connection',
      'Proxy configuration needed'
    );
    suggestions.suggestedFixes.push(
      'Check your internet connection',
      'Try disabling VPN or proxy temporarily',
      'Check firewall settings',
      'Wait a moment and retry'
    );
  }

  // Permission errors
  if (error.code === 'EACCES' || error.code === 'EPERM') {
    suggestions.possibleCauses.push(
      'Insufficient permissions',
      'File locked by another process',
      'Antivirus blocking operation'
    );
    suggestions.suggestedFixes.push(
      'Run the installer as administrator',
      'Close any programs that might be using the files',
      'Check antivirus exclusions'
    );
    if (os.platform() === 'win32') {
      suggestions.commands.push('Right-click installer and select "Run as administrator"');
    } else {
      suggestions.commands.push('Run with: sudo node index.js');
    }
  }

  // Disk space errors
  if (error.code === 'ENOSPC') {
    suggestions.possibleCauses.push(
      'Not enough disk space'
    );
    suggestions.suggestedFixes.push(
      'Free up disk space',
      'Choose a different installation directory'
    );
  }

  // Path not found
  if (error.code === 'ENOENT') {
    suggestions.possibleCauses.push(
      'File or directory not found',
      'Tool not in PATH',
      'Incorrect installation path'
    );
    suggestions.suggestedFixes.push(
      'Verify the tool is installed correctly',
      'Check PATH environment variable',
      'Restart terminal to refresh PATH'
    );
  }

  // Rust/Cargo installation issues
  if (stateName === 'rust' || stateName === 'rojo') {
    suggestions.possibleCauses.push(
      'Cargo not in PATH after installation',
      'Rust toolchain not fully installed',
      'Antivirus blocking cargo'
    );
    suggestions.suggestedFixes.push(
      'Restart your terminal or computer',
      'Manually add cargo to PATH',
      'Run: rustup self update',
      'Check antivirus exclusions for cargo.exe'
    );
    suggestions.commands.push(
      'rustup self update',
      'rustup update',
      'cargo --version'
    );
  }

  // Rojo installation issues
  if (stateName === 'rojo') {
    suggestions.possibleCauses.push(
      'Cargo registry slow or unavailable',
      'Build dependencies missing',
      'Network timeout during compilation'
    );
    suggestions.suggestedFixes.push(
      'Try manual installation: cargo install rojo --verbose',
      'Download pre-built binary from GitHub releases',
      'Increase network timeout settings'
    );
    suggestions.commands.push(
      'cargo install rojo --verbose',
      'Visit: https://github.com/rojo-rbx/rojo/releases'
    );
  }

  // VS Code extension issues
  if (stateName === 'vscodeExtensions') {
    suggestions.possibleCauses.push(
      'VS Code not installed correctly',
      'Extensions marketplace unavailable',
      'Code command not in PATH'
    );
    suggestions.suggestedFixes.push(
      'Restart VS Code',
      'Install extensions manually from marketplace',
      'Run VS Code as administrator',
      'Check internet connection to marketplace'
    );
    suggestions.commands.push(
      'code --list-extensions',
      'code --install-extension JohnnyMorganz.luau-lsp'
    );
  }

  // Roblox Studio issues
  if (stateName === 'robloxStudio') {
    suggestions.possibleCauses.push(
      'Studio installer failed to download',
      'Installation was interrupted',
      'Studio installed but not detected'
    );
    suggestions.suggestedFixes.push(
      'Try downloading installer manually',
      'Check if Studio is already installed',
      'Restart computer after installation'
    );
    if (os.platform() === 'win32') {
      suggestions.commands.push(
        'Check: C:\\Users\\<username>\\AppData\\Local\\Roblox\\Versions'
      );
    } else if (os.platform() === 'darwin') {
      suggestions.commands.push(
        'Check: /Applications/RobloxStudio.app'
      );
    }
  }

  // Scaffold/GitHub issues
  if (stateName === 'scaffold') {
    suggestions.possibleCauses.push(
      'GitHub repository unavailable',
      'Network timeout during download',
      'Extraction failed due to permissions'
    );
    suggestions.suggestedFixes.push(
      'Check GitHub status: https://www.githubstatus.com',
      'Verify repository exists: https://github.com/avalonreset/yoblox',
      'Try again with better internet connection',
      'Run installer as administrator'
    );
  }

  // If no specific suggestions, provide generic ones
  if (suggestions.possibleCauses.length === 0) {
    suggestions.possibleCauses.push(
      'Unexpected error occurred',
      'System configuration issue'
    );
    suggestions.suggestedFixes.push(
      'Try running the installer again',
      'Check system requirements',
      'Search for error code: ' + (error.code || error.name)
    );
  }

  return suggestions;
}

/**
 * Export diagnostic report to file
 * @param {Object} report - Diagnostic report
 * @param {string} destination - File path (optional)
 * @returns {Promise<string>} Path to saved file
 */
async function exportLogs(report, destination = null) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = destination || path.join(
    os.tmpdir(),
    `yoblox-setup-diagnostic-${timestamp}.json`
  );

  try {
    fs.writeFileSync(filename, JSON.stringify(report, null, 2), 'utf8');
    return filename;
  } catch (error) {
    logger.error(`Failed to export logs: ${error.message}`);
    return null;
  }
}

/**
 * Print diagnostic report to console
 * @param {Object} report - Diagnostic report
 */
function printReport(report) {
  logger.newline();
  logger.divider();
  logger.error('DIAGNOSTIC REPORT');
  logger.divider();
  logger.newline();

  logger.info(`Time: ${report.timestamp}`);
  logger.info(`OS: ${report.system.platform} ${report.system.release}`);
  logger.info(`Node: ${report.system.node}`);
  logger.info(`Failed State: ${report.failedState}`);
  logger.newline();

  if (report.error) {
    logger.error(`Error: ${report.error.message}`);
    if (report.error.code) {
      logger.error(`Code: ${report.error.code}`);
    }
    logger.newline();
  }

  logger.info('Installed Tools:');
  for (const [tool, status] of Object.entries(report.installedTools)) {
    const symbol = status.found ? '✓' : '✗';
    const version = status.version ? ` (${status.version})` : '';
    logger.info(`  ${symbol} ${tool}${version}`);
  }
  logger.newline();

  logger.divider();
}

/**
 * Print suggestions to console
 * @param {Object} suggestions - Suggestions object
 */
function printSuggestions(suggestions) {
  logger.newline();
  logger.warning('Troubleshooting Suggestions:');
  logger.newline();

  if (suggestions.possibleCauses.length > 0) {
    logger.info('Possible Causes:');
    suggestions.possibleCauses.forEach((cause, i) => {
      logger.info(`  ${i + 1}. ${cause}`);
    });
    logger.newline();
  }

  if (suggestions.suggestedFixes.length > 0) {
    logger.info('Suggested Fixes:');
    suggestions.suggestedFixes.forEach((fix, i) => {
      logger.info(`  ${i + 1}. ${fix}`);
    });
    logger.newline();
  }

  if (suggestions.commands.length > 0) {
    logger.info('Try these commands:');
    suggestions.commands.forEach((cmd) => {
      logger.info(`  ${cmd}`);
    });
    logger.newline();
  }
}

/**
 * Check system requirements
 * @returns {Promise<Object>} Requirements check result
 */
async function checkSystemRequirements() {
  const requirements = {
    met: true,
    issues: []
  };

  // Check Node version
  const nodeVersion = process.version.slice(1); // Remove 'v' prefix
  if (!validator.compareVersions(nodeVersion, '14.0.0')) {
    requirements.met = false;
    requirements.issues.push(`Node.js version ${nodeVersion} is too old. Need 14.0.0 or higher.`);
  }

  // Check disk space
  const freeMem = os.freemem();
  const freeGB = freeMem / 1024 / 1024 / 1024;
  if (freeGB < 2) {
    requirements.met = false;
    requirements.issues.push(`Low available memory: ${freeGB.toFixed(1)} GB. Need at least 2 GB free.`);
  }

  // Check platform
  const platform = os.platform();
  if (platform !== 'win32' && platform !== 'darwin' && platform !== 'linux') {
    requirements.met = false;
    requirements.issues.push(`Unsupported platform: ${platform}`);
  }

  // Check internet connection
  const network = require('./network');
  const hasInternet = await network.hasInternetConnection();
  if (!hasInternet) {
    requirements.met = false;
    requirements.issues.push('No internet connection detected');
  }

  return requirements;
}

module.exports = {
  generateDiagnosticReport,
  suggestFix,
  exportLogs,
  printReport,
  printSuggestions,
  checkSystemRequirements,
  getSystemInfo,
  checkInstalledTools
};
