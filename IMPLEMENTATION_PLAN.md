# yoblox-setup v2.0 - Implementation Plan

## Executive Summary

This document outlines the complete redesign of yoblox-setup into a foolproof, production-grade Roblox development environment installer.

## Critical New Features

### 1. **Rojo Server Management** (State 10)
Automatically starts and manages `rojo serve` in the background:
- Launches Rojo server
- Verifies port 34872 is listening
- Falls back to ports 34873, 34874 if conflicts
- Keeps server running throughout setup
- Provides server status in real-time

### 2. **Studio Sync Setup** (State 11)
Guides user through Roblox Studio + Rojo plugin setup:
- Launches Roblox Studio automatically
- Opens Rojo plugin marketplace
- Waits for user to install plugin
- Guides user to click "Connect"
- Verifies connection established

### 3. **End-to-End Verification** (State 12)
**Most Important State** - Proves everything works:
- Creates `_test_sync.lua` in project
- Watches for it to appear in Studio
- User confirms they see the file
- Deletes test file
- **This is the golden path - if this works, EVERYTHING works**

### 4. **Interactive Final Summary** (State 13)
Beautiful completion experience:
- ASCII art celebration
- Summary of installed components
- Interactive menu:
  - Launch VS Code
  - Start Rojo (if not running)
  - Open Studio
  - View docs
  - Exit

## New Utility Modules

### `src/utils/process.js`
**Process Management**
```javascript
startBackground(command, args, name)  // Start background process
stopAll()                              // Kill all managed processes
getStatus(name)                        // Get process status
isRunning(name)                        // Check if process alive
```

### `src/utils/network.js`
**Port & Network Management**
```javascript
isPortOpen(port)           // Check if port is listening
findFreePort(startPort)    // Find next available port
waitForPort(port, timeout) // Wait until port opens
testConnection(url)        // Test HTTP connection
```

### `src/utils/diagnostics.js`
**Error Diagnosis & Recovery**
```javascript
generateDiagnosticReport()     // Create detailed error log
suggestFix(errorType)          // Provide recovery suggestions
checkSystemRequirements()      // Validate system capabilities
exportLogs(destination)        // Save logs for troubleshooting
```

## Enhanced Configuration

### New Config Sections

```javascript
// Rojo server configuration
ROJO: {
  DEFAULT_PORT: 34872,
  FALLBACK_PORTS: [34873, 34874, 34875],
  STARTUP_TIMEOUT: 10000,  // 10 seconds
  HEALTH_CHECK_INTERVAL: 2000
},

// Roblox Studio configuration
STUDIO: {
  PLUGIN_MARKETPLACE_URL: 'https://www.roblox.com/library/13916111004/Rojo',
  LAUNCH_TIMEOUT: 30000,
  SYNC_TEST_TIMEOUT: 60000
},

// Verification configuration
VERIFICATION: {
  TEST_FILE_NAME: '_yoblox_test_sync.lua',
  TEST_FILE_CONTENT: '-- Test file created by yoblox-setup\\nprint("Sync working!")',
  WAIT_FOR_SYNC_TIMEOUT: 30000
},

// Minimum version requirements
MIN_VERSIONS: {
  node: '14.0.0',
  cargo: '1.70.0',
  rojo: '7.0.0',
  rustc: '1.70.0'
}
```

## State Machine Improvements

### Enhanced State Interface

Every state now implements:

```javascript
module.exports = {
  name: 'stateName',
  order: 5,  // NEW: Explicit ordering

  async check(context) {
    // Quick check if state can be skipped
    return { found: boolean, canSkip: boolean };
  },

  async verify(context) {
    // NEW: Deep verification that component actually works
    return { verified: boolean, issues: [] };
  },

  async run(context) {
    // Execute state logic
    return { success: boolean, retry: boolean, data: {} };
  },

  async cleanup(context) {
    // NEW: Cleanup if wizard interrupted
    // Stop processes, delete temp files, etc.
  }
};
```

### State Machine Features

**Progress Tracking**
```
[Step 5/13] Installing Rojo...
[████████░░░░░░] 62% complete
Estimated time remaining: 3 minutes
```

**Checkpoint System**
- Save progress after each successful state
- Resume from last checkpoint on interruption
- Clear checkpoints after full success

**Graceful Shutdown**
```javascript
process.on('SIGINT', async () => {
  logger.warning('Setup interrupted...');
  await stateMachine.cleanup();  // NEW
  await stateMachine.saveProgress();
  process.exit(0);
});
```

## Critical Implementation Details

### Rojo Server Management (State 10)

```javascript
// Start Rojo in background
const rojoPort = await network.findFreePort(34872);
await process.startBackground('rojo', ['serve', '--port', rojoPort], 'rojo-server');

// Wait for server to be ready
const ready = await network.waitForPort(rojoPort, 15000);

if (!ready) {
  logger.error('Rojo server failed to start');
  // Show logs, offer retry
}

// Store port in context for later states
context.rojoPort = rojoPort;
```

### Sync Verification (State 12)

