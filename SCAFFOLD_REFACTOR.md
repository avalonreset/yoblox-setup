# Scaffold State Refactor - GitHub Template Download

## Summary

The scaffold state has been completely refactored to download and extract the yoblox template directly from GitHub instead of relying on `npx yoblox`. This eliminates the dependency on yoblox being published to npm and makes the wizard self-contained.

## Changes Made

### 1. **package.json** - Added Dependencies

```json
{
  "adm-zip": "^0.5.10",    // Cross-platform zip extraction
  "fs-extra": "^11.2.0"    // Enhanced file system operations
}
```

**Why these dependencies?**
- **adm-zip**: Pure JavaScript zip extractor. Works consistently across Windows, macOS, and Linux without requiring native binaries.
- **fs-extra**: Provides `copy()` with filtering support, making recursive directory copying with exclusions much simpler and more reliable than native `fs` methods.

### 2. **src/utils/installer.js** - New Helper Functions

Added four new functions to the installer utilities:

#### `extractZip(zipPath, destPath)`
Extracts a zip file using adm-zip. Handles directory creation automatically.

```javascript
await installer.extractZip('/path/to/file.zip', '/path/to/extract');
```

#### `copyDirectory(src, dest, excludePatterns)`
Recursively copies a directory with pattern-based exclusions.

```javascript
await installer.copyDirectory(
  '/source/template',
  '/dest/project',
  ['.git', 'node_modules', '.gitignore']
);
```

Patterns are checked using `filePath.includes(pattern)`, so:
- `'.git'` excludes any file/folder with `.git` in the path
- `'node_modules'` excludes any node_modules folder

#### `cleanupDirectory(dirPath)`
Safely removes a directory and all its contents. Non-fatal if cleanup fails (logs warning instead).

#### `findDirectory(parentPath, pattern)`
Finds a subdirectory matching a glob pattern (e.g., `'yoblox-*'`).

Used to find the extracted `yoblox-main` folder inside the zip:
```javascript
const yobloxFolder = installer.findDirectory(extractDir, 'yoblox-*');
```

### 3. **src/states/scaffold.js** - Complete Rewrite

#### Old Flow
```
Ask for project name
  → npx yoblox <projectName>
  → Verify folder exists
  → Return success
```

#### New Flow
```
Ask for project name
  → Download zip from GitHub codeload URL
  → Extract zip to temp directory
  → Find yoblox-* folder
  → Locate template/ subfolder
  → Copy template/ to new project directory
  → Cleanup temp files
  → Show next steps
  → Return success
```

#### Key Features

**1. Direct GitHub Download**
- Uses GitHub's codeload API: `https://codeload.github.com/avalonreset/yoblox/zip/refs/heads/main`
- No npm registry dependency
- Works immediately even if yoblox hasn't been published

**2. Graceful Error Handling**
- If download fails → prompt user to retry
- If extraction fails → cleanup temp files, prompt user to retry
- If template folder missing → clear error message
- Partial projects cleaned up on error

**3. Clean Project Output**
- Excludes `.git`, `node_modules`, `.gitignore` from copied files
- Result is a clean game project, not a cloned repository
- No repo artifacts left behind

**4. User Feedback**
- Clear status messages at each step
- Progress bar during download
- Success checkmarks for completed steps
- Detailed next steps after completion

**5. Temporary File Management**
- Uses OS temp directory (cross-platform)
- Automatic cleanup even on error
- Doesn't pollute user's home or project directories

## How It Works - Step by Step

### Step 1: Project Name
```javascript
// Asks user for project name with validation
projectName = await prompt.input(
  'What do you want to name your project?',
  'my-roblox-game'
);
```

### Step 2: Download from GitHub
```javascript
// Uses GitHub codeload API to get zip
const GITHUB_CODELOAD_URL = 
  `https://codeload.github.com/avalonreset/yoblox/zip/refs/heads/main`;

await installer.downloadFile(GITHUB_CODELOAD_URL, zipPath);
```

Creates a zip file with structure like:
```
yoblox.zip
└── yoblox-main/
    ├── template/
    │   ├── src/
    │   ├── .vscode/
    │   ├── ai/
    │   ├── default.project.json
    │   ├── README.md
    │   └── ...
    ├── package.json
    └── ...
```

### Step 3: Extract and Locate
```javascript
// Extract to temp directory
await installer.extractZip(zipPath, extractDir);

// Find yoblox-main (or yoblox-develop, etc.)
const yobloxFolder = installer.findDirectory(extractDir, 'yoblox-*');

// Find template subfolder
const templateFolder = path.join(yobloxFolder, 'template');
```

### Step 4: Copy Clean Template
```javascript
// Copy template to project, excluding repo files
await installer.copyDirectory(
  templateFolder,
  projectPath,
  ['.git', '.gitignore', 'node_modules', '.DS_Store']
);
```

Final result:
```
my-roblox-game/
├── src/
├── .vscode/
├── ai/
├── default.project.json
├── README.md
└── ... (no .git, clean project)
```

### Step 5: Cleanup
```javascript
// Remove temporary directory
await installer.cleanupDirectory(tempDir);
```

## Customization

### Change the GitHub Repository

Edit `src/states/scaffold.js`:
```javascript
// Change this:
const GITHUB_REPO = 'avalonreset/yoblox';
const GITHUB_BRANCH = 'main';

// To download from a different repo/branch:
const GITHUB_REPO = 'yourname/your-template';
const GITHUB_BRANCH = 'develop';
```

The URL is automatically constructed, so just update these constants.

### Change Excluded Files

Edit `src/states/scaffold.js` in `extractAndSetupProject()`:
```javascript
// Add or remove patterns here
await installer.copyDirectory(
  templateFolder,
  projectPath,
  ['.git', '.gitignore', 'node_modules', '.DS_Store', '.github']  // Added .github
);
```

### Show Different Next Steps

Edit the `showNextSteps()` function at the bottom of `scaffold.js`.

## Testing

### Test Successful Project Creation
```bash
node index.js
# Navigate to scaffold step
# Enter project name: "test-game"
# Watch download → extract → copy → cleanup
# Verify test-game/ folder exists with clean template
```

### Test Error Recovery
```bash
node index.js
# Kill the wizard during download (Ctrl+C)
# Run again - temp files should be cleaned up
# Retry should work
```

### Test with Different Branch
Edit scaffold.js temporarily:
```javascript
const GITHUB_BRANCH = 'develop'; // or any branch
```

## Performance Considerations

- **Download Size**: ~20KB for zip (small)
- **Extraction**: Fast (in-memory zip extraction)
- **Copy**: Fast (fs-extra optimized)
- **Total Time**: ~5-10 seconds on typical connection

## Error Messages Users Will See

| Scenario | Message |
|----------|---------|
| Network down | `Download failed: getaddrinfo ENOTFOUND...` |
| Invalid repo | `Download failed: 404 Not Found` |
| Zip corrupted | `Failed to extract zip: ...` |
| Template missing | `Template folder not found in yoblox repository` |
| Already exists | `Directory "project-name" already exists` |

All errors allow the user to retry or abort gracefully.

## Files Modified

1. `package.json` - Added adm-zip, fs-extra
2. `src/utils/installer.js` - Added 4 new functions
3. `src/states/scaffold.js` - Complete rewrite

## Files NOT Changed

- All other state files
- Logger, validator, prompt utilities
- Config files
- CLI orchestrator

This keeps the refactor focused and minimizes risk of breaking other parts of the wizard.
