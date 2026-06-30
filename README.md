<p align="center">
  <img src="assets/comet.png" alt="comet" width="120">
</p>

# comet ☄️

> *because "fix stuff" isn't a commit message*

A small CLI that writes your git commit messages. Free, no API key.

You stage the files, comet reads the diff and proposes a message. You commit.

## How it works

1. Reads your staged changes (`git diff --cached`).
2. Sends the diff to a free model ([Pollinations](https://pollinations.ai), no key needed).
3. Gives you a [Conventional Commits](https://www.conventionalcommits.org) message to commit, edit, or regenerate.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/Inspiractus01/comet/main/install.sh | bash
```

Needs `node` (≥18) and `git`. If `comet` isn't found afterwards, add `~/.local/bin` to your `PATH`.

## Commands

```bash
comet         # pick files, review the message, commit
comet yolo    # stage everything and commit
comet push    # git push
comet config  # settings
```

`Esc` or `Ctrl-C` quits anytime.

## Settings (`comet config`)

| Setting | Default | Does |
|---|---|---|
| Ignore CLAUDE.md | on | skips `CLAUDE.md` when staging |
| Ask to push | off | asks to push after commit |
| Conventional Commits | on | `type(scope): summary` style |
| Short messages | off | subject line only, no bullets |

## Notes

- Updates itself on every run. Disable with `COMET_NO_UPDATE=1`.
- The free model is rate-limited per IP; comet retries on 429.
