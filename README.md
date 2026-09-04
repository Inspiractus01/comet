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
comet squash  # squash every unpushed commit into one, with a fresh message
comet push    # git push
comet config  # settings
```

`Esc` or `Ctrl-C` quits anytime.

## Squash

`comet squash` takes every commit the remote does not have yet, reads their combined
diff, and rewrites them into one commit with a freshly generated message — so a pile
of `wip` commits lands as if you had written it in one go.

```
☄ c o m e t

3 unpushed commits (ahead of origin/main):

  de4f30c  wip: b
  8856bc1  wip: c
  d4dd696  wip: a again

Proposed squash of 3 commits:

  feat(cli): add file picker and message editor
```

Commit, regenerate, edit, or cancel — same as a normal run. It refuses to touch
anything already pushed, and prints the old head so `git reset --hard <sha>` undoes it.

Needs an upstream (or an `origin/<branch>`) to know what is already pushed. Staged
changes must be committed or unstaged first, so they do not get folded in by accident.

## Settings (`comet config`)

| Setting | Default | Does |
|---|---|---|
| Ignore agent files | on | skips `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursorrules` when staging |
| Ask to push | off | asks to push after commit |
| Conventional Commits | on | `type(scope): summary` style |
| Short messages | off | subject line only, no bullets |
| Ultra yolo | off | `comet yolo` pushes immediately after commit, no prompt |

## Notes

- Updates itself on every run. Disable with `COMET_NO_UPDATE=1`.
- The free model is rate-limited per IP; comet retries on 429.
