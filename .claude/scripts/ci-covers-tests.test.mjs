// 검사(CI)가 생성된 테스트를 정말 돌리는지, 그리고 그 단계가 병합을 막는 자리에 있는지 본다.
//
// **이 검사가 안 보는 것** — 초록불은 안 본 것도 초록이라 여기 적어 둔다.
//   · 케이스 안의 디바이스 선언을 안 본다. ci.yml 이 데스크톱만 돌리므로 앞으로 모바일
//     케이스가 생기면 검사가 조용히 건너뛴다 (모바일로 돌리면 15 skipped · EXIT=0 이다).
//     그런 케이스가 생기면 사람이 ci.yml 을 고쳐야 한다
//   · 테스트가 실제로 통과하는지는 안 본다. 그건 ci.yml 의 그 단계가 할 일이다
//   · 면제한 폴더의 내용을 안 본다. 면제 사유가 아직 맞는지는 사람이 본다

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const 루트 = new URL('../../', import.meta.url);
const CI = new URL('.github/workflows/ci.yml', 루트);
const 테스트폴더 = new URL('tests/', 루트);

// 병합을 막는 필수 체크 이름이 이 잡의 이름과 묶여 있다 (docs/HOOKS.md 「CI 와 병합 차단」).
// 그래서 「단계가 있는가」만으로는 모자라고 「이 잡 안에 있는가」까지 봐야 한다.
const 막는잡 = 'check';

// 면제는 여기 한 곳에만 둔다. 사유 없이 이름만 더하지 않는다.
const 면제 = new Map([
  [
    'demo',
    '일부러 실패하는 플랫폼 기능 전시물이다 — 검증 실패와 시간 초과를 보여주려고 둔 케이스가 있어 검사에서 돌리면 매번 빨갛다 (docs/spec/공통/7-데모와-완료.md)',
  ],
]);

/** 한 잡의 블록만 떼어 낸다. 다른 잡이 생겨도 섞이지 않게 들여쓰기로 끊는다. */
export function 잡블록(원문, 이름) {
  const 줄 = 원문.split('\n');
  const 시작 = 줄.findIndex((l) => l === `  ${이름}:`);
  if (시작 === -1) return null;
  let 끝 = 줄.length;
  for (let i = 시작 + 1; i < 줄.length; i += 1) {
    if (/^ {2}\S/.test(줄[i])) {
      끝 = i;
      break;
    }
  }
  return 줄.slice(시작, 끝).join('\n');
}

/**
 * `playwright test` 를 치는 줄에서 tests/ 아래 폴더 이름들을 뽑는다.
 * 경로를 **여러 개** 적을 수 있으므로 줄 안의 모든 tests/... 를 본다.
 */
export function 도는폴더(본문) {
  const 결과 = new Set();
  for (const 줄 of 본문.split('\n')) {
    if (!/playwright\s+test/.test(줄)) continue;
    for (const m of 줄.matchAll(/tests\/([^/\s'"]+)/g)) 결과.add(m[1]);
  }
  return 결과;
}

const 원문 = readFileSync(CI, 'utf8');
const 블록 = 잡블록(원문, 막는잡);

test(`ci.yml 에 병합을 막는 잡 '${막는잡}' 이 있다`, () => {
  assert.ok(
    블록 !== null,
    `ci.yml 에 '${막는잡}' 잡이 없다. 그 이름은 main 브랜치 보호의 필수 체크 이름과 묶여 있어 바꾸면 모든 PR 이 잠긴다 (docs/HOOKS.md)`,
  );
});

test('생성된 테스트를 실행하는 단계가 있다 — 못 찾으면 조용히 통과하지 않는다', () => {
  assert.match(
    블록 ?? '',
    /playwright\s+test\s+tests\//,
    'ci.yml 이 tests/ 를 실행하는 단계를 못 찾았다. 그 단계가 없으면 깨진 케이스가 그대로 main 에 들어간다',
  );
});

test(`그 단계가 '${막는잡}' 잡 밖에 있지 않다 — 밖이면 빨개져도 병합된다`, () => {
  const 전체 = (원문.match(/playwright\s+test\s+tests\//g) ?? []).length;
  const 잡안 = ((블록 ?? '').match(/playwright\s+test\s+tests\//g) ?? []).length;
  assert.equal(
    전체,
    잡안,
    `테스트 실행 단계가 '${막는잡}' 잡 밖에도 있다. 보호가 요구하는 체크 이름은 '${막는잡}' 하나뿐이라 밖에 있는 것은 빨개져도 병합을 못 막는다`,
  );
});

test('이 검사 자신을 돌리는 단계가 있다 — 없으면 이 검사가 아무 데서도 안 돈다', () => {
  assert.match(
    블록 ?? '',
    /npm run check:workflow/,
    'ci.yml 이 check:workflow 를 안 돈다. 그러면 지금 이 파일이 사람이 손으로 칠 때만 돌아, 안 도는 폴더가 생겨도 아무도 못 막는다',
  );
});

test('tests/ 아래 폴더가 전부 돌거나 사유를 달고 면제돼 있다', () => {
  const 있는것 = readdirSync(테스트폴더, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const 도는것 = 도는폴더(블록 ?? '');
  const 빠진것 = 있는것.filter((이름) => !도는것.has(이름) && !면제.has(이름));
  assert.deepEqual(
    빠진것,
    [],
    `tests/ 아래 이 폴더들이 검사에서 안 돈다: ${빠진것.join(', ')}. ci.yml 의 실행 단계에 더하거나, 이 파일의 면제 목록에 사유와 함께 적는다`,
  );
});

test('면제 목록이 낡지 않았다 — 없는 폴더를 면제해 두지 않는다', () => {
  const 있는것 = new Set(
    readdirSync(테스트폴더, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name),
  );
  for (const [이름, 사유] of 면제) {
    assert.ok(있는것.has(이름), `면제 목록의 '${이름}' 폴더가 없다. 지운 폴더면 면제도 지운다`);
    assert.ok(사유.length > 20, `'${이름}' 의 면제 사유가 너무 짧다. 왜 안 돌리는지 다음 사람이 읽고 판단할 수 있어야 한다`);
  }
});

test('잡블록은 다른 잡을 섞어 오지 않는다', () => {
  const 가짜 = ['jobs:', '  check:', '    steps:', '      - run: 하나', '  다른잡:', '    steps:', '      - run: 둘'].join('\n');
  assert.match(잡블록(가짜, 'check'), /하나/);
  assert.doesNotMatch(잡블록(가짜, 'check'), /둘/);
});

test('도는폴더는 tests/ 아래 이름만 뽑는다', () => {
  assert.deepEqual([...도는폴더('npx playwright test tests/todo --project=desktop')], ['todo']);
  assert.deepEqual([...도는폴더('npx playwright test tests/a tests/b')], ['a', 'b']);
  assert.deepEqual([...도는폴더('npx playwright test 어딘가/다른곳')], []);
});
