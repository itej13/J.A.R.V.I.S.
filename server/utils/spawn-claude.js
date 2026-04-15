const { spawn } = require('child_process');
const os = require('os');

function spawnOpenCode({ task, workingDir, sessionId }) {
  const emitter = new (require('events').EventEmitter)();
  const workDir = workingDir || process.env.CLAUDE_WORKING_DIR || os.homedir();

  const args = ['--task', task];

  let child;
  try {
    child = spawn('opencode', args, {
      cwd: workDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    if (err.code === 'ENOENT') {
      emitter.emit('error', new Error('OpenCode CLI not found. Please install: npm install -g opencode'));
      return emitter;
    }
    emitter.emit('error', err);
    return emitter;
  }

  let buffer = '';

  child.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        emitter.emit('data', parsed);
      } catch {
        emitter.emit('data', { type: 'text', content: line });
      }
    }
  });

  child.stderr.on('data', (data) => {
    emitter.emit('error', new Error(data.toString()));
  });

  child.on('close', (code) => {
    emitter.emit('done', code);
  });

  child.on('error', (err) => {
    emitter.emit('error', err);
  });

  emitter.kill = () => {
    if (child && !child.killed) {
      child.kill();
    }
  };

  return emitter;
}

module.exports = { spawnOpenCode };