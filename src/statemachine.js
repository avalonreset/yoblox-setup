/**
 * State Machine
 *
 * Coordinates sequential execution of setup states with support for:
 * - Retries
 * - Skipping
 * - Progress persistence
 * - Resuming from saved state
 */

const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

const STATE_FILE = '.yoblox-setup-state.json';

class StateMachine {
  /**
   * Create a new state machine
   * @param {Array} states - Array of state modules
   * @param {Object} options - Options
   * @param {boolean} options.reset - Ignore saved progress and start fresh
   */
  constructor(states, options = {}) {
    this.states = states;
    this.options = options;
    this.context = {
      installedTools: {},
      userChoices: {},
      os: null,
      projectName: null
    };
    this.currentStateIndex = 0;
    this.completedStates = [];
  }

  /**
   * Load saved progress from disk
   * @returns {Object|null} Saved state or null
   */
  loadProgress() {
    try {
      if (!fs.existsSync(STATE_FILE)) {
        return null;
      }

      const data = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.warning('Could not load saved progress. Starting fresh.');
      return null;
    }
  }

  /**
   * Save current progress to disk
   */
  saveProgress() {
    try {
      const state = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        currentStateIndex: this.currentStateIndex,
        completedStates: this.completedStates,
        context: this.context
      };

      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (error) {
      logger.warning('Could not save progress.');
    }
  }

  /**
   * Clear saved progress
   */
  clearProgress() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        fs.unlinkSync(STATE_FILE);
      }
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Restore from saved progress
   * @param {Object} saved - Saved state
   */
  restoreProgress(saved) {
    this.currentStateIndex = saved.currentStateIndex || 0;
    this.completedStates = saved.completedStates || [];
    this.context = saved.context || this.context;

    logger.info(`Resuming from state: ${this.states[this.currentStateIndex]?.name || 'unknown'}`);
  }

  /**
   * Run the state machine
   */
  async run() {
    // Handle saved progress
    if (!this.options.reset) {
      const saved = this.loadProgress();
      if (saved) {
        const prompt = require('./utils/prompt');
        const shouldResume = await prompt.confirm(
          'Found previous setup progress. Resume from where you left off?',
          true
        );

        if (shouldResume) {
          this.restoreProgress(saved);
        } else {
          this.clearProgress();
        }
      }
    } else {
      this.clearProgress();
    }

    // Execute states sequentially
    while (this.currentStateIndex < this.states.length) {
      const state = this.states[this.currentStateIndex];

      try {
        const result = await this.executeState(state);

        if (result.success) {
          // Mark state as completed
          if (!this.completedStates.includes(state.name)) {
            this.completedStates.push(state.name);
          }

          // Save progress after each successful state
          this.saveProgress();

          // Move to next state
          this.currentStateIndex++;
        } else if (result.retry) {
          // Retry the same state
          logger.info('Retrying...\n');
          continue;
        } else {
          // Fatal error
          throw new Error(`State ${state.name} failed`);
        }
      } catch (error) {
        logger.error(`Error in state ${state.name}:`);
        throw error;
      }
    }

    // Clear progress file on successful completion
    this.clearProgress();
  }

  /**
   * Execute a single state
   * @param {Object} state - State module
   * @returns {Object} Result with success/retry/skip flags
   */
  async executeState(state) {
    if (!state.name || !state.run) {
      throw new Error('Invalid state: must have name and run function');
    }

    // Check if state can be skipped
    if (state.check) {
      const checkResult = await state.check(this.context);
      if (checkResult.found && checkResult.canSkip) {
        logger.info(`Skipping ${state.name} (already completed)`);
        return { success: true, skip: true };
      }
    }

    // Run the state
    const result = await state.run(this.context);

    // Update context if state returned data
    if (result.data) {
      this.context = { ...this.context, ...result.data };
    }

    return result;
  }

  /**
   * Get current context
   * @returns {Object} Current context
   */
  getContext() {
    return { ...this.context };
  }
}

module.exports = StateMachine;
