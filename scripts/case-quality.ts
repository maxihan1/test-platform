// 케이스 폴더 하나의 품질 숫자를 찍는 얇은 명령 — 다시 작성한 케이스를 이전 케이스와 견줄 때 쓴다
// 실행: npx tsx scripts/case-quality.ts <케이스 폴더>...

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { type 파일글, 품질숫자, 품질줄 } from './authoring-quality.js';

function 훑기(폴더: string, 뿌리: string): 파일글[] {
  return readdirSync(폴더).flatMap((이름) => {
    const 길 = join(폴더, 이름);
    if (statSync(길).isDirectory()) return 훑기(길, 뿌리);
    return 길.endsWith('.ts') ? [{ 경로: relative(뿌리, 길), 글: readFileSync(길, 'utf8') }] : [];
  });
}

const 폴더들 = process.argv.slice(2);
if (폴더들.length === 0) {
  console.error('케이스 폴더를 하나 이상 주세요 — 예: npx tsx scripts/case-quality.ts tests/mkt');
  process.exit(2);
}
for (const 폴더 of 폴더들) console.log(`${폴더}\n  ${품질줄(품질숫자(훑기(폴더, 폴더)))}`);
