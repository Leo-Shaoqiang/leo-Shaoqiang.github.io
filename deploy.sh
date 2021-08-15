#!/usr/bin/env sh

set -e
git push

npm run build

cd docs/.vuepress/dist

git init
git add -A
git commit -m 'chore: %%% deploy'



git push -f git@github.com:Leo-Shaoqiang/leo-Shaoqiang.github.io.git master 

cd -

rm -rf docs/.vuepress/dist