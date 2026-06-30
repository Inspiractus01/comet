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

function track(pos, width, tail) {
    const cells = Array(width).fill(' ');
    for (let t = 0; t < tail.length; t++) {
        const p = pos - (t + 1);
        if (p >= 0) {
            cells[p] = `${DIM}${A}${tail[t]}${R}`;
        }
    }
    if (pos < width) {
        cells[pos] = `${O}\x1b[1m☄${R}`;
    }
    return cells.join('');
}

export function startSpinner({
    words,
    tail = ['⋆', '·'],
    width = 12,
    interval = 110,
} = {}) {
    if (!process.stdout.isTTY) {
        return () => {};
    }

    const word = pick(words);
    let pos = 0;
    let tick = 0;
    process.stdout.write('\x1b[?25l'); // hide cursor

    const id = setInterval(() => {
        const dots = '.'.repeat(tick % 4);
        process.stdout.write(
            `\r\x1b[K  ${track(pos, width, tail)}  ${O}${word}${R}${DIM}${dots}${R}`,
        );
        pos = (pos + 1) % (width + tail.length);
        tick++;
    }, interval);

    return () => {
        clearInterval(id);
        process.stdout.write('\r\x1b[K\x1b[?25h'); // clear line, show cursor
    };
}
