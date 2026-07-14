import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = path.join(os.homedir(), '.config', 'comet');
const file = path.join(dir, 'config.json');

export const defaults = {
    ignoreClaudeMd: true, // skip CLAUDE.md when staging
    askForPush: false, // false = manual push, true = ask after commit
    conventionalCommits: true, // Conventional Commits style
    short: false, // short: subject line only, no body bullets
    ultraYolo: false, // yolo mode pushes immediately after commit, no prompt
};

export function loadConfig() {
    try {
        return { ...defaults, ...JSON.parse(readFileSync(file, 'utf8')) };
    } catch {
        return { ...defaults };
    }
}

export function saveConfig(cfg) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify(cfg, null, 2));
}
