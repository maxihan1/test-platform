// 가드의 금지 명령 판정. 이 검사는 **양방향**이다 —
// 막아야 할 것을 막는가, 그리고 막지 말아야 할 것을 통과시키는가.
// 안전 장치를 느슨하게 만드는 변경이라 한쪽만 보면 위험하다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBanned } from './guard.mjs';

test('진짜 위험한 명령을 막는다', () => {
  for (const cmd of [
    'git branch -D feature',
    'git push --force origin main',
    'git push -f origin main',
    'npm run migrate:down',
    'rm -rf /etc',
    'cd /repo && git branch -D old-branch',
  ]) {
    assert.ok(isBanned(cmd), `막았어야 한다: ${cmd}`);
  }
});

test('조회 명령은 통과시킨다 (2026-09-18 오탐)', () => {
  // grep 패턴 속 문자열이 실행 명령으로 오인됐다
  for (const cmd of [
    'grep -n "branch -D" .claude/scripts/guard.mjs',
    "grep -rn 'push --force' docs/",
    'echo "git branch -D 는 금지다"',
    'cat CLAUDE.md | grep "branch -D"',
    'git branch -a',
    'git branch -d merged-branch',
    'git push origin --delete old-remote',
    'git log --oneline',
  ]) {
    assert.ok(!isBanned(cmd), `통과했어야 한다: ${cmd}`);
  }
});

test('따옴표를 걷어내도 실행 구간은 여전히 잡는다', () => {
  // 따옴표 제거가 과해서 진짜 명령까지 놓치면 안 된다
  assert.ok(isBanned('git branch -D "my branch"'), '따옴표 인자가 붙은 강제 삭제를 놓쳤다');
  assert.ok(isBanned("git push --force 'origin' main"), '따옴표 인자가 붙은 강제 push 를 놓쳤다');
});

test('세미콜론·파이프로 이어 붙여도 잡는다', () => {
  assert.ok(isBanned('echo hi; git branch -D foo'), '뒤 구간의 강제 삭제를 놓쳤다');
  assert.ok(isBanned('ls && git push --force'), '&& 뒤의 강제 push 를 놓쳤다');
});

test('막는 이유를 함께 돌려준다', () => {
  assert.equal(isBanned('git branch -D x'), '브랜치 강제 삭제');
  assert.equal(isBanned('git branch -d x'), null);
});
