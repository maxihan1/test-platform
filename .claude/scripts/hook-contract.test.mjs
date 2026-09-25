// pre-push 훅의 계약. 훅은 **실패가 아니라 침묵으로** 건너뛰므로 기계가 봐야 한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HOOK = fileURLToPath(new URL('../hooks/pre-push', import.meta.url));
const ZERO = '0000000000000000000000000000000000000000';
const SHA = 'a'.repeat(40);

// 훅 안에서 이 검사가 돌면 git 이 물려준 GIT_DIR 등이 임시 저장소 대신 진짜 저장소를 가리킨다.
// 2026-09-25 에 같은 모양의 검사가 실제 브랜치에 커밋하고 origin/main 을 옮겼다 (LEARNINGS)
const 깨끗한환경 = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));

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

// ─────────────────────────────────────────────────────────────────────────────
// 가벼운 길 (2026-09-23 게이트 1 — CLAUDE.md §2.3 의 예외로 승인됨)
//
// 바뀐 파일이 테스트만(cases-only.mjs 판정)이면 전체 단위 테스트와 검사 기록 요구를 건너뛴다.
// **글자가 아니라 실제 동작을 본다** — 임시 git 저장소에 커밋을 만들고 훅을 그 안에서 돌린다.
// npm 은 PATH 앞에 끼운 가짜로 바꿔 불린 인자만 적는다. 진짜 npm test 를 돌리면 이 검사가 수 분 걸린다.
// ─────────────────────────────────────────────────────────────────────────────

/** base(origin/main) 하나와 그 위에 파일을 더한 커밋 하나가 있는 임시 저장소. 올릴 sha 를 돌려준다 */
function 임시저장소(더할파일들, 옮길것들 = []) {
  const 뿌리 = mkdtempSync(join(tmpdir(), 'pre-push-'));
  const git = (...a) => execFileSync('git', ['-C', 뿌리, ...a], { encoding: 'utf8', env: 깨끗한환경 }).trim();
  const 쓴다 = (경로, 내용) => {
    mkdirSync(join(뿌리, 경로, '..'), { recursive: true });
    writeFileSync(join(뿌리, 경로), 내용);
  };
  git('init', '-q');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 't');
  쓴다('package.json', '{}');
  쓴다('tests/todo/TODO-001.spec.ts', 'x');
  for (const [원래] of 옮길것들) 쓴다(원래, `옮겨질 코드 ${원래}\n`.repeat(20));
  git('add', '.');
  git('commit', '-qm', 'base');
  git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  for (const f of 더할파일들) 쓴다(f, 'y');
  for (const [원래, 새] of 옮길것들) git('mv', 원래, 새);
  git('add', '.');
  git('commit', '-qm', 'change', '--allow-empty');
  const 가짜 = join(뿌리, '.fakebin');
  mkdirSync(가짜);
  const 기록 = join(뿌리, '.npm-calls');
  // NPM_FAIL 에 준 낱말이 인자에 있으면 실패한다 — 「불렸다」가 아니라 「실패하면 막는다」를 보려고 (spec-review G9)
  writeFileSync(
    join(가짜, 'npm'),
    `#!/bin/sh\necho "$*" >> "${기록}"\nif [ -n "$NPM_FAIL" ]; then case "$*" in *"$NPM_FAIL"*) exit 1 ;; esac; fi\n`,
  );
  chmodSync(join(가짜, 'npm'), 0o755);
  return { 뿌리, sha: git('rev-parse', 'HEAD'), 가짜, 기록 };
}

