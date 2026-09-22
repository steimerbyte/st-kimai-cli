#!/usr/bin/env bash
# scripts/release.sh — package + tag + GitHub release in one command
# Usage: ./scripts/release.sh 2.0.2 [--dry-run]
set -euo pipefail

VERSION="${1:-}"
DRY_RUN="${2:-}"

if [[ -z "$VERSION" ]]; then
  echo "usage: $0 <version> [--dry-run]" >&2
  exit 1
fi

if [[ "$DRY_RUN" != "--dry-run" ]]; then
  cd "$(dirname "$0")/.."
fi

echo "→ Building…"
npm run build

echo "→ Running tests + coverage…"
npm run coverage || {
  echo "✗ Coverage below threshold. Aborting." >&2
  exit 1
}

echo "→ Bumping version to $VERSION…"
npm version "$VERSION" --no-git-tag-version

echo "→ Committing version bump…"
git add package.json package-lock.json
git -c user.name="steimerbyte" -c user.email="steimerbyte@users.noreply.github.com" \
  commit -m "chore: bump to v$VERSION"

echo "→ Pushing master…"
git push origin master

echo "→ Tagging v$VERSION…"
git -c user.name="steimerbyte" -c user.email="steimerbyte@users.noreply.github.com" \
  tag -a "v$VERSION" -m "v$VERSION"
git push origin "v$VERSION"

echo "→ Packaging tarball…"
npx --yes npm-packlist --quiet >/dev/null 2>&1 || true
TARBALL="st-kimai-cli-$VERSION.tgz"
npm pack >/dev/null

echo "→ Creating GitHub release…"
NOTES_FILE="RELEASE-NOTES-$VERSION.md"
if [[ -f "$NOTES_FILE" ]]; then
  gh release create "v$VERSION" --title "v$VERSION" --notes-file "$NOTES_FILE"
else
  gh release create "v$VERSION" --title "v$VERSION" --generate-notes
fi

echo "→ Uploading tarball…"
gh release upload "v$VERSION" "$TARBALL"

echo "✓ v$VERSION released."
