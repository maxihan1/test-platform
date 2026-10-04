// 같은 기획서로 여러 번 작성한 케이스 폴더를 두 개씩 견주는 얇은 명령 — 8·9번(같은 입력이면 같은 결과)의 기준선
// 실행: npx tsx scripts/case-consistency.ts <폴더>[,<요구사항 표>] <폴더>[,<요구사항 표>]...
// 경로는 절대 경로로 준다 — 쉼표 뒤 `~` 는 셸이 펼치지 않는다

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { type 실행, 견주기, 견줌줄, 실행요약 } from './authoring-consistency.js';
import type { 파일글 } from './authoring-quality.js';

function 훑기(폴더: string, 뿌리: string): 파일글[] {
  return readdirSync(폴더).flatMap((이름) => {
    const 길 = join(폴더, 이름);
    if (statSync(길).isDirectory()) return 훑기(길, 뿌리);
    return 길.endsWith('.ts') ? [{ 경로: relative(뿌리, 길), 글: readFileSync(길, 'utf8') }] : [];
  });
}

const 인자들 = process.argv.slice(2);
if (인자들.length < 2) {
  console.error('견줄 케이스 폴더를 둘 이상 주세요 — 예: npx tsx scripts/case-consistency.ts /abs/run1/tests/mkt,/abs/run1/MKT.md /abs/run2/tests/mkt');
  process.exit(2);
}
const 실행들: { 이름: string; 실행: 실행 }[] = 인자들.map((인자) => {
  const [폴더 = '', 표 = undefined] = 인자.split(',');
  for (const 길 of [폴더, 표]) {
    if (길 !== undefined && !existsSync(길)) {
      console.error(`없는 경로입니다 — ${길}`);
      process.exit(2);
    }
  }
  return { 이름: 폴더, 실행: 실행요약(훑기(폴더, 폴더), 표 === undefined ? undefined : readFileSync(표, 'utf8')) };
});
for (const [i, a] of 실행들.entries()) {
  for (const b of 실행들.slice(i + 1)) console.log(`${a.이름}\n  ↔ ${b.이름}\n  ${견줌줄(견주기(a.실행, b.실행))}`);
}
