/**
 * Final Summary State
 *
 * Displays a beautiful completion summary and provides an interactive
 * menu to launch tools, view docs, or exit the wizard.
 */

const logger = require('../utils/logger');
const prompt = require('../utils/prompt');
const installer = require('../utils/installer');
const system = require('../utils/system');
const path = require('path');
const os = require('os');

module.exports = {
  name: 'finalSummary',
  order: 13,

  async check(context) {
    // Never skip - always show summary
    return { found: false, canSkip: false };
  },

  async verify(context) {
    // Always verified
    return { verified: true, issues: [] };
  },

  async cleanup(context) {
    // No cleanup needed
  },

  async run(context) {
    // Clear screen for dramatic effect
    logger.newline();
    logger.newline();

    // ASCII art celebration
    logger.divider();
    logger.newline();

    const banner = `
  ██╗   ██╗ ██████╗ ██████╗ ██╗      ██████╗ ██╗  ██╗
  ╚██╗ ██╔╝██╔═══██╗██╔══██╗██║     ██╔═══██╗╚██╗██╔╝
   ╚████╔╝ ██║   ██║██████╔╝██║     ██║   ██║ ╚███╔╝
    ╚██╔╝  ██║   ██║██╔══██╗██║     ██║   ██║ ██╔██╗
     ██║   ╚██████╔╝██████╔╝███████╗╚██████╔╝██╔╝ ██╗
     ╚═╝    ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═╝
    `;

    logger.success(banner);
    logger.newline();
    logger.success('        🎉  SETUP COMPLETE!  🎉');
    logger.newline();
    logger.success('   Your Roblox AI Development Environment');
    logger.success('            is ready to use!');
    logger.newline();
    logger.divider();
    logger.newline();

    // Summary of what was installed
    logger.info('✓ Installation Summary:');
    logger.newline();

    const installedTools = [];

    if (context.studioInstalled) {
      installedTools.push('Roblox Studio - Game development environment');
    }

    if (context.vscodeInstalled) {
      installedTools.push('VS Code - Code editor');
    }

    if (context.gitInstalled) {
      installedTools.push('Git - Version control');
    }

    if (context.rustInstalled && context.cargoInstalled) {
      installedTools.push('Rust + Cargo - Programming language and package manager');
    }

    if (context.rojoInstalled) {
      installedTools.push('Rojo - Live sync tool');
    }

    if (context.extensionsInstalled) {
      installedTools.push('VS Code Extensions - Luau LSP, Rojo support');
    }

    if (context.aiChoice && context.aiConfigured) {
      const aiName = context.aiChoice === 'claude' ? 'Claude Code' :
                     context.aiChoice === 'cline' ? 'Cline' : 'AI Assistant';
      installedTools.push(`${aiName} - AI coding assistant`);
    }

    if (context.projectName) {
      installedTools.push(`Project "${context.projectName}" - Scaffolded and configured`);
    }

    if (context.rojoRunning) {
      installedTools.push(`Rojo Server - Running on port ${context.rojoPort}`);
    }

    if (context.studioConnected) {
      installedTools.push('Studio Connection - Rojo plugin connected');
    }

    if (context.syncVerified) {
      installedTools.push('End-to-End Sync - Verified working');
    }

    // Display all installed tools
    installedTools.forEach(tool => {
      logger.success(`  ✓ ${tool}`);
    });

    logger.newline();
    logger.divider();
    logger.newline();

    // Project information
    if (context.projectName) {
      logger.info('📁 Your Project:');
      logger.newline();
      logger.info(`  Name: ${context.projectName}`);
      if (context.projectPath) {
        logger.info(`  Location: ${context.projectPath}`);
      }
      if (context.rojoPort) {
        logger.info(`  Rojo URL: http://localhost:${context.rojoPort}`);
      }
      logger.newline();
      logger.divider();
      logger.newline();
    }

    // Quick start guide
    logger.info('🚀 Quick Start:');
    logger.newline();
    logger.list([
      'Open your project in VS Code',
      'Start coding in the src/ folder',
      'Your changes will sync to Roblox Studio instantly',
      'Test your game in Studio',
      'Use your AI assistant to help you code'
    ]);
    logger.newline();
    logger.divider();
    logger.newline();

    // Important files to know about
    if (context.projectPath) {
      logger.info('📚 Important Files:');
      logger.newline();
      logger.list([
        'README.md - Project overview and getting started',
        'ARCHITECTURE.md - Code structure and organization',
        'GAME_DESIGN.md - Plan your game mechanics',
        'ai/AI_PROMPTS.md - Tips for AI-assisted coding',
        'src/ - Your game code goes here'
      ]);
      logger.newline();
      logger.divider();
      logger.newline();
    }

    // Interactive menu
    logger.info('What would you like to do next?');
    logger.newline();

    let keepMenuOpen = true;

    while (keepMenuOpen) {
      const choices = [];

      if (context.projectPath) {
        choices.push({
          name: 'vscode',
          message: '📝 Open project in VS Code'
        });
      }

      if (context.projectPath) {
        choices.push({
          name: 'readme',
          message: '📖 View README'
        });
      }

      if (context.projectPath) {
        choices.push({
          name: 'architecture',
          message: '🏗️  View ARCHITECTURE.md'
        });
      }

      if (context.projectPath) {
        choices.push({
          name: 'folder',
          message: '📁 Open project folder'
        });
      }

      choices.push({
        name: 'docs',
        message: '📚 View Rojo documentation'
      });

      choices.push({
        name: 'troubleshoot',
        message: '🔧 Troubleshooting guide'
      });

      choices.push({
        name: 'exit',
        message: '👋 Exit wizard'
      });

      const action = await prompt.select('Choose an action:', choices);

      logger.newline();

      switch (action) {
        case 'vscode':
          if (context.projectPath) {
            logger.info('Opening VS Code...');
            try {
              await system.runCommand(`code "${context.projectPath}"`, { shell: true });
              logger.success('✓ VS Code opened');
            } catch (error) {
              logger.error('Could not open VS Code automatically.');
              logger.info(`Open it manually: code "${context.projectPath}"`);
            }
          }
          logger.newline();
          break;

        case 'readme':
          if (context.projectPath) {
            const readmePath = path.join(context.projectPath, 'README.md');
            logger.info('Opening README...');
            try {
              await installer.openURL(`file://${readmePath}`);
              logger.success('✓ README opened');
            } catch (error) {
              logger.info(`Open manually: ${readmePath}`);
            }
          }
          logger.newline();
          break;

        case 'architecture':
          if (context.projectPath) {
            const archPath = path.join(context.projectPath, 'ARCHITECTURE.md');
            logger.info('Opening ARCHITECTURE.md...');
            try {
              await installer.openURL(`file://${archPath}`);
              logger.success('✓ ARCHITECTURE.md opened');
            } catch (error) {
              logger.info(`Open manually: ${archPath}`);
            }
          }
          logger.newline();
          break;

        case 'folder':
          if (context.projectPath) {
            logger.info('Opening project folder...');
            try {
              if (os.platform() === 'win32') {
                await system.runCommand(`explorer "${context.projectPath}"`, { shell: true });
              } else if (os.platform() === 'darwin') {
                await system.runCommand(`open "${context.projectPath}"`);
              } else {
                await system.runCommand(`xdg-open "${context.projectPath}"`);
              }
              logger.success('✓ Folder opened');
            } catch (error) {
              logger.info(`Open manually: ${context.projectPath}`);
            }
          }
          logger.newline();
          break;

        case 'docs':
          logger.info('Opening Rojo documentation...');
          await installer.openURL('https://rojo.space/docs/');
          logger.success('✓ Documentation opened in browser');
          logger.newline();
          break;

        case 'troubleshoot':
          showTroubleshootingGuide(context);
          logger.newline();
          break;

        case 'exit':
          keepMenuOpen = false;
          break;
      }
    }

    // Final goodbye
    logger.newline();
    logger.divider();
    logger.newline();

    logger.success('Thank you for using yoblox-setup!');
    logger.newline();

    logger.info('Happy game development! 🎮');
    logger.newline();

    if (context.rojoRunning) {
      logger.warning('NOTE: Rojo server is still running in the background.');
      logger.info('It will stop when you close this wizard.');
      logger.newline();
    }

    logger.info('If you need help:');
    logger.list([
      'Check the README.md in your project',
      'Visit Rojo docs: https://rojo.space/docs/',
      'Ask your AI assistant for coding help',
      'Join the Roblox developer community'
    ]);
    logger.newline();

    logger.divider();
    logger.newline();

    return {
      success: true,
      data: {
        wizardCompleted: true
      }
    };
  }
};

