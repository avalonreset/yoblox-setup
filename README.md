# yoblox-setup

Interactive setup wizard for AI-ready Roblox game development environment.

## What is yoblox-setup?

`yoblox-setup` is a command-line wizard that walks you through installing and configuring everything needed to build Roblox games with AI assistance. It handles the entire setup process, from installing Roblox Studio to scaffolding your first project.

## What Gets Installed

The wizard will help you install:

- **Roblox Studio** - The game engine
- **VS Code** - Code editor with Luau support
- **Git** (optional) - Version control
- **Rust + Cargo** - Required for Rojo
- **Rojo** - Live code sync to Roblox Studio
- **VS Code Extensions**:
  - Luau Language Server
  - Rojo extension
- **AI CLI** (optional):
  - Claude CLI or Gemini CLI
- **Project Scaffold** - Creates a new project using `yoblox`

## Quick Start

```bash
npx yoblox-setup
```

The wizard will guide you through each step with clear instructions.

## Features

- Interactive step-by-step setup
- Automatic detection of already-installed tools
- Progress saving (resume if interrupted)
- OS-aware installation guidance
- Validation at each step
- Clear error messages and troubleshooting tips

## Requirements

- **Windows** (optimized, other OS may work with limitations)
- **Node.js 14+** (required to run the wizard)
- **Internet connection** (for downloads)
- ~2GB free disk space (for Rust, Rojo, etc.)

## Usage

### Start Setup

```bash
npx yoblox-setup
```

### Start Fresh (Ignore Saved Progress)

```bash
npx yoblox-setup --reset
```

### Show Help

```bash
npx yoblox-setup --help
```

### Show Version

```bash
npx yoblox-setup --version
```

## How It Works

1. **Welcome** - System check and overview
2. **Roblox Studio** - Guides manual installation
3. **VS Code** - Installs or guides installation
4. **Git** - Optional version control setup
5. **Rust + Cargo** - Installs rustup
6. **Rojo** - Builds from source via Cargo
7. **VS Code Extensions** - Auto-installs Luau LSP and Rojo
8. **AI CLI** - Choose Claude, Gemini, or skip
9. **Scaffold Project** - Runs `npx yoblox <project-name>`
10. **Complete** - Success screen with next steps

## Progress Saving

If you cancel the wizard (Ctrl+C) or encounter an error, your progress is saved to `.yoblox-setup-state.json`. Run `yoblox-setup` again to resume where you left off.

## Local Development

### Install Dependencies

```bash
cd yoblox-setup
npm install
```

### Run Locally

```bash
node index.js
```

or

```bash
npm start
```

### Link for Global Testing

```bash
npm link
yoblox-setup
```

### Unlink

```bash
npm unlink -g yoblox-setup
```

## Building Standalone EXE

Package the wizard as a standalone Windows executable:

```bash
npm install
npm run build:exe
```

This creates `dist/yoblox-setup.exe` which can be distributed and run without Node.js installed.

### Package Requirements

The build uses [pkg](https://github.com/vercel/pkg) to bundle Node.js and the application into a single executable.

## Architecture

```
yoblox-setup/
├── index.js                 # Entry point
├── bin/yoblox-setup        # Shebang wrapper
├── src/
│   ├── cli.js              # Main CLI orchestrator
│   ├── statemachine.js     # State machine coordinator
│   ├── config.js           # Configuration constants
│   ├── utils/
│   │   ├── system.js       # OS/shell detection
│   │   ├── logger.js       # Colored output
│   │   ├── validator.js    # Check installed tools
│   │   ├── installer.js    # Download/install helpers
│   │   └── prompt.js       # User input
│   └── states/
│       ├── welcome.js      # Welcome screen
│       ├── robloxStudio.js # Roblox Studio check
│       ├── vscode.js       # VS Code check/install
│       ├── git.js          # Git check/install
│       ├── rust.js         # Rust + Cargo install
│       ├── rojo.js         # Rojo install
│       ├── vscodeExtensions.js # VS Code extensions
│       ├── aiCLI.js        # AI assistant setup
│       ├── scaffold.js     # Project scaffolding
│       └── complete.js     # Success screen
```

## Troubleshooting

### Rust/Cargo not found after install

**Solution**: Restart your terminal. Rustup modifies your PATH, which requires a new terminal session.

### VS Code 'code' command not found

**Solution**:
- Reinstall VS Code and check "Add to PATH" during installation
- On Windows, restart your terminal after installation
- Manually add VS Code to PATH: `C:\Users\<username>\AppData\Local\Programs\Microsoft VS Code\bin`

### Rojo install takes forever

**Solution**: Rojo compiles from source, which takes 5-10 minutes. This is normal. Ensure you have:
- Stable internet connection
- At least 1GB free disk space
- Patience!

### Permission errors on Windows

**Solution**:
- Run the wizard as Administrator
- Or install tools to user directories (not Program Files)

### Setup interrupted and won't resume

**Solution**: Delete `.yoblox-setup-state.json` and run `yoblox-setup --reset`

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT

## Related Projects

- [yoblox](https://github.com/avalonreset/yoblox) - Project scaffolding tool
- [Rojo](https://rojo.space/) - Roblox project management
- [Luau](https://luau-lang.org/) - Roblox's Lua dialect

## Support

- Issues: https://github.com/avalonreset/yoblox-setup/issues
- Discussions: https://github.com/avalonreset/yoblox-setup/discussions

## Acknowledgments

Built for the Roblox developer community to make getting started with modern Roblox development easier and more accessible.
