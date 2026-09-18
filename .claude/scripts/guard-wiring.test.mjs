// settings.json 이 부르는 guard 모드와 guard.mjs 가 구현한 모드를 대조한다.
// (hook-contract.test.mjs 는 pre-push 훅을 본다. 이 파일은 settings.json 배선만 본다)
//
// 한쪽만 고치면 조용히 어긋난다 — 배선만 남으면 훅이 아무 일도 안 하고,
// 구현만 남으면 죽은 코드가 된다. 2026-09-18 ownership 제거에서 이 대조가 없었다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const 배선된모드 = () => {
  // 정규식으로 읽지 않는다 — escaping 이 바뀌면 조용히 0개를 뽑고 차집합이 0 이라 초록이 된다
  const s = JSON.parse(readFileSync(new URL('../settings.json', import.meta.url), 'utf8'));
  const 모드 = new Set();
  for (const 묶음 of Object.values(s.hooks ?? {})) {
    for (const 항목 of 묶음 ?? []) {
      for (const h of 항목.hooks ?? []) {
        const m = String(h.command ?? '').match(/guard\.mjs["']?\s+([a-z]+)/);
        if (m) 모드.add(m[1]);
      }
    }
  }
  return 모드;
};

const 구현된모드 = () => {
  const src = readFileSync(new URL('./guard.mjs', import.meta.url), 'utf8');
  return new Set([...src.matchAll(/mode === '([a-z]+)'/g)].map((m) => m[1]));
};

test('배선과 구현에서 모드를 실제로 뽑아낸다 (파싱이 빗나가면 여기서 잡힌다)', () => {
  assert.ok(배선된모드().size > 0, 'settings.json 에서 guard 모드를 하나도 못 뽑았다');
  assert.ok(구현된모드().size > 0, 'guard.mjs 에서 모드를 하나도 못 뽑았다');
});

test('settings.json 이 부르는 모드를 guard.mjs 가 전부 구현한다', () => {
  const 없는것 = [...배선된모드()].filter((m) => !구현된모드().has(m));
  assert.deepEqual(없는것, [], `훅은 부르는데 guard.mjs 에 구현이 없다: ${없는것}`);
});

test('guard.mjs 가 구현한 모드를 settings.json 이 전부 부른다', () => {
  const 안부르는것 = [...구현된모드()].filter((m) => !배선된모드().has(m));
  assert.deepEqual(안부르는것, [], `구현은 있는데 아무도 안 부른다: ${안부르는것}`);
});
