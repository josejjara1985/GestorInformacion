#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d .git ]; then
  git init
fi

git add .
git status
git commit -m "Deploy inicial" || true
git branch -M main

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin https://github.com/josejjara/GestorInformacion.git
else
  git remote add origin https://github.com/josejjara/GestorInformacion.git
fi

git push -u origin main