function 저장소에서돌린다({ 뿌리, sha, 가짜 }, 더할환경 = {}) {
  const env = { ...깨끗한환경, PATH: `${가짜}:${process.env.PATH}`, ...더할환경 };
  delete env.ALLOW_PROTECTED;
  try {
    const out = execFileSync(HOOK, ['origin', 'https://example.com/r.git'], {
      cwd: 뿌리, env, input: `refs/heads/b ${sha} refs/heads/b ${ZERO}\n`, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

const 불린것 = (기록) => {
  try {
    return readFileSync(기록, 'utf8');
  } catch {
    return '';
  }
};

test('테스트만 바뀐 커밋은 가벼운 길 — 타입·check:tests 만 돌고 검사 기록 없이 통과한다', () => {
  const 저장소 = 임시저장소(['tests/todo/TODO-002.spec.ts', 'docs/cases/TODO.md']);
  try {
    const r = 저장소에서돌린다(저장소);
    assert.equal(r.code, 0, `가벼운 길인데 막혔다: ${r.out}`);
    assert.match(r.out, /가벼운 길/, '가벼운 길로 판정했다는 표시가 없다');
    const 호출 = 불린것(저장소.기록);
    assert.match(호출, /typecheck/, '가벼운 길에서 타입 검사를 안 돌렸다');
    assert.match(호출, /check:tests/, '가벼운 길에서 check:tests 를 안 돌렸다');
    // 가벼운 길의 유일한 규칙 검사다 — 스크립트가 사라지면 조용히 초록이 아니라 그 자리에서 죽어야 한다
    assert.doesNotMatch(호출, /check:tests.*--if-present/, '가벼운 길의 check:tests 에 --if-present 가 붙어 있다');
    assert.doesNotMatch(호출, /^test\b/m, '가벼운 길인데 전체 단위 테스트를 돌렸다');
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

// 무거운 길(full 차선)은 바뀐 것과 이어진 검사(test:changed)와 늘 도는 검사(test:always)를 돈다
const 바뀐것만돌았다 = (호출) =>
  /^run test:changed\b.*origin\/main/m.test(호출) && /^run test:always\b/m.test(호출);

test('코드가 섞인 커밋은 무거운 길 — 바뀐 것과 이어진 테스트를 돌리고 검사 기록을 요구한다', () => {
  const 저장소 = 임시저장소(['tests/todo/TODO-002.spec.ts', 'apps/x.ts']);
  try {
    const r = 저장소에서돌린다(저장소);
    assert.equal(r.code, 1, `검사 기록 없이 통과했다: ${r.out}`);
    assert.match(r.out, /docs\/reviews/, '검사 기록을 요구하지 않았다');
    assert.ok(바뀐것만돌았다(불린것(저장소.기록)), `무거운 길인데 test:changed · test:always 를 안 돌렸다: ${불린것(저장소.기록)}`);
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('코드 파일을 spec 으로 옮긴 커밋은 무거운 길 — 이름 바꾸기로 지운 쪽 경로가 숨지 않는다', () => {
  // git diff 는 기본으로 rename 을 감지해 새 경로만 낸다. 그러면 apps/x.ts 가 사라진 것이 판정에 안 보인다
  const 저장소 = 임시저장소([], [['apps/x.ts', 'tests/todo/x.spec.ts']]);
  try {
    const r = 저장소에서돌린다(저장소);
    assert.doesNotMatch(r.out, /가벼운 길/, `코드를 spec 으로 옮겼는데 가벼운 길로 갔다: ${r.out}`);
    assert.ok(바뀐것만돌았다(불린것(저장소.기록)), '무거운 길인데 test:changed · test:always 를 안 돌렸다');
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('migration 이 바뀐 커밋은 전체 단위 테스트 — 작업방 경로(.claude/)에서는 vitest 트리거가 안 걸린다', () => {
  const 저장소 = 임시저장소(['db/migrations/20990101000000_x.sql']);
  try {
    저장소에서돌린다(저장소);
    assert.match(불린것(저장소.기록), /^test\b/m, 'migration 을 바꿨는데 전체 단위 테스트를 안 돌렸다');
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('문서만 바뀐 커밋은 docs 차선 — check:spec 만 돌고 검사 기록 없이 통과한다', () => {
  const 저장소 = 임시저장소(['docs/SETUP.md']);
  try {
    const r = 저장소에서돌린다(저장소);
    assert.equal(r.code, 0, `문서만 바꿨는데 막혔다: ${r.out}`);
    const 호출 = 불린것(저장소.기록);
    assert.match(호출, /check:spec/, 'docs 차선에서 check:spec 을 안 돌렸다');
    assert.match(호출, /check:docs-contract/, 'docs 차선에서 문서 계약 검사를 안 돌렸다');
    assert.doesNotMatch(호출, /^(test|run test|run typecheck)/m, `docs 차선인데 테스트·타입 검사를 돌렸다: ${호출}`);
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('docs 차선에서 check:spec · 문서 계약이 실패하면 push 를 막는다', () => {
  for (const 낱말 of ['check:spec', 'check:docs-contract']) {
    const 저장소 = 임시저장소(['docs/SETUP.md']);
    try {
      const r = 저장소에서돌린다(저장소, { NPM_FAIL: 낱말 });
      assert.equal(r.code, 1, `${낱말} 이 실패했는데 통과했다: ${r.out}`);
    } finally {
      rmSync(저장소.뿌리, { recursive: true, force: true });
    }
  }
});

test('명세가 바뀐 커밋은 spec 차선 — check:spec 을 돌리고 검사 기록을 요구한다', () => {
  const 저장소 = 임시저장소(['docs/spec/도메인/x.md']);
  try {
    const r = 저장소에서돌린다(저장소);
    assert.equal(r.code, 1, `명세를 바꿨는데 검사 기록 없이 통과했다: ${r.out}`);
    assert.match(r.out, /docs\/reviews/, '검사 기록을 요구하지 않았다');
    const 호출 = 불린것(저장소.기록);
    assert.match(호출, /check:spec/, 'spec 차선에서 check:spec 을 안 돌렸다');
    assert.doesNotMatch(호출, /^(test|run test)/m, `spec 차선인데 테스트를 돌렸다: ${호출}`);
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('바뀐 파일이 0 인 커밋(빈 시작 커밋)은 검사 없이 통과한다 — LEARNINGS 09-23 · 09-24', () => {
  const 저장소 = 임시저장소([]);
  try {
    const r = 저장소에서돌린다(저장소);
    assert.equal(r.code, 0, `빈 커밋이 막혔다: ${r.out}`);
    assert.equal(불린것(저장소.기록), '', '빈 커밋인데 npm 을 불렀다');
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('판정 규칙을 훅에 복사하지 않고 lane.mjs 에 맡긴다', () => {
  assert.match(readFileSync(HOOK, 'utf8'), /lane\.mjs/);
});
