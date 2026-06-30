import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function git(args) {
    return execFileSync('git', ['-C', root, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
}

function installDeps() {
    const hasPnpm = spawnSync('pnpm', ['--version'], { stdio: 'ignore' });
    const pm = hasPnpm.status === 0 ? 'pnpm' : 'npm';
    spawnSync(pm, ['install', '--silent'], { cwd: root, stdio: 'ignore' });
}

// Pull the latest version on startup, then re-exec so the new code runs.
// Silent + best-effort: offline or non-git installs are skipped.
export function selfUpdate() {
    if (process.env.COMET_NO_UPDATE || !existsSync(path.join(root, '.git'))) {
        return;
    }

    let branch;
    let local;
    let remote;
    try {
        branch = git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'main';
        local = git(['rev-parse', 'HEAD']);
        remote = git(['ls-remote', 'origin', branch]).split('\t')[0];
    } catch {
        return; // offline / no origin
    }

    if (!remote || local === remote) {
        return;
    }

    process.stdout.write('updating comet…\n');
    try {
        git(['pull', '--ff-only']);
    } catch {
        return; // local changes / conflict — leave it alone
    }
    installDeps();

    // Re-run the freshly pulled CLI with the same args.
    const res = spawnSync(
        process.execPath,
        [path.join(root, 'src', 'cli.js'), ...process.argv.slice(2)],
        { stdio: 'inherit', env: { ...process.env, COMET_NO_UPDATE: '1' } },
    );
    process.exit(res.status ?? 0);
}
