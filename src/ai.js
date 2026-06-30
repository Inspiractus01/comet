// Free, keyless text generation via Pollinations (OpenAI-compatible endpoint).
const ENDPOINT = 'https://text.pollinations.ai/openai';

function buildSystemPrompt({ conventional, short }) {
    if (short) {
        return `You write git commit messages.

Rules:
- Output ONLY a single Conventional Commits subject line: "type(scope): summary".
- type one of feat, fix, refactor, style, docs, test, chore, perf, build, ci; scope optional, derived from changed files.
- Lowercase, imperative mood, as short as possible (aim for under 50 chars).
- No body, no bullets, no quotes, no code fences, no explanations.
- Be specific to the diff. Do not invent changes.`;
    }

    const subject = conventional
        ? 'Subject line: "type(scope): summary" (type one of feat, fix, refactor, style, docs, test, chore, perf, build, ci; scope optional, derived from changed files), lowercase, imperative mood, max 72 chars.'
        : 'Subject line: one concise summary in imperative mood, max 72 chars.';

    return `You write git commit messages.

Rules:
- Output ONLY the commit message. No code fences, no quotes, no explanations.
- ${subject}
- If the change is non-trivial, add a blank line then 1-4 short "- " bullet points describing what changed and why.
- Keep it specific to the diff. Do not invent changes.`;
}

// Lockfiles / generated noise we strip before sending the diff to the model.
const NOISE = [
    /package-lock\.json/,
    /pnpm-lock\.yaml/,
    /yarn\.lock/,
    /\.min\.(js|css)/,
    /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|pdf)$/i,
];

const MAX_DIFF_CHARS = 8000;

function trimDiff(diff) {
    // Drop diff blocks for noisy files, then cap total size.
    const blocks = diff.split(/(?=^diff --git )/m);
    const kept = blocks.filter((b) => {
        const header = b.split('\n')[0] || '';
        return !NOISE.some((re) => re.test(header));
    });

    let result = kept.join('') || diff;
    if (result.length > MAX_DIFF_CHARS) {
        result = `${result.slice(0, MAX_DIFF_CHARS)}\n... [diff truncated]`;
    }
    return result;
}

function clean(message) {
    // Strip accidental code fences / surrounding quotes the model may add.
    return message
        .replace(/^```[a-z]*\n?/i, '')
        .replace(/\n?```$/i, '')
        .replace(/^["'`]|["'`]$/g, '')
        .trim();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function generateCommit(
    diff,
    { model = 'openai', conventional = true, short = false } = {},
) {
    const messages = [
        { role: 'system', content: buildSystemPrompt({ conventional, short }) },
        {
            role: 'user',
            content: `Generate a commit message for this staged diff:\n\n${trimDiff(diff)}`,
        },
    ];

    const attempts = 5;
    let lastStatus = 0;

    for (let i = 0; i < attempts; i++) {
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                model,
                private: true,
                referrer: 'comet-cli',
                seed: Math.floor(Math.random() * 1e9),
                messages,
            }),
        });
        lastStatus = res.status;

        if (res.ok) {
            const raw = (await res.text()).trim();
            let content = raw;
            try {
                const data = JSON.parse(raw);
                content =
                    data?.choices?.[0]?.message?.content ??
                    data?.choices?.[0]?.text ??
                    '';
            } catch {
                content = raw;
            }
            content = clean(content);
            if (content) {
                return content;
            }
        }

        const retryable = !res.ok && (res.status === 429 || res.status >= 500);
        const emptyOk = res.ok;
        if ((retryable || emptyOk) && i < attempts - 1) {
            await sleep(2000 * (i + 1));
            continue;
        }
        break;
    }

    if (lastStatus === 429) {
        throw new Error('rate limited (429) — wait a moment and try again');
    }
    throw new Error(
        lastStatus === 200
            ? 'AI returned an empty response — try again'
            : `AI request failed (${lastStatus})`,
    );
}
