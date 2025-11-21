# yoblox-setup Architecture v2.0

## Design Philosophy

This wizard is designed to be **foolproof** - it validates every step, provides clear guidance, and doesn't proceed until each component is verified working.

## Enhanced State Machine Flow

```
1.  Welcome & Prerequisites Check
2.  Roblox Studio Installation & Verification
3.  VS Code Installation & PATH Verification
4.  Git Installation (Optional but Recommended)
5.  Rust + Cargo Installation & PATH Verification
6.  Rojo Installation & Verification
7.  VS Code Extensions Installation & Verification
8.  AI CLI Selection & Installation & Verification
9.  Project Scaffolding from GitHub
10. Rojo Server Launch & Port Verification
11. Roblox Studio Launch & Plugin Installation
12. End-to-End Sync Verification (Critical!)
13. Final Success Summary & Next Steps
```

## New States Added

### State 10: `rojoServer.js`
- Automatically starts `rojo serve`
- Verifies port 34872 is listening
- Falls back to alternative ports if occupied
- Keeps server running in background
- Provides clear status updates

### State 11: `studioSync.js`
- Launches Roblox Studio with the project
- Opens Rojo plugin marketplace page
- Guides user through plugin installation
- Waits for user to click "Connect" in Studio
- Verifies connection established

### State 12: `syncVerification.js`
- Creates a test file in src/
- Waits for it to appear in Studio
- Asks user to confirm they see it
- Deletes test file
- Confirms entire pipeline works end-to-end

### State 13: `finalSummary.js`
- Beautiful ASCII art success banner
- Summary of all installed tools
- Interactive menu:
  - Open project in VS Code
  - View README
  - Open architecture docs
  - Troubleshooting guide
  - Exit wizard

## Enhanced Features

### 1. Port Management
- Dynamic port allocation for Rojo
- Fallback ports: 34872, 34873, 34874, etc.
- Port conflict detection and resolution

### 2. Process Management
- Background process tracking
- Graceful shutdown on Ctrl+C
- Process cleanup on wizard exit
- PID file management

### 3. Verification Pipeline
- Every tool verified before proceeding
- Version checking with minimum requirements
- PATH verification after installs
- Functional testing (not just presence checks)

### 4. Error Recovery
- Automatic retry logic
- Clear error messages with solutions
- Diagnostic log generation
- Recovery suggestions based on error type

### 5. Enhanced UX
- Progress indicators (Step X of 13)
- Estimated time remaining
- Color-coded status messages
- Checkpoint confirmations
- Celebration animations on success

## File Structure Changes

```
src/
├── cli.js (enhanced)
├── statemachine.js (improved)
├── config.js (expanded)
├── states/
│   ├── 01-welcome.js
│   ├── 02-robloxStudio.js
│   ├── 03-vscode.js
│   ├── 04-git.js
│   ├── 05-rust.js
│   ├── 06-rojo.js
│   ├── 07-vscodeExtensions.js
│   ├── 08-aiCLI.js
│   ├── 09-scaffold.js
│   ├── 10-rojoServer.js (NEW)
│   ├── 11-studioSync.js (NEW)
│   ├── 12-syncVerification.js (NEW)
│   └── 13-finalSummary.js (NEW)
├── utils/
│   ├── installer.js (enhanced)
│   ├── logger.js (enhanced)
│   ├── prompt.js
│   ├── system.js (enhanced)
│   ├── validator.js (enhanced)
│   ├── process.js (NEW - process management)
│   ├── network.js (NEW - port checking)
│   └── diagnostics.js (NEW - error diagnostics)
└── templates/
    └── test-sync-file.lua (NEW - for verification)
```

## Key Improvements

### Better State Ordering
States are now numbered for clarity and logical flow.

### Comprehensive Verification
Each state has a `verify()` method that actually tests functionality.

### Background Process Management
New `process.js` utility manages Rojo server and other background tasks.

### Network Utilities
New `network.js` utility checks ports, finds free ports, verifies connections.

### Diagnostic Tools
New `diagnostics.js` generates helpful error reports and recovery suggestions.

### Enhanced Logging
Logger now supports:
- Progress bars with ETA
- Animations
- Structured step indicators
- Severity levels (DEBUG, INFO, WARN, ERROR, FATAL)

## Verification Philosophy

**Before this wizard declares success:**

✅ All tools installed and in PATH
✅ All versions meet requirements
✅ VS Code extensions active
✅ Rojo server running and reachable
✅ Roblox Studio open with project
✅ Rojo plugin installed and connected
✅ Test file syncs from VS Code → Studio
✅ AI CLI responds to commands
✅ Project scaffold complete

**No silent failures. No ambiguous states. 100% confidence.**
