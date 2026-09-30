// 원장 명령 — 사람 세션과 자식이 부른다. 판단은 authoring-ledger · authoring-ledger-check 의 순수 함수에 있다
//   npm run ledger -- <글자본…>                                   원장 JSON 을 찍는다
//   npm run check:ledger -- <ledger.json> <표.md> [--tests <폴더>] [--agent]   빠짐 · 형식 오류가 있으면 종료 코드 1

import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import type { 읽을자료 } from './authoring-assets.js';
import { type 원장, 원장만들기 } from './authoring-ledger.js';
import { tcId들, 셈글, 원장대조 } from './authoring-ledger-check.js';

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
  const 읽은 = JSON.parse(readFileSync(원장파일, 'utf8')) as { 원장?: 원장 };
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
  const 결과 = 원장대조(읽은.원장.항목, readFileSync(표파일, 'utf8'), { 있는케이스, 에이전트: 인자.includes('--agent') });
  console.log(셈글(결과.셈, 읽은.원장.가족));
  for (const m of 결과.형식오류) console.log(`형식 오류: ${m}`);
  for (const m of 결과.경고) console.log(`경고: ${m}`);
  if (결과.빠짐.length > 0) console.log(`빠짐: ${결과.빠짐.join(' · ')}`);
  process.exit(결과.빠짐.length === 0 && 결과.형식오류.length === 0 ? 0 : 1);
} else {
  console.error('쓰는 법: tsx scripts/ledger.ts 뽑기|대조 …');
  process.exit(2);
}
