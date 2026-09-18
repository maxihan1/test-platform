// pre-push 훅의 계약. 훅은 **실패가 아니라 침묵으로** 건너뛰므로 기계가 봐야 한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('../hooks/pre-push', import.meta.url));
const ZERO = '0000000000000000000000000000000000000000';
const SHA = 'a'.repeat(40);

/** 훅을 stdin 입력과 함께 돌리고 종료 코드와 출력을 돌려준다 */
function run(stdin) {
  try {
    const out = execFileSync(HOOK, ['origin', 'https://example.com/r.git'], {
      input: stdin, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

test('훅 파일이 실재하고 실행 비트가 있다', () => {
  // git 은 실행 비트 없는 훅을 조용히 건너뛴다
  const m = statSync(HOOK).mode;
  assert.ok(m & 0o111, 'pre-push 에 실행 비트가 없다');
});

test('삭제 push 는 검사 없이 통과한다', () => {
  // 삭제는 로컬 sha 가 전부 0 이다. 코드를 안 올리므로 검사할 것이 없다
  const r = run(`(delete) ${ZERO} refs/heads/old ${SHA}\n`);
  assert.equal(r.code, 0, `삭제 push 가 막혔다: ${r.out}`);
  assert.doesNotMatch(r.out, /검사 시작/, '삭제인데 검사를 돌렸다');
  assert.match(r.out, /삭제/, '삭제로 판정했다는 표시가 없다');
});

test('삭제가 여러 건이어도 통과한다', () => {
  const r = run(`(delete) ${ZERO} refs/heads/a ${SHA}\n(delete) ${ZERO} refs/heads/b ${SHA}\n`);
  assert.equal(r.code, 0, `여러 건 삭제가 막혔다: ${r.out}`);
});

test('삭제와 코드 push 가 섞이면 검사로 간다', () => {
  // 한 줄이라도 진짜 push 면 검사해야 한다
  const r = run(`(delete) ${ZERO} refs/heads/a ${SHA}\nrefs/heads/b ${SHA} refs/heads/b ${ZERO}\n`);
  assert.match(r.out, /검사 시작/, '섞였는데 건너뛰었다');
});

test('입력이 비면 검사로 간다 (보수적)', () => {
  // 빈 입력을 삭제로 보면 검사가 새어 나간다
  const r = run('');
  assert.match(r.out, /검사 시작/, '빈 입력을 삭제로 봤다');
});

test('stdin 을 두 번 읽지 않는다고 적어 뒀다', () => {
  // 읽는 순간 소모된다. 다음 사람이 또 읽으려다 깨뜨리지 않게
  const src = readFileSync(HOOK, 'utf8');
  assert.match(src, /stdin/, 'stdin 을 다루는 주석이 없다');
});

test('기존 검사가 그대로 있다', () => {
  const src = readFileSync(HOOK, 'utf8');
  for (const 검사 of ['npm test', 'check:tests', 'docs/reviews']) {
    assert.ok(src.includes(검사), `기존 검사가 사라졌다: ${검사}`);
  }
});
