#!/usr/bin/env node
import {
    checkbox,
    confirm,
    editor,
    select,
} from '@inquirer/prompts';
import { generateCommit } from './ai.js';
import {
    changedFiles,
    commit,
    isRepo,
    push,
    stageAll,
    stagedDiff,
    stagedFileNames,
    stageOnly,
} from './git.js';
import { selfUpdate } from './update.js';

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
   ☄   c o m e t${R}${O}
        ai commit messages${R}
`);
}

function bail(msg) {
    console.error(c.red(msg));
    process.exit(1);
}

async function generate() {
    const diff = stagedDiff();
    if (!diff.trim()) {
        bail('Nothing staged.');
    }
    process.stdout.write(c.dim('  generating message…'));
    try {
        const msg = await generateCommit(diff);
        process.stdout.write('\r\x1b[K');
        return msg;
    } catch (err) {
        process.stdout.write('\r\x1b[K');
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

        if (await confirm({ message: 'Push?', default: false, theme })) {
            push();
        }
        return;
    }
}

async function yolo() {
    stageAll();
    if (stagedFileNames().length === 0) {
        bail('Nothing to commit.');
    }
    await confirmAndCommit(await generate());
}

async function interactive() {
    const files = changedFiles();
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

    if (!isRepo()) {
        bail('Not a git repository.');
    }

    const cmd = process.argv[2];

    if (cmd === 'yolo') {
        await yolo();
    } else if (!cmd) {
        await interactive();
    } else {
        console.log('Usage: comet [yolo]');
        process.exit(1);
    }
}

main().catch((err) => {
    if (err?.name === 'ExitPromptError') {
        console.log(c.dim('\nAborted.'));
        process.exit(0);
    }
    bail(err.message);
});
