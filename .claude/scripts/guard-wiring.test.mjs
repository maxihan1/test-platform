// settings.json 이 부르는 guard 훅과 guard.mjs 가 실제로 처리하는 모드를 대조한다.
// (hook-contract.test.mjs 는 pre-push 훅을 본다. 이 파일은 settings.json 배선만 본다)
//
// 한쪽만 고치면 조용히 어긋난다 — 배선만 남으면 훅이 매번 돌면서 아무 일도 안 하고,
// 구현만 남으면 죽은 코드가 된다. 2026-09-18 ownership 제거에서 이 대조가 없었다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GUARD = fileURLToPath(new URL('./guard.mjs', import.meta.url));

// 모드 이름만 보지 않는다. 시점을 옮겨도 이름 집합은 그대로라
// `bash` 가 PreToolUse 에서 PostToolUse 로 가면 강제 push 를 「돌고 난 뒤에」 막게 된다
const 배선 = () => {
  const s = JSON.parse(readFileSync(new URL('../settings.json', import.meta.url), 'utf8'));
  const 목록 = [];
  for (const [시점, 묶음] of Object.entries(s.hooks ?? {})) {
    for (const 항목 of 묶음 ?? []) {
      for (const h of 항목.hooks ?? []) {
        // 끝까지 잡는다. `[a-z]+` 로 자르면 `tests2` 가 `tests` 로 보여 구멍이 된다
        const m = String(h.command ?? '').match(/guard\.mjs(?:["'])?\s+(\S+)\s*$/);
        if (m) 목록.push({ 모드: m[1], 시점, matcher: 항목.matcher ?? '' });
      }
    }
  }
  return 목록;
};

// 소스를 정규식으로 읽지 않는다 — 실제로 돌려 본다.
// 텍스트 매칭은 두 번 샜다. 주석의 `mode === 'x'` 를 구현으로 세거나,
// 문자열 안의 `tests/**` 가 블록 주석을 열어 뒤쪽 모드를 통째로 삼켰다 (둘 다 실측).
const 처리하나 = (모드) => {
  const 입력 = JSON.stringify({ tool_input: { file_path: '/tmp/none.txt', command: 'true' }, cwd: '/tmp' });
  try {
    execFileSync('node', [GUARD, 모드], { input: 입력, encoding: 'utf8', stdio: 'pipe' });
    return true;                                    // 통과시켰다 = 처리했다
  } catch (e) {
    if (e.status === 2) return true;                // 막았다 = 처리했다
    return !String(e.stderr ?? '').includes('모르는 모드다');
  }
};

// 정본. 배선을 바꾸려면 여기도 바꿔야 한다 — 양쪽이 같이 틀려 차집합이 0 이 되는 길을 막는다
const 정본 = [
  { 모드: 'protected', 시점: 'PreToolUse', matcher: 'Edit|Write|MultiEdit' },
  { 모드: 'bash', 시점: 'PreToolUse', matcher: 'Bash' },
  { 모드: 'tests', 시점: 'PostToolUse', matcher: 'Edit|Write|MultiEdit' },
  { 모드: 'review', 시점: 'Stop', matcher: '' },
];

test('settings.json 배선이 정본과 모드·시점·matcher 까지 같다', () => {
  const 키 = (x) => `${x.모드} @ ${x.시점} [${x.matcher}]`;
  assert.deepEqual(배선().map(키).sort(), 정본.map(키).sort());
});

test('배선된 모드를 guard.mjs 가 전부 처리한다 (실제로 돌려서 본다)', () => {
  const 안되는것 = 배선().map((x) => x.모드).filter((m) => !처리하나(m));
  assert.deepEqual(안되는것, [], `훅은 부르는데 guard.mjs 가 모르는 모드다: ${안되는것}`);
});

test('모르는 모드는 조용히 넘어가지 않는다 (위 검사의 비-공허 대조군)', () => {
  assert.equal(처리하나('없는모드xyz'), false, 'guard.mjs 가 모르는 모드를 조용히 통과시킨다');
});
