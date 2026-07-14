#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { emitKeypressEvents } from 'node:readline';
import {
    checkbox,
    confirm,
    editor,
    select,
} from '@inquirer/prompts';
import { generateCommit } from './ai.js';
import { defaults, loadConfig, saveConfig } from './config.js';
import {
    changedFiles,
    commit,
    isRepo,
    stageAll,
    stagedDiff,
    stagedFileNames,
    stageOnly,
    unstage,
} from './git.js';
import {
    GENERATE_WORDS,
    PUSH_WORDS,
    startSpinner,
    YOLO_WORDS,
} from './spinner.js';
import { selfUpdate } from './update.js';

let cfg = loadConfig();

const IGNORED = new Set([
    'CLAUDE.md',
    'CLAUDE.local.md',
    'AGENTS.md',
    'GEMINI.md',
    '.cursorrules',
]);
const isIgnored = (p) => cfg.ignoreClaudeMd && IGNORED.has(p.split('/').pop());

const O = '\x1b[38;5;208m'; // orange
const A = '\x1b[38;5;214m'; // amber
const R = '\x1b[0m';
const c = {
    orange: (s) => `${O}${s}${R}`,
    bold: (s) => `\x1b[1m${s}${R}`,
    dim: (s) => `\x1b[2m${s}${R}`,
    red: (s) => `\x1b[31m${s}${R}`,
};

// Orange theme shared across all prompts.
const theme = {
    prefix: c.orange('☄'),
    style: {
        answer: (t) => c.orange(t),
        highlight: (t) => `${O}\x1b[1m${t}${R}`,
    },
};

function banner() {
    console.log(`${O}\x1b[1m
   ☄   c o m e t${R}
`);
}

function bail(msg) {
    console.error(c.red(msg));
    process.exit(1);
}

function animatedPush() {
    return new Promise((resolve, reject) => {
        const stop = startSpinner({
            words: PUSH_WORDS,
            head: '>',
            interval: 100,
        });
        let err = '';
        const p = spawn('git', ['push'], {
            stdio: ['ignore', 'ignore', 'pipe'],
        });
        p.stderr.on('data', (d) => {
            err += d;
        });
        p.on('error', (e) => {
            stop();
            reject(e);
        });
        p.on('close', (code) => {
            stop();
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(err.trim() || 'push failed'));
            }
        });
    });
}

// Quit on Escape (in addition to Ctrl-C), like cancelling the commit.
function enableEscapeToQuit() {
    if (!process.stdin.isTTY) {
        return;
    }
    emitKeypressEvents(process.stdin);
    process.stdin.on('keypress', (_, key) => {
        if (key?.name === 'escape') {
            console.log(c.dim('\nAborted.'));
            process.exit(0);
        }
    });
}

async function generate(words = GENERATE_WORDS) {
    const diff = stagedDiff();
    if (!diff.trim()) {
        bail('Nothing staged.');
    }
    const stop = startSpinner({ words });
    try {
        const msg = await generateCommit(diff, {
            conventional: cfg.conventionalCommits,
            short: cfg.short,
        });
        stop();
        return msg;
    } catch (err) {
        stop();
        bail(`AI error: ${err.message}`);
    }
}

async function confirmAndCommit(initialMessage) {
    let message = initialMessage;

    while (true) {
        console.log(`\n${c.orange(c.bold('Proposed commit:'))}\n`);
        console.log(
            message
                .split('\n')
                .map((l) => `  ${A}${l}${R}`)
                .join('\n'),
        );
        console.log('');

        const action = await select({
            message: 'What now?',
            choices: [
                { name: 'Commit', value: 'commit' },
                { name: 'Regenerate', value: 'regen' },
                { name: 'Edit', value: 'edit' },
                { name: 'Cancel', value: 'cancel' },
            ],
            theme,
        });

        if (action === 'cancel') {
            console.log(c.dim('Cancelled. Changes stay staged.'));
            return;
        }
        if (action === 'regen') {
            message = await generate();
            continue;
        }
        if (action === 'edit') {
            message = (
                await editor({
                    message: 'Edit message',
                    default: message,
                    theme,
                })
            ).trim();
            continue;
        }

        commit(message);
        console.log(c.orange('☄ committed'));

        if (
            cfg.askForPush &&
            (await confirm({ message: 'Push?', default: false, theme }))
        ) {
            await animatedPush();
            console.log(c.orange('☄ pushed'));
        }
        return;
    }
}

async function runConfig() {
    const items = [
        {
            key: 'ignoreClaudeMd',
            name: 'Ignore agent files (CLAUDE.md, AGENTS.md, …) when staging',
        },
        { key: 'askForPush', name: 'Ask to push after commit' },
        { key: 'conventionalCommits', name: 'Conventional Commits style' },
        { key: 'short', name: 'Short messages (subject line only)' },
        { key: 'ultraYolo', name: 'Ultra yolo — yolo mode pushes immediately, no prompt' },
    ];

    const enabled = await checkbox({
        message: 'Settings — space to toggle, enter to save',
        choices: items.map((i) => ({
            name: i.name,
            value: i.key,
            checked: cfg[i.key],
        })),
        loop: false,
        theme,
    });

    const next = { ...defaults };
    for (const i of items) {
        next[i.key] = enabled.includes(i.key);
    }
    saveConfig(next);
    cfg = next;
    console.log(c.orange('☄ settings saved'));
}

async function yolo() {
    stageAll();
    unstage(stagedFileNames().filter(isIgnored));
    if (stagedFileNames().length === 0) {
        bail('Nothing to commit.');
    }

    const message = await generate(YOLO_WORDS);
    console.log(`\n${c.orange(c.bold('Commit:'))}\n`);
    console.log(
        message
            .split('\n')
            .map((l) => `  ${A}${l}${R}`)
            .join('\n'),
    );
    console.log('');

    commit(message);
    console.log(c.orange('☄ committed'));

    if (cfg.ultraYolo) {
        await animatedPush();
        console.log(c.orange('☄ pushed'));
    }
}

async function interactive() {
    const files = changedFiles().filter((f) => !isIgnored(f.path));
    if (files.length === 0) {
        bail('Working tree clean — nothing to commit.');
    }

    const selected = await checkbox({
        message: 'Select files to include',
        choices: files.map((f) => ({
            name: f.path,
            value: f.path,
            checked: f.staged,
        })),
        loop: false,
        theme,
    });

    if (selected.length === 0) {
        bail('No files selected.');
    }

    stageOnly(selected);
    await confirmAndCommit(await generate());
}

async function main() {
    selfUpdate();
    banner();
    enableEscapeToQuit();

    const cmd = process.argv[2];

    if (cmd === 'config') {
        await runConfig();
        return;
    }

    if (!isRepo()) {
        bail('Not a git repository.');
    }

    if (cmd === 'yolo') {
        await yolo();
    } else if (cmd === 'push') {
        await animatedPush();
        console.log(c.orange('☄ pushed'));
    } else if (!cmd) {
        await interactive();
    } else {
        console.log('Usage: comet [yolo|push|config]');
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        if (err?.name === 'ExitPromptError') {
            console.log(c.dim('\nAborted.'));
            process.exit(0);
        }
        bail(err.message);
    });
