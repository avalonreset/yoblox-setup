/**
 * Configuration
 *
 * Central configuration for download URLs, version requirements,
 * file paths, and other constants used throughout the wizard.
 */

module.exports = {
  // Version requirements
  REQUIRED_NODE_VERSION: '14.0.0',
  VERSION: '1.0.0',

  // Download URLs
  ROBLOX_STUDIO_URL: 'https://www.roblox.com/create',
  VSCODE_DOWNLOAD_URL: 'https://code.visualstudio.com/Download',
  RUSTUP_URL: 'https://rustup.rs/',
  GIT_DOWNLOAD_URL: 'https://git-scm.com/downloads',

  // Windows installer URLs
  RUSTUP_INIT_WIN: 'https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe',
  GIT_INSTALLER_WIN: 'https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe',
  VSCODE_INSTALLER_WIN: 'https://code.visualstudio.com/sha/download?build=stable&os=win32-x64-user',

  // VS Code extensions
  VSCODE_EXTENSIONS: [
    {
      id: 'johnnymorganz.luau-lsp',
      name: 'Luau Language Server'
    },
    {
      id: 'evaera.vscode-rojo',
      name: 'Rojo'
    }
  ],

  // AI CLI options
  AI_OPTIONS: {
    claude: {
      id: 'claude',
      name: 'Claude CLI (Anthropic)',
      hint: 'Recommended for code generation',
      binary: 'claude',
      docsUrl: 'https://github.com/anthropics/anthropic-tools',
      installHintWindows: [
        'Visit the docs page that just opened in your browser',
        'Follow the installation instructions for Windows',
        'Make sure the "claude" command is in your PATH',
        'You may need to restart your terminal after installation'
      ],
      installHintUnix: [
        'Visit the docs page that just opened in your browser',
        'Follow the installation instructions',
        'Make sure the "claude" command is in your PATH'
      ]
    },
    gemini: {
      id: 'gemini',
      name: 'Gemini CLI (Google)',
      hint: 'Alternative AI assistant',
      binary: 'gemini',
      docsUrl: 'https://ai.google.dev/',
      installHintWindows: [
        'Visit the docs page that just opened in your browser',
        'Follow the installation instructions for Windows',
        'Make sure the "gemini" command is in your PATH',
        'You may need to restart your terminal after installation'
      ],
      installHintUnix: [
        'Visit the docs page that just opened in your browser',
        'Follow the installation instructions',
        'Make sure the "gemini" command is in your PATH'
      ]
    },
    none: {
      id: 'none',
      name: 'Skip AI setup (configure later)',
      hint: 'You can install an AI CLI manually later',
      binary: null,
      docsUrl: null
    }
  },

  // Windows-specific paths and commands
  WINDOWS: {
    // Roblox Studio can be in multiple versions folders
    ROBLOX_STUDIO_GLOB: 'C:/Users/*/AppData/Local/Roblox/Versions/*/RobloxStudioBeta.exe',
    ROBLOX_STUDIO_GLOB_ALT: 'C:/Program Files*/Roblox/Versions/*/RobloxStudioBeta.exe',

    // VS Code command
    VSCODE_COMMAND: 'code',

    // Cargo paths
    CARGO_HOME: '%USERPROFILE%\\.cargo',
    CARGO_BIN: '%USERPROFILE%\\.cargo\\bin',
    CARGO_COMMAND: 'cargo',

    // Rojo command
    ROJO_COMMAND: 'rojo',

    // Git command
    GIT_COMMAND: 'git',

    // Rustup command
    RUSTUP_COMMAND: 'rustup',
    RUSTC_COMMAND: 'rustc'
  },

  // macOS-specific paths
  MACOS: {
    ROBLOX_STUDIO_PATH: '/Applications/RobloxStudio.app',
    VSCODE_PATH: '/Applications/Visual Studio Code.app',
    CARGO_HOME: '$HOME/.cargo',
    CARGO_BIN: '$HOME/.cargo/bin'
  },

  // Linux-specific paths
  LINUX: {
    CARGO_HOME: '$HOME/.cargo',
    CARGO_BIN: '$HOME/.cargo/bin'
  },

  // Maximum retries for installs
  MAX_RETRIES: 3,

  // Timeout for command execution (ms)
  COMMAND_TIMEOUT: 600000, // 10 minutes

  // Download timeout (ms)
  DOWNLOAD_TIMEOUT: 300000, // 5 minutes

  // State file name
  STATE_FILE: '.yoblox-setup-state.json'
};
