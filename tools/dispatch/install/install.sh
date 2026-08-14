#!/usr/bin/env bash
# Installs the dispatch job as a launchd user agent, running every 2 hours.
# Ships with --dry-run baked into the plist -- edit the plist and re-run
# this script yourself once you've watched several dry runs and are ready
# to let it merge for real.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PLIST_SRC="$REPO_ROOT/tools/dispatch/install/com.spellroad.dispatch.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.spellroad.dispatch.plist"

sed "s|REPO_ROOT|$REPO_ROOT|g" "$PLIST_SRC" > "$PLIST_DEST"
launchctl unload "$PLIST_DEST" 2>/dev/null || true
launchctl load "$PLIST_DEST"

echo "Installed. Runs every 2 hours in --dry-run mode."
echo "Logs: $REPO_ROOT/tools/dispatch/runs/launchd.log"
echo "To stop: launchctl unload $PLIST_DEST"