/**
 * Show troubleshooting guide
 * @param {Object} context - Wizard context
 */
function showTroubleshootingGuide(context) {
  logger.newline();
  logger.divider();
  logger.info('🔧 Troubleshooting Guide');
  logger.divider();
  logger.newline();

  logger.info('Common Issues:');
  logger.newline();

  logger.info('1. Sync not working:');
  logger.list([
    'Check Rojo plugin shows "Connected" in Studio',
    'Try clicking "Reconnect" in Rojo panel',
    'Restart Rojo server: rojo serve',
    'Make sure you\'re editing files in src/ folder'
  ]);
  logger.newline();

  logger.info('2. Rojo command not found:');
  logger.list([
    'Restart your terminal',
    'Check cargo is in PATH: cargo --version',
    'Reinstall Rojo: cargo install rojo',
    'Try logging out and back in (PATH update)'
  ]);
  logger.newline();

  logger.info('3. Studio won\'t connect:');
  logger.list([
    'Check port is correct: ' + (context.rojoPort || '34872'),
    'Make sure Rojo server is running',
    'Try a different port in Rojo plugin',
    'Check firewall isn\'t blocking the connection'
  ]);
  logger.newline();

  logger.info('4. VS Code extensions not working:');
  logger.list([
    'Restart VS Code',
    'Check extensions are enabled: Ctrl+Shift+X',
    'Manually install: code --install-extension JohnnyMorganz.luau-lsp',
    'Make sure workspace is trusted'
  ]);
  logger.newline();

  logger.info('5. AI assistant not responding:');
  logger.list([
    'Check CLI is installed: claude --version or cline --version',
    'Verify API key is configured',
    'Check internet connection',
    'Consult AI assistant documentation'
  ]);
  logger.newline();

  logger.divider();
}
