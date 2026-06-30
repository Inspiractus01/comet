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

function cometDots(pos, width, head) {
    const cells = Array(width).fill(`${DIM}.${R}`);
    const behind = pos - 1;
    if (behind >= 0 && behind < width) {
        cells[behind] = `${A}.${R}`;
    }
    if (pos >= 0 && pos < width) {
        cells[pos] = `${O}\x1b[1m${head}${R}`;
    }
    return cells.join('');
}

export function startSpinner({
    words,
    head = '*',
    width = 5,
    interval = 130,
} = {}) {
    if (!process.stdout.isTTY) {
        return () => {};
    }

    const word = pick(words);
    let pos = 0;
    process.stdout.write('\x1b[?25l');

    const id = setInterval(() => {
        process.stdout.write(
            `\r\x1b[K  ${O}${word}${R}${cometDots(pos, width, head)}`,
        );
        pos = (pos + 1) % width;
    }, interval);

    return () => {
        clearInterval(id);
        process.stdout.write('\r\x1b[K\x1b[?25h');
    };
}
