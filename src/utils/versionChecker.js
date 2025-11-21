/**
 * Version Checker Utility
 *
 * Checks if installed components have newer versions available
 * and helps users keep their development environment up-to-date.
 */

const { execSync } = require('child_process');
const https = require('https');
const logger = require('./logger');

/**
 * Compare two semantic versions
 * @param {string} current - Current version (e.g., "7.3.0")
 * @param {string} latest - Latest version (e.g., "7.4.0")
 * @returns {number} -1 if current < latest, 0 if equal, 1 if current > latest
 */
function compareVersions(current, latest) {
  if (!current || !latest) return 0;

  // Clean version strings (remove 'v' prefix, git hashes, etc.)
  const cleanCurrent = current.replace(/^v/, '').split(/[-+]/)[0];
  const cleanLatest = latest.replace(/^v/, '').split(/[-+]/)[0];

  const currentParts = cleanCurrent.split('.').map(Number);
  const latestParts = cleanLatest.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const curr = currentParts[i] || 0;
    const lat = latestParts[i] || 0;

    if (curr < lat) return -1;
    if (curr > lat) return 1;
  }

  return 0;
}

/**
 * Fetch latest Rojo version from GitHub releases
 * @returns {Promise<string|null>} Latest version or null
 */
async function getLatestRojoVersion() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/rojo-rbx/rojo/releases/latest',
      method: 'GET',
      headers: {
        'User-Agent': 'yoblox-setup'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const version = release.tag_name?.replace(/^v/, '');
          resolve(version || null);
        } catch (error) {
          resolve(null);
        }
      });
    });

    req.on('error', () => {
      resolve(null);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

/**
 * Get current Rojo version
 * @returns {Promise<string|null>} Current version or null
 */
async function getCurrentRojoVersion() {
  try {
    const output = execSync('rojo --version', { encoding: 'utf8', timeout: 5000 });
    const match = output.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if Rojo has an update available
 * @returns {Promise<Object>} Update info { hasUpdate, current, latest }
 */
async function checkRojoUpdate() {
  try {
    const current = await getCurrentRojoVersion();
    const latest = await getLatestRojoVersion();

    if (!current || !latest) {
      return { hasUpdate: false, current, latest, error: 'Could not check version' };
    }

    const hasUpdate = compareVersions(current, latest) < 0;

    return {
      hasUpdate,
      current,
      latest,
      tool: 'Rojo'
    };
  } catch (error) {
    return { hasUpdate: false, error: error.message };
  }
}

/**
 * Get current Git version
 * @returns {Promise<string|null>} Current version or null
 */
async function getCurrentGitVersion() {
  try {
    const output = execSync('git --version', { encoding: 'utf8', timeout: 5000 });
    const match = output.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Get latest Git version from GitHub
 * @returns {Promise<string|null>} Latest version or null
 */
async function getLatestGitVersion() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/git/git/tags',
      method: 'GET',
      headers: {
        'User-Agent': 'yoblox-setup'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const tags = JSON.parse(data);
          // Find first tag that looks like a version (v2.x.x)
          const versionTag = tags.find(tag => /^v\d+\.\d+\.\d+$/.test(tag.name));
          const version = versionTag?.name?.replace(/^v/, '');
          resolve(version || null);
        } catch (error) {
          resolve(null);
        }
      });
    });

    req.on('error', () => {
      resolve(null);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

/**
 * Check if Git has an update available
 * @returns {Promise<Object>} Update info
 */
async function checkGitUpdate() {
  try {
    const current = await getCurrentGitVersion();
    const latest = await getLatestGitVersion();

    if (!current || !latest) {
      return { hasUpdate: false, current, latest, error: 'Could not check version' };
    }

    const hasUpdate = compareVersions(current, latest) < 0;

    return {
      hasUpdate,
      current,
      latest,
      tool: 'Git'
    };
  } catch (error) {
    return { hasUpdate: false, error: error.message };
  }
}

/**
 * Get current Rust version
 * @returns {Promise<string|null>} Current version or null
 */
async function getCurrentRustVersion() {
  try {
    const output = execSync('rustc --version', { encoding: 'utf8', timeout: 5000 });
    const match = output.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Get latest stable Rust version
 * @returns {Promise<string|null>} Latest version or null
 */
async function getLatestRustVersion() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'static.rust-lang.org',
      path: '/dist/channel-rust-stable.toml',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          // Parse TOML for version
          const match = data.match(/version\s*=\s*"(\d+\.\d+\.\d+)"/);
          resolve(match ? match[1] : null);
        } catch (error) {
          resolve(null);
        }
      });
    });

    req.on('error', () => {
      resolve(null);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

/**
 * Check if Rust has an update available
 * @returns {Promise<Object>} Update info
 */
async function checkRustUpdate() {
  try {
    const current = await getCurrentRustVersion();
    const latest = await getLatestRustVersion();

    if (!current || !latest) {
      return { hasUpdate: false, current, latest, error: 'Could not check version' };
    }

    const hasUpdate = compareVersions(current, latest) < 0;

    return {
      hasUpdate,
      current,
      latest,
      tool: 'Rust'
    };
  } catch (error) {
    return { hasUpdate: false, error: error.message };
  }
}

/**
 * Check if a VS Code extension has an update
 * @param {string} extensionId - Extension ID (e.g., 'johnnymorganz.luau-lsp')
 * @returns {Promise<Object>} Update info
 */
async function checkVSCodeExtensionUpdate(extensionId) {
  try {
    // Get installed version
    const installed = execSync(`code --list-extensions --show-versions | findstr /C:"${extensionId}"`, {
      encoding: 'utf8',
      timeout: 5000,
      shell: true
    });

    const installedMatch = installed.match(/@(.+)/);
    const installedVersion = installedMatch ? installedMatch[1].trim() : null;

    if (!installedVersion) {
      return { hasUpdate: false, error: 'Extension not installed' };
    }

    // Get latest version from VS Code marketplace
    const latest = await getLatestVSCodeExtensionVersion(extensionId);

    if (!latest) {
      return { hasUpdate: false, current: installedVersion, error: 'Could not check marketplace' };
    }

    const hasUpdate = compareVersions(installedVersion, latest) < 0;

    return {
      hasUpdate,
      current: installedVersion,
      latest,
      tool: `Extension: ${extensionId}`
    };
  } catch (error) {
    return { hasUpdate: false, error: error.message };
  }
}

/**
 * Get latest version of a VS Code extension from marketplace
 * @param {string} extensionId - Extension ID
 * @returns {Promise<string|null>} Latest version or null
 */
async function getLatestVSCodeExtensionVersion(extensionId) {
  return new Promise((resolve) => {
    const [publisher, name] = extensionId.split('.');

    const postData = JSON.stringify({
      filters: [{
        criteria: [
          { filterType: 7, value: `${publisher}.${name}` }
        ]
      }],
      flags: 914
    });

    const options = {
      hostname: 'marketplace.visualstudio.com',
      path: '/_apis/public/gallery/extensionquery',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;api-version=3.0-preview.1',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const extension = response.results?.[0]?.extensions?.[0];
          const version = extension?.versions?.[0]?.version;
          resolve(version || null);
        } catch (error) {
          resolve(null);
        }
      });
    });

    req.on('error', () => {
      resolve(null);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Check if Roblox Studio needs update based on file age
 * @param {string} studioPath - Path to Studio executable
 * @returns {Object} Update info
 */
function checkStudioUpdateByAge(studioPath) {
  const fs = require('fs');

  try {
    if (!studioPath || !fs.existsSync(studioPath)) {
      return { needsUpdate: false, error: 'Studio path not found' };
    }

    const stats = fs.statSync(studioPath);
    const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

    // Consider Studio outdated if older than 14 days
    const needsUpdate = daysSinceModified > 14;

    return {
      needsUpdate,
      daysSinceModified: Math.floor(daysSinceModified),
      tool: 'Roblox Studio',
      lastModified: stats.mtime.toISOString()
    };
  } catch (error) {
    return { needsUpdate: false, error: error.message };
  }
}

/**
 * Display update information to user
 * @param {Object} updateInfo - Update information object
 */
function displayUpdateInfo(updateInfo) {
  if (updateInfo.error) {
    logger.warning(`Could not check for updates: ${updateInfo.error}`);
    return;
  }

  if (!updateInfo.hasUpdate && !updateInfo.needsUpdate) {
    logger.success(`✓ ${updateInfo.tool} is up-to-date`);
    if (updateInfo.current) {
      logger.info(`  Current version: ${updateInfo.current}`);
    }
    return;
  }

  // Has update available
  logger.warning(`⚠️  ${updateInfo.tool} has an update available!`);
  if (updateInfo.current && updateInfo.latest) {
    logger.info(`  Current version: ${updateInfo.current}`);
    logger.info(`  Latest version: ${updateInfo.latest}`);
  } else if (updateInfo.daysSinceModified) {
    logger.info(`  Last updated: ${updateInfo.daysSinceModified} days ago`);
    logger.info(`  Recommended: Update every 14 days`);
  }
}

module.exports = {
  compareVersions,
  checkRojoUpdate,
  checkGitUpdate,
  checkRustUpdate,
  checkVSCodeExtensionUpdate,
  checkStudioUpdateByAge,
  displayUpdateInfo,
  getLatestRojoVersion,
  getCurrentRojoVersion
};
