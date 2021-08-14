#!/usr/bin/env sh

set -e
git push

npm run build

cd docs/.vuepress/dist

git init
git add -A
git commit -m 'chore: %%% deploy'

echo 'www.liaosqnotes.com' > CNAME


cd -
rm -rf docs/.vuepress/dist