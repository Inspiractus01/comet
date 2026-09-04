// Commit messages via the local Claude Code CLI. Uses the user's existing
// login — no API key, no per-request billing.
import { spawn } from 'node:child_process';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const TIMEOUT_MS = 60000;

export function generateWithClaude(prompt, input, { model = DEFAULT_MODEL } = {}) {
    const bin = process.env.COMET_CLAUDE_BIN || 'claude';

    return new Promise((resolve, reject) => {
        const child = spawn(
            bin,
            [
                '-p',
                prompt,
                '--model',
                model,
                // Commit messages need no tools; blocking them keeps the run
                // fast and stops it from ever prompting for permission.
                '--allowed-tools',
                '',
            ],
            { stdio: ['pipe', 'pipe', 'pipe'] },
        );

        let out = '';
        let err = '';
        const timer = setTimeout(() => {
            child.kill('SIGKILL');
            reject(new Error('claude CLI timed out after 60s'));
        }, TIMEOUT_MS);

        child.stdout.on('data', (d) => {
            out += d;
        });
        child.stderr.on('data', (d) => {
            err += d;
        });

        child.on('error', (e) => {
            clearTimeout(timer);
            reject(
                e.code === 'ENOENT'
                    ? new Error(
                          'claude CLI not found — install Claude Code, or set provider to "pollinations"',
                      )
                    : e,
            );
        });

        child.on('close', (code) => {
            clearTimeout(timer);
            if (code !== 0) {
                reject(
                    new Error(
                        `claude CLI exited with ${code}${err.trim() ? `: ${err.trim().split('\n')[0]}` : ''}`,
                    ),
                );
                return;
            }
            const text = out.trim();
            if (!text) {
                reject(new Error('claude CLI returned an empty response'));
                return;
            }
            resolve(text);
        });

        child.stdin.end(input);
    });
}
