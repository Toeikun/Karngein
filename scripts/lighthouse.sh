#!/usr/bin/env bash
# วัด Lighthouse (มือถือ) กับเว็บที่ build แล้วใน out/ — ใช้ Chrome ที่มีในเครื่อง
# รัน: bash scripts/lighthouse.sh   (ต้อง build ก่อน)
set -euo pipefail
PORT=4174
node scripts/serve-out.mjs "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 1
CHROME_PATH="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}" \
  npx --yes lighthouse@12 "http://localhost:$PORT/" --form-factor=mobile \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless=new" --output=json --output-path=/tmp/karngein-lh.json --quiet
node -e "
const r=require('/tmp/karngein-lh.json');
for (const [k,v] of Object.entries(r.categories)) console.log(k.padEnd(15), Math.round(v.score*100));
console.log('LCP', r.audits['largest-contentful-paint'].displayValue, '| TBT', r.audits['total-blocking-time'].displayValue);
"
