// 원장 명령 — 사람 세션과 자식이 부른다. 판단은 authoring-ledger · authoring-ledger-check 의 순수 함수에 있다
//   npm run ledger -- <글자본…>                                   원장 JSON 을 찍는다
//   npm run check:ledger -- <ledger.json> <표.md> [--tests <폴더>] [--agent]   빠짐 · 형식 오류 · 칸 번호 어긋남(--agent 면 설계 칸 빠짐 · 설계 거절 형식 오류도)이 있으면 종료 코드 1
//   npm run ledger:number -- <ledger.json> <표.md>                 칸마다 tcId 를 매겨 표를 고쳐 쓴다. 칸 재료가 없으면 종료 코드 2

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import type { 읽을자료 } from './authoring-assets.js';
import { type 원장, 원장만들기 } from './authoring-ledger.js';
import { 설계대조, 설계줄들 } from './authoring-design-check.js';
import { tcId들, 설계거절행들, 셈글, 요구줄들, 원장대조, 표번호채우기 } from './authoring-ledger-check.js';
import { type 칸재료, 칸번호 } from './authoring-slots.js';

const [명령, ...인자] = process.argv.slice(2);

function 값(이름: string): string | undefined {
  const i = 인자.indexOf(이름);
  return i < 0 ? undefined : 인자[i + 1];
}

