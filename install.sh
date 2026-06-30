#!/usr/bin/env bash
# Install comet:  curl -fsSL https://raw.githubusercontent.com/Inspiractus01/comet/main/install.sh | bash
set -e

REPO="https://github.com/Inspiractus01/comet.git"
DIR="$HOME/.comet"
BIN_DIR="$HOME/.local/bin"

command -v git >/dev/null 2>&1 || { echo "comet: git is required"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "comet: node (>=18) is required"; exit 1; }

# Clone or update the install copy.
if [ -d "$DIR/.git" ]; then
    git -C "$DIR" pull --ff-only
else
    rm -rf "$DIR"
    git clone --depth 1 "$REPO" "$DIR"
fi

# Install dependencies (prefer pnpm, fall back to npm).
cd "$DIR"
if command -v pnpm >/dev/null 2>&1; then
    pnpm install --silent
else
    npm install --silent
fi

# Drop a wrapper into the user's bin dir.
mkdir -p "$BIN_DIR"
cat > "$BIN_DIR/comet" <<EOF
#!/usr/bin/env bash
exec node "$DIR/src/cli.js" "\$@"
EOF
chmod +x "$BIN_DIR/comet"

echo ""
echo "comet installed ☄️"
case ":$PATH:" in
    *":$BIN_DIR:"*) echo "Run: comet" ;;
    *) echo "Add this to your shell profile, then restart your terminal:"
       echo "  export PATH=\"\$HOME/.local/bin:\$PATH\"" ;;
esac
