#!/usr/bin/env bash
#
# Replace the local service-account key file with user credentials.
#
# The key in the repo root is a long-lived, full-project-admin credential
# sitting in a directory that gets copied, archived and backed up. User
# credentials give the same local access with nothing on disk to leak.
#
# This has to happen in a specific order — delete the key while .env.local
# still points GOOGLE_APPLICATION_CREDENTIALS at it and local dev breaks
# instantly, with an error that doesn't say why. This script enforces the order
# and refuses to remove anything it hasn't first proved is replaceable.
#
#   ./scripts/drop-service-account-key.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

PROJECT="al-fitrah"
KEY_FILE="serviceAccountKey.json"
ENV_FILE=".env.local"
ADC="$HOME/.config/gcloud/application_default_credentials.json"

echo "==> Checking for Application Default Credentials"
if [ ! -f "$ADC" ]; then
  echo
  echo "  Not found. Run this first — it opens a browser:"
  echo
  echo "      gcloud auth application-default login"
  echo
  echo "  Then run this script again. Nothing has been changed."
  exit 1
fi

echo "==> Verifying they can actually reach Firestore in $PROJECT"
# Proving the replacement works BEFORE removing the thing it replaces is the
# whole point. A token that exists but lacks access would otherwise be
# discovered only after the key was gone.
if ! GOOGLE_APPLICATION_CREDENTIALS="" node --input-type=module -e "
  import { initializeApp, applicationDefault } from 'firebase-admin/app';
  import { getFirestore } from 'firebase-admin/firestore';
  initializeApp({ credential: applicationDefault(), projectId: '$PROJECT' });
  await getFirestore().collection('leads').limit(1).get();
  console.log('    ok — read a document with user credentials');
" 2>/dev/null; then
  echo
  echo "  Could not read Firestore with those credentials. Nothing has been changed."
  echo "  Try: gcloud auth application-default set-quota-project $PROJECT"
  exit 1
fi

echo "==> Removing GOOGLE_APPLICATION_CREDENTIALS from $ENV_FILE"
if [ -f "$ENV_FILE" ] && grep -q '^GOOGLE_APPLICATION_CREDENTIALS=' "$ENV_FILE"; then
  cp "$ENV_FILE" "$ENV_FILE.bak"
  grep -v '^GOOGLE_APPLICATION_CREDENTIALS=' "$ENV_FILE" > "$ENV_FILE.tmp"
  mv "$ENV_FILE.tmp" "$ENV_FILE"
  echo "    done (previous version saved as $ENV_FILE.bak)"
else
  echo "    not set — nothing to remove"
fi

echo "==> Deleting $KEY_FILE"
if [ -f "$KEY_FILE" ]; then
  rm "$KEY_FILE"
  echo "    deleted"
else
  echo "    already gone"
fi

echo
echo "Done. Restart 'npm run dev' — applicationDefault() picks up the user"
echo "credentials with no code change."
echo
echo "If anything misbehaves, restore with: mv $ENV_FILE.bak $ENV_FILE"
