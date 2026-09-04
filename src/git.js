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

export function currentBranch() {
    return git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
}

// Ref this branch is published at: its upstream, or a same-named remote
// branch when nothing is tracked yet. null when the branch is local-only.
export function upstreamRef() {
    try {
        return git(
            ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'],
            { stdio: 'pipe' },
        ).trim();
    } catch {
        // no upstream configured — fall through
    }

    try {
        const remote = `origin/${currentBranch()}`;
        git(['rev-parse', '--verify', '--quiet', remote], { stdio: 'pipe' });
        return remote;
    } catch {
        return null;
    }
}

// Commits on HEAD the remote does not have yet, oldest first.
export function unpushedCommits(base) {
    return git(['log', '--reverse', '--format=%h%x00%s', `${base}..HEAD`])
        .split('\n')
        .filter(Boolean)
        .map((line) => {
            const [hash, subject] = line.split('\0');
            return { hash, subject };
        });
}

// Combined diff of everything those commits changed.
export function rangeDiff(base) {
    return git(['diff', '--no-color', `${base}..HEAD`]);
}

export function headSha() {
    return git(['rev-parse', 'HEAD']).trim();
}

// Moves the branch back to ref, keeping every change staged.
export function softReset(ref) {
    git(['reset', '--soft', ref]);
}
