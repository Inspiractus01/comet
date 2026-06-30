<p align="center">
  <img src="assets/comet.png" alt="comet" width="120">
</p>

# comet ☄️

Write git commit messages with AI. Free, no API key.

You pick the files, comet writes the message.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/Inspiractus01/comet/main/install.sh | bash
```

Needs `node` and `git`. If `comet` isn't found after install, add `~/.local/bin` to your PATH.

## Use

```bash
comet        # pick files, get a message, commit
comet yolo   # stage everything and commit
```

You can commit, regenerate, edit, or cancel the message before it's saved.

## Notes

- AI runs through [Pollinations](https://pollinations.ai) — free, no key.
- Updates itself on every run.
- `COMET_NO_UPDATE=1` turns auto-update off.
