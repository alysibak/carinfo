#!/usr/bin/env bash
# Puts a data run's files on main; see action.yml. Runs from the repository
# root with FILES, MESSAGE and REPORT set, and GITHUB_STEP_SUMMARY where the
# summary goes.
set -eo pipefail
cd "${GITHUB_WORKSPACE:-$(git rev-parse --show-toplevel)}"
summary="${GITHUB_STEP_SUMMARY:-/dev/null}"
aside="${RUNNER_TEMP:-/tmp}/site-data"

# Kept aside: main's checkout takes away what only this run has.
rm -rf "$aside" && mkdir -p "$aside"
: > "$aside/report.txt"
if [ -n "$REPORT" ] && [ -e "$REPORT" ]; then cp "$REPORT" "$aside/report.txt"; fi
for path in $FILES; do
  if [ -e "$path" ]; then install -D -m 644 "$path" "$aside/$path"; fi
done
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
for attempt in 1 2 3; do
  git fetch --depth=1 origin main
  git checkout -f -B main FETCH_HEAD
  for path in $FILES; do
    if [ -e "$aside/$path" ]; then install -D -m 644 "$aside/$path" "$path"; fi
  done
  # tsx is the server workspace's; its bin is linked there, not at the root.
  (cd server && npx tsx scripts/check-site-data.ts HEAD) | tee -a "$summary"
  if git diff --quiet -- $FILES; then
    echo 'Main has this data already.' | tee -a "$summary"
    exit 0
  fi
  (cd server && npm run build-runtime-db && npm run validate:data && npm test)
  git add -- $FILES
  git commit -m "$MESSAGE ($(date -u +%F))" -m "$(grep '^Done' "$aside/report.txt" || true)"
  if git push origin main; then
    echo "Pushed to main: $MESSAGE" | tee -a "$summary"
    exit 0
  fi
  sleep $((attempt * 30))
done
echo '::error::Main moved three times while this run tried to push; run the workflow again.'
exit 1