if (명령 === '뽑기') {
  if (인자.length === 0) {
    console.error('쓰는 법: npm run ledger -- <글자본 경로…>');
    process.exit(2);
  }
  const 계획: 읽을자료[] = 인자.map((경로, i) => ({ kind: 'FILE', id: i + 1, name: basename(경로), 받을자리: 경로, 변환: null, 읽을자리: 경로 }));
  const r = 원장만들기(계획, (경로) => readFileSync(경로, 'utf8'));
  console.log(JSON.stringify(r, null, 2));
  process.exit('원장' in r ? 0 : 1);
} else if (명령 === '대조') {
  const [원장파일, 표파일] = 인자.filter((a, i) => !a.startsWith('--') && !인자[i - 1]?.startsWith('--'));
  if (원장파일 === undefined || 표파일 === undefined) {
    console.error('쓰는 법: npm run check:ledger -- <ledger.json> <표.md> [--tests <폴더>] [--agent]');
    process.exit(2);
  }
  // 사람이뺌 — 에이전트가 기준(main) 표에서 뽑아 사본에 실은 것. --agent 여도 이 번호의 「사람이 뺌」 줄은 인정한다 (2026-09-30 게이트 1)
  // 다음요청 · 칸재료 — 같은 자리에서 에이전트가 실었다 (2026-10-04 게이트 1 · 작성 §3.6 「칸과 번호」)
  const 읽은 = JSON.parse(readFileSync(원장파일, 'utf8')) as { 원장?: 원장; 사람이뺌?: string[]; 다음요청?: string[]; 칸재료?: 칸재료 | null };
  if (읽은.원장 === undefined) {
    console.log('원장 없음 — 대조를 건너뛴다');
    process.exit(0);
  }
  const 폴더 = 값('--tests');
  const 있는케이스 =
    폴더 === undefined
      ? undefined
      : tcId들(
          readdirSync(폴더, { recursive: true, encoding: 'utf8' })
            .filter((f) => f.endsWith('.spec.ts'))
            .map((f) => readFileSync(join(폴더, f), 'utf8')),
        );
  const 표글 = readFileSync(표파일, 'utf8');
  const 에이전트 = 인자.includes('--agent');
  const 결과 = 원장대조(읽은.원장.항목, 표글, {
    있는케이스,
    에이전트,
    사람이뺌: new Set(읽은.사람이뺌 ?? []),
    다음요청: new Set(읽은.다음요청 ?? []),
    칸재료: 읽은.칸재료 ?? null,
  });
  console.log(셈글(결과.셈, 읽은.원장.가족));
  for (const m of 결과.칸알림) console.log(m);
  for (const m of 결과.형식오류) console.log(`형식 오류: ${m}`);
  for (const m of 결과.칸어긋남) console.log(`칸 번호 어긋남: ${m}`);
  for (const m of 결과.경고) console.log(`경고: ${m}`);
  if (결과.빠짐.length > 0) console.log(`빠짐: ${결과.빠짐.join(' · ')}`);
  // 설계 칸은 작성 에이전트만 본다 — 사람 세션은 R18 로 판단한다 (작성 §3.6 「설계 기법」)
  const 설계 =
    에이전트 && 읽은.칸재료 != null
      ? 설계대조(읽은.원장.항목, 요구줄들(표글), 설계거절행들(표글), new Set(결과.제외번호.keys()), new Set(읽은.칸재료.기준줄))
      : null;
  if (에이전트) console.log(설계줄들(읽은.원장.항목, null).join('\n'));
  if (설계 !== null) {
    if (설계.빠짐.length > 0) console.log(`설계 칸 빠짐: ${설계.빠짐.join(' · ')}`);
    for (const m of 설계.형식오류) console.log(`설계 거절 형식 오류: ${m}`);
    if (설계.거절.length > 0) console.log(`설계 거절: ${설계.거절.join(' · ')}`);
    if (설계.밖.length > 0) console.log(`설계 밖 칸: ${설계.밖.join(' · ')}`);
  }
  const 설계막힘 = 설계 !== null && (설계.빠짐.length > 0 || 설계.형식오류.length > 0);
  process.exit(결과.빠짐.length === 0 && 결과.형식오류.length === 0 && 결과.칸어긋남.length === 0 && !설계막힘 ? 0 : 1);
} else if (명령 === '번호') {
  const [원장파일, 표파일] = 인자;
  if (원장파일 === undefined || 표파일 === undefined) {
    console.error('쓰는 법: npm run ledger:number -- <ledger.json> <표.md>');
    process.exit(2);
  }
  const 읽은 = JSON.parse(readFileSync(원장파일, 'utf8')) as { 원장?: 원장; 칸재료?: 칸재료 | null };
  // 재료가 없으면 쓰인 번호를 모른다 — 매기면 트리에 있는 다른 요구의 케이스 파일을 덮어쓴다 (작성 §3.6 「칸과 번호」 「사본」)
  if (읽은.원장 === undefined || 읽은.칸재료 == null) {
    console.log('칸 재료가 없다(원장 없음 · 기준 표를 못 읽음 · 사람 세션 사본) — 번호를 안 매긴다. 지금처럼 종류별로 가장 큰 번호 다음부터 매긴다');
    process.exit(2);
  }
  const 표글 = readFileSync(표파일, 'utf8');
  const 앞줄 = 요구줄들(표글);
  const 칸 = 칸번호(읽은.원장.항목.map((h) => h.번호), 앞줄, 읽은.칸재료);
  const 새글 = 표번호채우기(표글, 칸.기대);
  if (새글 !== 표글) writeFileSync(표파일, 새글);
  const 바뀜 = 앞줄.filter((줄) => 칸.기대.has(줄.차례) && 칸.기대.get(줄.차례) !== 줄.tcId).length;
  console.log(`번호를 매겼다 — 요구 줄 ${String(앞줄.length)} · 매긴 줄 ${String(칸.기대.size)} · 바꾼 줄 ${String(바뀜)} · 케이스 ${String(new Set(칸.기대.values()).size)}`);
  for (const m of 칸.알림) console.log(m);
  for (const m of 칸.어긋남) console.log(`칸 번호 어긋남: ${m}`);
  process.exit(칸.어긋남.length === 0 ? 0 : 1);
} else {
  console.error('쓰는 법: tsx scripts/ledger.ts 뽑기|대조|번호 …');
  process.exit(2);
}
