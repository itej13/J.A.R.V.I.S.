const { execSync } = require('child_process');

try {
  execSync('opencode --version', { stdio: 'ignore' });
} catch (e) {
  console.warn('WARNING: OpenCode CLI not found. Autonomous coding features will not work.');
  console.warn('To install: npm install -g opencode');
}