```javascript
// Create test file
const testFilePath = path.join(projectPath, 'src', '_yoblox_test_sync.lua');
fs.writeFileSync(testFilePath, config.VERIFICATION.TEST_FILE_CONTENT);

logger.info('Test file created in src/_yoblox_test_sync.lua');
logger.info('Check if this file appears in Roblox Studio under ServerScriptService');

// Wait for user confirmation
const canSee = await prompt.confirm('Can you see the _yoblox_test_sync file in Studio?', true);

if (canSee) {
  logger.success('✓ Sync verified! Your setup is working perfectly!');

  // Cleanup
  fs.unlinkSync(testFilePath);
} else {
  logger.error('Sync not working. Let\'s troubleshoot...');
  // Offer diagnostics
}
```

### Final Summary (State 13)

```javascript
logger.box(`
╔════════════════════════════════════════╗
║                                        ║
║   🎉  SETUP COMPLETE!  🎉             ║
║                                        ║
║   Your Roblox AI Dev Environment      ║
║   is ready to use!                     ║
║                                        ║
╚════════════════════════════════════════╝
`, { borderColor: 'green', padding: 1 });

// Show summary
logger.success('✓ Roblox Studio installed and running');
logger.success('✓ VS Code installed with Luau extensions');
logger.success('✓ Rojo installed and serving on port ' + context.rojoPort);
logger.success('✓ Rojo plugin connected');
logger.success('✓ End-to-end sync verified');
logger.success('✓ ' + context.aiChoice + ' CLI installed');
logger.success('✓ Project scaffolded: ' + context.projectName);

// Interactive menu
const action = await prompt.select('What would you like to do?', [
  { name: 'vscode', message: 'Open project in VS Code' },
  { name: 'readme', message: 'View README' },
  { name: 'docs', message: 'View architecture docs' },
  { name: 'troubleshoot', message: 'Troubleshooting guide' },
  { name: 'exit', message: 'Exit wizard' }
]);

// Handle selection...
```

## Error Handling Improvements

### Diagnostic Reports

When errors occur, generate detailed reports:

```
=== yoblox-setup Diagnostic Report ===
Time: 2025-01-20 15:30:45
OS: Windows 10 (10.0.19045)
Node: v20.10.0
Failed State: rojo

Error: Command failed: cargo install rojo
  exit code: 101

System Info:
  - Rust: 1.75.0 ✓
  - Cargo: 1.75.0 ✓
  - Disk Space: 45 GB free ✓
  - Network: Connected ✓

Possible Causes:
  1. Network timeout during crate download
  2. Insufficient permissions
  3. Antivirus blocking cargo

Suggested Fixes:
  1. Run: cargo install rojo --verbose
  2. Check antivirus exclusions
  3. Try manual install from releases

Log saved to: C:\Users\...\yoblox-setup-error.log
```

### Auto-Recovery

```javascript
if (error.code === 'EACCES') {
  logger.warning('Permission denied. Trying alternative method...');
  // Attempt workaround
} else if (error.code === 'ETIMEDOUT') {
  logger.warning('Network timeout. Retrying with longer timeout...');
  // Retry with extended timeout
}
```

## Testing Strategy

### Unit Tests
- Test each utility function
- Mock external commands
- Verify state logic

### Integration Tests
- Test full state machine flow
- Mock user inputs
- Verify state transitions

### End-to-End Test
- Run on clean VM
- Verify all components install
- Confirm sync works

## Rollout Plan

### Phase 1: Core Infrastructure
1. ✅ Create new utilities (process.js, network.js, diagnostics.js)
2. ✅ Enhance config.js
3. ✅ Improve logger.js with progress bars
4. ✅ Update state machine with verify() and cleanup()

### Phase 2: New States
1. ✅ Implement rojoServer.js (State 10)
2. ✅ Implement studioSync.js (State 11)
3. ✅ Implement syncVerification.js (State 12)
4. ✅ Implement finalSummary.js (State 13)

### Phase 3: Enhanced Existing States
1. ✅ Improve welcome.js with system checks
2. ✅ Enhance all states with better UX
3. ✅ Add verify() methods to all states
4. ✅ Improve error messages

### Phase 4: Polish
1. ✅ Add animations and celebrations
2. ✅ Improve all user-facing messages
3. ✅ Add comprehensive error handling
4. ✅ Create troubleshooting documentation

## Success Criteria

Before declaring v2.0 complete:

- [ ] All 13 states implemented
- [ ] Rojo server starts automatically
- [ ] Studio launches and connects
- [ ] End-to-end sync verified
- [ ] All errors provide recovery guidance
- [ ] Wizard resumable after interruption
- [ ] Comprehensive logging
- [ ] Beautiful UX with progress indicators
- [ ] Works on fresh Windows 10/11 system
- [ ] Complete documentation

## Estimated Effort

- Core utilities: 4-6 hours
- New states: 6-8 hours
- Existing state improvements: 4-6 hours
- Testing & polish: 4-6 hours
- **Total: 18-26 hours**

## Next Steps

1. Implement new utility modules
2. Create new states (10-13)
3. Enhance existing states
4. Test on clean system
5. Document everything
6. Release v2.0

---

**This redesign transforms yoblox-setup from a basic installer into a professional-grade development environment setup wizard that guarantees a working configuration.**
