// 깃발 검사의 판별식. `--` 로 시작하는 것을 전부 깃발로 보면 코멘트 본문의 `---` 구분선이
// 깃발로 잡혀 정상 호출이 죽는다 — 막으려던 조용한 실패의 반대편이다.
// `--pr` 을 일부러 빼서 깃발 검사만 지나가고 gh 는 안 부르게 한다. 진짜 PR 을 건드리면 안 된다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 스크립트 = fileURLToPath(new URL('./pr-update.mjs', import.meta.url));
const 돌리기 = (...args) => {
  const r = spawnSync(process.execPath, [스크립트, ...args], { encoding: 'utf8' });
  return { code: r.status, err: r.stderr };
};

test('값이 `---` 로 시작해도 깃발로 오해하지 않는다', () => {
  const { err } = 돌리기('--comment', '---\n본문');
  assert.doesNotMatch(err, /모르는 깃발/, '구분선을 깃발로 잡았다 — 깃발꼴이 너무 넓다');
  assert.match(err, /--pr/, '깃발 검사를 지나 --pr 검사까지 갔어야 한다');
});

test('진짜 모르는 깃발은 여전히 종료코드 2', () => {
  const { code, err } = 돌리기('--pr', '30', '--comment-file', 'x.md');
  assert.equal(code, 2);
  assert.match(err, /모르는 깃발: --comment-file/);
});
