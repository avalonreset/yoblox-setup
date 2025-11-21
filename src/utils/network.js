/**
 * Network Utility
 *
 * Provides port checking, availability testing, and connection
 * verification for the Rojo server and other network operations.
 */

const net = require('net');
const http = require('http');
const https = require('https');
const logger = require('./logger');

/**
 * Check if a port is open (listening)
 * @param {number} port - Port number to check
 * @param {string} host - Host to check (default: localhost)
 * @returns {Promise<boolean>} True if port is open
 */
async function isPortOpen(port, host = 'localhost') {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(2000);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Check if a port is available (not in use)
 * @param {number} port - Port number to check
 * @param {string} host - Host to check (default: 0.0.0.0)
 * @returns {Promise<boolean>} True if port is available
 */
async function isPortAvailable(port, host = '0.0.0.0') {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port, host);
  });
}

/**
 * Find next available port starting from a given port
 * @param {number} startPort - Port to start checking from
 * @param {number} maxAttempts - Maximum number of ports to try (default: 10)
 * @returns {Promise<number|null>} Available port or null if none found
 */
async function findFreePort(startPort, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);

    if (available) {
      return port;
    }
  }

  return null;
}

/**
 * Wait for a port to become open (listening)
 * @param {number} port - Port to wait for
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @param {string} host - Host to check (default: localhost)
 * @param {number} interval - Check interval in ms (default: 500)
 * @returns {Promise<boolean>} True if port opened, false if timeout
 */
async function waitForPort(port, timeout = 30000, host = 'localhost', interval = 500) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const open = await isPortOpen(port, host);

    if (open) {
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return false;
}

/**
 * Test HTTP/HTTPS connection to a URL
 * @param {string} url - URL to test
 * @param {number} timeout - Request timeout in ms (default: 5000)
 * @returns {Promise<Object>} Result with success flag and details
 */
async function testConnection(url, timeout = 5000) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      const req = protocol.get(url, { timeout }, (res) => {
        resolve({
          success: true,
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers
        });

        // Consume response to free up memory
        res.resume();
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: 'Connection timeout',
          code: 'ETIMEDOUT'
        });
      });

      req.on('error', (err) => {
        resolve({
          success: false,
          error: err.message,
          code: err.code
        });
      });
    } catch (error) {
      resolve({
        success: false,
        error: error.message,
        code: 'INVALID_URL'
      });
    }
  });
}

/**
 * Get local network interfaces with IP addresses
 * @returns {Array<Object>} Array of network interfaces
 */
function getNetworkInterfaces() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  const result = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      if (!addr.internal) {
        result.push({
          name,
          family: addr.family,
          address: addr.address,
          cidr: addr.cidr
        });
      }
    }
  }

  return result;
}

/**
 * Check if system has internet connectivity
 * @param {Array<string>} testUrls - URLs to test (default: common DNS servers)
 * @returns {Promise<boolean>} True if connected
 */
async function hasInternetConnection(testUrls = ['https://1.1.1.1', 'https://8.8.8.8']) {
  for (const url of testUrls) {
    const result = await testConnection(url, 3000);
    if (result.success) {
      return true;
    }
  }

  return false;
}

/**
 * Wait for internet connection to become available
 * @param {number} timeout - Timeout in ms (default: 60000)
 * @param {number} interval - Check interval in ms (default: 2000)
 * @returns {Promise<boolean>} True if connected, false if timeout
 */
async function waitForInternet(timeout = 60000, interval = 2000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const connected = await hasInternetConnection();

    if (connected) {
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return false;
}

/**
 * Get a list of occupied ports from a range
 * @param {number} startPort - Start of range
 * @param {number} endPort - End of range
 * @returns {Promise<Array<number>>} Array of occupied ports
 */
async function getOccupiedPorts(startPort, endPort) {
  const occupied = [];

  for (let port = startPort; port <= endPort; port++) {
    const available = await isPortAvailable(port);
    if (!available) {
      occupied.push(port);
    }
  }

  return occupied;
}

module.exports = {
  isPortOpen,
  isPortAvailable,
  findFreePort,
  waitForPort,
  testConnection,
  getNetworkInterfaces,
  hasInternetConnection,
  waitForInternet,
  getOccupiedPorts
};
