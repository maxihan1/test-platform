// 같은 기획서로 여러 번 작성한 케이스 폴더를 두 개씩 견주는 얇은 명령 — 바뀐 부분만 다시 만들기 · 같은 입력이면 같은 결과의 기준선
// 실행: npx tsx scripts/case-consistency.ts <폴더>[,<요구사항 표>] <폴더>[,<요구사항 표>]...
// 경로는 절대 경로로 준다 — 쉼표 뒤 `~` 는 셸이 펼치지 않는다

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { 견주기, 견줌줄, 실행요약 } from './authoring-consistency.js';

const 사용법 = '견줄 케이스 폴더를 둘 이상 주세요 — 예: npx tsx scripts/case-consistency.ts /abs/run1/tests/mkt,/abs/run1/MKT.md /abs/run2/tests/mkt';
function 멈추기(글: string): never {
  console.error(글);
  process.exit(2);
}

const 인자들 = process.argv.slice(2);
if (인자들.length < 2) 멈추기(사용법);
const 실행들 = 인자들.map((인자) => {
  const 조각 = 인자.split(',');
  if (조각.length > 2) 멈추기(`폴더와 표 하나만 쉼표로 잇습니다 — ${인자}\n${사용법}`);
  const [폴더 = '', 표] = 조각;
  if (!existsSync(폴더) || !statSync(폴더).isDirectory()) 멈추기(`케이스 폴더가 아닙니다 — ${폴더}`);
  if (표 !== undefined && !existsSync(표)) 멈추기(`없는 경로입니다 — ${표}`);
  const 파일들 = readdirSync(폴더, { recursive: true, encoding: 'utf8' })
    .filter((경로) => 경로.endsWith('.ts'))
    .map((경로) => ({ 경로, 글: readFileSync(join(폴더, 경로), 'utf8') }));
  try {
    return { 이름: 폴더, 실행: 실행요약(파일들, 표 === undefined ? undefined : readFileSync(표, 'utf8')) };
  } catch (e) {
    return 멈추기(`${폴더} — ${e instanceof Error ? e.message : String(e)}`);
  }
});
for (const [i, a] of 실행들.entries()) {
  for (const b of 실행들.slice(i + 1)) console.log(`${a.이름}\n  ↔ ${b.이름}\n  ${견줌줄(견주기(a.실행, b.실행))}`);
}
