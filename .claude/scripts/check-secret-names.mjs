#!/usr/bin/env node
// 비밀값 이름 목록이 세 곳에서 갈라지지 않는지 본다. 다르면 종료 코드 1.
//
// 왜 세 벌인가 — 정본은 catalog/rules.ts 의 SECRET_NAMES 이고 K9 검사기가 그것으로
// .meta({ secret: true }) 를 강제한다. 그런데 그 파일은 typescript 를 통째로 import 해서
// 화면 번들(web/mask.ts)에 넣을 수 없고, reporting 은 컨텍스트가 달라 import 하지 않는다.
// 복사가 불가피하므로 갈라지는 것을 기계가 본다.
//
// 왜 필요한가 — 2026-09-19 에 증적은 가렸는데 화면은 안 가리는 구멍이 실제로 났다.
// 세 곳 중 하나만 고치면 「어디서는 가리고 어디서는 안 가린다」가 다시 난다 (LEARNINGS).
//
// 왜 파싱하지 않는가 — 한 줄짜리 배열 리터럴이고 세 곳 다 같은 모양이다.
// TypeScript 파서를 끌어오면 이 검사기가 무거워질 뿐 잡는 것은 같다.
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);

/** 정본이 맨 앞이다. 어긋났을 때 무엇에 맞춰야 하는지가 순서로 보인다 */
export const 볼파일들 = [
  'apps/admin/src/catalog/rules.ts',
  'apps/admin/src/reporting/collect.ts',
  'apps/admin/src/web/mask.ts',
];

/** 파일 본문에서 SECRET_NAMES 배열 리터럴을 뽑는다. 못 찾으면 null */
export function 목록뽑기(source) {
  const found = /const SECRET_NAMES\s*=\s*\[([^\]]*)\]/.exec(source);
  if (found === null) return null;
  return found[1]
    .split(',')
    .map((part) => part.trim().replace(/^['"]|['"]$/g, ''))
    .filter((word) => word !== '');
}

/** 어긋난 파일만 돌려준다. 정본과 같으면 빈 배열 */
export function 어긋난것(목록들) {
  const [정본, ...나머지] = 목록들;
  if (정본.words === null) return [{ file: 정본.file, why: 'SECRET_NAMES 를 찾지 못했다' }];

  const 기준 = 정본.words.join(',');
  return 나머지.flatMap(({ file, words }) => {
    if (words === null) return [{ file, why: 'SECRET_NAMES 를 찾지 못했다' }];
    if (words.join(',') === 기준) return [];
    return [{ file, why: `정본과 다르다: ${words.join(' · ')}` }];
  });
}

function main() {
  const 목록들 = 볼파일들.map((file) => ({
    file,
    words: 목록뽑기(readFileSync(new URL(file, ROOT), 'utf8')),
  }));

  const 문제 = 어긋난것(목록들);
  if (문제.length === 0) {
    console.log(`[check:secret-names] 세 곳이 같다 — ${목록들[0].words.join(' · ')}`);
    return;
  }

  console.error(`[check:secret-names] 정본은 ${볼파일들[0]} 다.`);
  for (const { file, why } of 문제) console.error(`  ${file} — ${why}`);
  console.error('\n한 곳만 고치면 어디서는 가리고 어디서는 안 가린다 (SPEC §4.1).');
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
