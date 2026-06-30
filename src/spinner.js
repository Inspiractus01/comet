const O = '\x1b[38;5;208m';
const A = '\x1b[38;5;214m';
const DIM = '\x1b[2m';
const R = '\x1b[0m';

export const GENERATE_WORDS = [
    'Stargazing',
    'Orbiting',
    'Igniting',
    'Streaking',
    'Brewing',
    'Distilling',
    'Charting',
    'Conjuring',
    'Pondering',
    'Blazing',
    'Computing',
    'Crafting',
];

export const YOLO_WORDS = [
    'Sending it',
    'Full send',
    'No takebacks',
    'Throttle up',
    'Going for it',
    'Blazing',
];

export const PUSH_WORDS = [
    'Launching',
    'Hurtling',
    'Beaming up',
    'Liftoff',
    'Boosting',
    'To orbit',
];

function pick(words) {
    return words[Math.floor(Math.random() * words.length)];
}

function comet(pos, width, tail, head) {
    const cells = Array(width).fill(' ');
    for (let t = 0; t < tail.length; t++) {
        const p = pos - (t + 1);
        if (p >= 0 && p < width) {
            cells[p] = `${DIM}${A}${tail[t]}${R}`;
        }
    }
    if (pos >= 0 && pos < width) {
        cells[pos] = `${O}\x1b[1m${head}${R}`;
    }
    return cells.join('');
}

export function startSpinner({
    words,
    tail = ['.', '.', '.'],
    head = '*',
    width = 16,
    interval = 110,
} = {}) {
    if (!process.stdout.isTTY) {
        return () => {};
    }

    const word = pick(words);
    let pos = 0;
    let tick = 0;
    process.stdout.write('\x1b[?25l');

    const id = setInterval(() => {
        const cols = process.stdout.columns || 80;
        const dots = '.'.repeat(tick % 4).padEnd(3);
        const left = `  ${O}${word}${R}${DIM}${dots}${R}`;
        const leftLen = 2 + word.length + 3;
        const anim = comet(pos, width, tail, head);
        const pad = Math.max(2, cols - leftLen - width - 1);
        process.stdout.write(`\r\x1b[K${left}${' '.repeat(pad)}${anim}`);
        pos = (pos + 1) % (width + tail.length);
        tick++;
    }, interval);

    return () => {
        clearInterval(id);
        process.stdout.write('\r\x1b[K\x1b[?25h');
    };
}
