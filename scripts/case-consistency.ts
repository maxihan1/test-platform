// 같은 기획서로 여러 번 작성한 케이스 폴더를 두 개씩 견주는 얇은 명령 — 바뀐 부분만 다시 만들기 · 같은 입력이면 같은 결과의 기준선
// 실행: npx tsx scripts/case-consistency.ts <폴더>[,<요구사항 표>[,<번호표.json>]] <폴더>[,<요구사항 표>[,<번호표.json>]]...
// 번호표는 서비스가 다른 실행(MKT ↔ MKU)을 견줄 때만 — eval-prd.ts --번호표 가 쓴다. 견주는 실행 모두에 준다
// 경로는 절대 경로로 준다 — 쉼표 뒤 `~` 는 셸이 펼치지 않는다
// 2026-10-05 기준선 88.5% 는 refs/measure/mkt-3rd-14581 ↔ refs/measure/mkt-4th-14582 의 tests/mkt · docs/cases/MKT.md 를 이 명령으로 견준 값이다(옛 원본 번호 출처)

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { 견주기, 견줌줄, 번호표읽기, 실행요약 } from './authoring-consistency.js';

const 사용법 = '견줄 케이스 폴더를 둘 이상 주세요 — 예: npx tsx scripts/case-consistency.ts /abs/run1/tests/mkt,/abs/run1/MKT.md /abs/run2/tests/mkt';
function 멈추기(글: string): never {
  console.error(글);
  process.exit(2);
}

const 인자들 = process.argv.slice(2);
if (인자들.length < 2) 멈추기(사용법);
// 한쪽만 정답지 번호로 바꾸면 번호가 하나도 안 겹쳐 0% 처럼 보인다
const 번호표수 = 인자들.filter((인자) => 인자.split(',').length === 3).length;
if (번호표수 !== 0 && 번호표수 !== 인자들.length) 멈추기(`번호표는 견주는 실행 모두에 주거나 모두 빼야 합니다 — ${String(인자들.length)}개 중 ${String(번호표수)}개에만 있습니다`);
const 실행들 = 인자들.map((인자) => {
  const 조각 = 인자.split(',');
  if (조각.length > 3) 멈추기(`폴더 · 표 · 번호표까지만 쉼표로 잇습니다 — ${인자}\n${사용법}`);
  const [폴더 = '', 표, 번호표] = 조각;
  if (!existsSync(폴더) || !statSync(폴더).isDirectory()) 멈추기(`케이스 폴더가 아닙니다 — ${폴더}`);
  for (const 경로 of [표, 번호표]) if (경로 !== undefined && !existsSync(경로)) 멈추기(`없는 경로입니다 — ${경로}`);
  const 파일들 = readdirSync(폴더, { recursive: true, encoding: 'utf8' })
    .filter((경로) => 경로.endsWith('.ts'))
    .map((경로) => ({ 경로, 글: readFileSync(join(폴더, 경로), 'utf8') }));
  try {
    const 바꾸기 = 번호표 === undefined ? undefined : 번호표읽기(readFileSync(번호표, 'utf8'));
    return { 이름: 폴더, 실행: 실행요약(파일들, 표 === undefined ? undefined : readFileSync(표, 'utf8'), 바꾸기) };
  } catch (e) {
    return 멈추기(`${폴더} — ${e instanceof Error ? e.message : String(e)}`);
  }
});
for (const [i, a] of 실행들.entries()) {
  for (const b of 실행들.slice(i + 1)) console.log(`${a.이름}\n  ↔ ${b.이름}\n  ${견줌줄(견주기(a.실행, b.실행))}`);
}
