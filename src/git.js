import { execFileSync } from 'node:child_process';

function git(args, opts = {}) {
    return execFileSync('git', args, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 20,
        ...opts,
    });
}

export function isRepo() {
    try {
        git(['rev-parse', '--is-inside-work-tree'], { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

// Returns [{ path, staged }] for every changed/untracked file.
export function changedFiles() {
    const out = git(['status', '--porcelain=v1', '--untracked-files=all']);
    const files = [];

    for (const line of out.split('\n')) {
        if (!line.trim()) {
            continue;
        }

        const index = line[0]; // staged column
        let path = line.slice(3);

        // handle "old -> new" for renames
        if (path.includes(' -> ')) {
            path = path.split(' -> ')[1];
        }

        files.push({
            path,
            staged: index !== ' ' && index !== '?',
        });
    }

    return files;
}

export function stageOnly(paths) {
    // Reset the index, then stage exactly the chosen files.
    git(['reset', '--quiet']);
    if (paths.length > 0) {
        git(['add', '--', ...paths]);
    }
}

export function stageAll() {
    git(['add', '-A']);
}

export function unstage(paths) {
    if (paths.length > 0) {
        git(['restore', '--staged', '--', ...paths]);
    }
}

export function stagedDiff() {
    return git(['diff', '--cached', '--no-color']);
}

export function stagedFileNames() {
    return git(['diff', '--cached', '--name-only'])
        .split('\n')
        .filter(Boolean);
}

export function commit(message) {
    git(['commit', '-m', message], { stdio: 'inherit' });
}

export function push() {
    git(['push'], { stdio: 'inherit' });
}
