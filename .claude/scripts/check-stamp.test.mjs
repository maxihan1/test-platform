// check-stamp.mjs 의 통과 표지 판정(재사용 · 깨끗한가)과 명령줄(find · put push)을 본다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as 모듈 from './check-stamp.mjs';

const { 깨끗한가, 재사용 } = 모듈;

const SCRIPT = fileURLToPath(new URL('./check-stamp.mjs', import.meta.url));
// 훅 안에서 돌면 git 이 물려준 GIT_DIR 등이 임시 저장소 대신 진짜 저장소를 가리킨다 (hook-contract.test.mjs 와 같은 이유)
const 깨끗한환경 = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));

test('재사용 — 종류와 차이로 건너뛸 범위를 가른다', () => {
  const 표 = [
    [['push'], 'same', 'all'],
    [['push'], 'docs', 'all'],
    [['push'], 'spec', 'tests'],
    [['local'], 'same', 'tests'],
    [['local'], 'docs', 'tests'],
    [['local'], 'spec', 'tests'],
    [['local', 'push'], 'docs', 'all'],
    [['push'], 'full', 'none'],
    [['push'], 'cases', 'none'],
    [['local'], 'full', 'none'],
    [['local'], 'cases', 'none'],
    [[], 'same', 'none'],
    [[], 'docs', 'none'],
  ];
  for (const [종류들, 차이, 기대] of 표) assert.equal(재사용(종류들, 차이), 기대, `${종류들} + ${차이}`);
});

test('깨끗한가 — 문서 자리만 더러우면 깨끗하다', () => {
  assert.equal(깨끗한가([]), true);
  assert.equal(깨끗한가([' M docs/x.md']), true);
  assert.equal(깨끗한가(['?? README.md']), true);
  assert.equal(깨끗한가([' M docs/spec/a.md']), true);
  assert.equal(깨끗한가(['?? docs/한글.md']), true);
  assert.equal(깨끗한가([' M docs/x.md', ' M apps/x.ts']), false);
  assert.equal(깨끗한가(['?? tests/a.spec.ts']), false);
  assert.equal(깨끗한가(['?? "a b.ts"']), false);
  assert.equal(깨끗한가(['?? "docs/a b.md"']), false);
});

function 임시저장소() {
  const 뿌리 = mkdtempSync(join(tmpdir(), 'check-stamp-'));
  const git = (...a) => execFileSync('git', ['-C', 뿌리, ...a], { encoding: 'utf8', env: 깨끗한환경 }).trim();
  const 쓴다 = (경로, 내용) => {
    mkdirSync(join(뿌리, 경로, '..'), { recursive: true });
    writeFileSync(join(뿌리, 경로), 내용);
  };
  git('init', '-q');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 't');
  쓴다('package.json', '{}');
  git('add', '.');
  git('commit', '-qm', 'base');
  git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  const 커밋 = (경로) => {
    쓴다(경로, `${Math.random()}`);
    git('add', '.');
    git('commit', '-qm', `c ${경로}`);
    return git('rev-parse', 'HEAD');
  };
  const 돌린다 = (...인자) =>
    execFileSync('node', [SCRIPT, ...인자], { cwd: 뿌리, env: 깨끗한환경, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const 표지 = (sha) => join(뿌리, '.git', 'tpx-checks', sha);
  return { 뿌리, git, 쓴다, 커밋, 돌린다, 표지 };
}

test('put push 뒤 find — 문서 커밋은 all · 명세 커밋은 tests · 코드 커밋은 none', () => {
  const 저 = 임시저장소();
  try {
    const c = 저.커밋('apps/admin/src/a.ts');
    저.돌린다('put', 'push', 'HEAD');
    assert.match(readFileSync(저.표지(c), 'utf8'), /^push$/m);
    let out = 저.돌린다('find');
    assert.match(out, new RegExp(`stamp=${c} kinds=push delta=same`));
    assert.match(out, /^reuse=all$/m);

    저.커밋('docs/x.md');
    out = 저.돌린다('find');
    assert.match(out, /delta=docs/);
    assert.match(out, /^reuse=all$/m);

    저.커밋('docs/spec/a.md');
    out = 저.돌린다('find');
    assert.match(out, /delta=spec/);
    assert.match(out, /^reuse=tests$/m);

    저.커밋('apps/admin/src/b.ts');
    out = 저.돌린다('find');
    assert.match(out, /delta=full/);
    assert.match(out, /^reuse=none$/m);
  } finally {
    rmSync(저.뿌리, { recursive: true, force: true });
  }
});

test('HEAD 가 아닌 커밋에 put 하면 표지가 안 남고 이유를 찍는다', () => {
  const 저 = 임시저장소();
  try {
    const 앞 = 저.커밋('apps/admin/src/a.ts');
    저.커밋('docs/x.md');
    const out = 저.돌린다('put', 'push', 앞);
    assert.equal(existsSync(저.표지(앞)), false);
    assert.match(out, /HEAD/, '이유를 찍지 않았다');
    assert.match(저.돌린다('find', 앞), /^reuse=none$/m);
  } finally {
    rmSync(저.뿌리, { recursive: true, force: true });
  }
});

test('코드가 덜 커밋된 작업 폴더에서 put 은 안 남기고 종료 0 — 문서만 더러우면 남긴다', () => {
  const 저 = 임시저장소();
  try {
    const c = 저.커밋('apps/admin/src/a.ts');
    저.쓴다('apps/admin/src/dirty.ts', 'x');
    const out = 저.돌린다('put', 'push', 'HEAD');
    assert.equal(existsSync(저.표지(c)), false);
    assert.match(out, /커밋 안 된/);
    rmSync(join(저.뿌리, 'apps/admin/src/dirty.ts'));
    저.쓴다('docs/memo.md', 'x');
    저.돌린다('put', 'push', 'HEAD');
    assert.equal(existsSync(저.표지(c)), true);
  } finally {
    rmSync(저.뿌리, { recursive: true, force: true });
  }
});

test('ALLOW_PROTECTED=1 길은 표지를 안 남긴다', () => {
  const 저 = 임시저장소();
  try {
    const c = 저.커밋('apps/admin/src/a.ts');
    execFileSync('node', [SCRIPT, 'put', 'push', 'HEAD'], {
      cwd: 저.뿌리, env: { ...깨끗한환경, ALLOW_PROTECTED: '1' }, encoding: 'utf8',
    });
    assert.equal(existsSync(저.표지(c)), false);
  } finally {
    rmSync(저.뿌리, { recursive: true, force: true });
  }
});

test('표지가 origin/main 쪽 커밋에만 있으면 none', () => {
  const 저 = 임시저장소();
  try {
    저.돌린다('put', 'push', 'HEAD');
    저.커밋('docs/x.md');
    assert.match(저.돌린다('find'), /^reuse=none$/m);
  } finally {
    rmSync(저.뿌리, { recursive: true, force: true });
  }
});

test('모르는 커밋 · 저장소가 아닌 곳이어도 reuse=none 으로 종료 0', () => {
  const 저 = 임시저장소();
  try {
    assert.match(저.돌린다('find', 'f'.repeat(40)), /^reuse=none$/m);
  } finally {
    rmSync(저.뿌리, { recursive: true, force: true });
  }
  const 빈폴더 = mkdtempSync(join(tmpdir(), 'check-stamp-nogit-'));
  try {
    const out = execFileSync('node', [SCRIPT, 'find'], { cwd: 빈폴더, env: 깨끗한환경, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    assert.match(out, /^reuse=none$/m);
  } finally {
    rmSync(빈폴더, { recursive: true, force: true });
  }
});

// 진짜 npm 을 돌리면 이 PR 이 고치는 사고(수 분)가 되살아난다 — 가짜 npm 이 인자만 적고 FAKE_FAIL 인 호출만 실패시킨다
function 가짜npm폴더() {
  const 폴더 = mkdtempSync(join(tmpdir(), 'check-stamp-npm-'));
  const 파일 = join(폴더, 'npm');
  writeFileSync(
    파일,
    '#!/bin/sh\necho "$*" >> "$FAKE_LOG"\n[ -n "$FAKE_TOUCH" ] && [ "$*" = "run typecheck" ] && echo x > "$FAKE_TOUCH"\n[ -n "$FAKE_FAIL" ] && [ "$*" = "$FAKE_FAIL" ] && { echo 가짜 실패; exit 3; }\nexit 0\n',
  );
  chmodSync(파일, 0o755);
  return 폴더;
}

function 로컬로돌린다(저, 추가환경 = {}, 명령 = ['run', 'local']) {
  const 가짜 = 가짜npm폴더();
  const 호출기록 = join(가짜, 'calls.log');
  try {
    const r = spawnSync('node', [SCRIPT, ...명령], {
      cwd: 저.뿌리, encoding: 'utf8',
      env: { ...깨끗한환경, PATH: `${가짜}:${process.env.PATH}`, FAKE_LOG: 호출기록, ...추가환경 },
    });
    const 호출 = existsSync(호출기록) ? readFileSync(호출기록, 'utf8').split('\n').filter(Boolean) : [];
    return { 종료: r.status, 출력: r.stdout + r.stderr, 호출 };
  } finally {
    rmSync(가짜, { recursive: true, force: true });
  }
}

const 일곱 = ['run check:deps', 'run typecheck', 'run check:workflow', 'run check:spec', 'run check:tests', 'run test:changed -- origin/main', 'run test:always'];

test('run local — 일곱 명령을 스스로 돌리고 EXIT 줄과 로그 폴더를 찍고 HEAD 에 local 표지를 남긴다', () => {
  const 저 = 임시저장소();
  try {
    const c = 저.커밋('apps/admin/src/a.ts');
    const r = 로컬로돌린다(저);
    assert.equal(r.종료, 0, r.출력);
    assert.deepEqual(r.호출, 일곱);
    for (const 이름 of ['check:deps', 'typecheck', 'check:workflow', 'check:spec', 'check:tests', 'test:changed', 'test:always'])
      assert.match(r.출력, new RegExp(`^${이름} EXIT=0$`, 'm'));
    assert.match(r.출력, /^로그 폴더: .+/m);
    assert.match(readFileSync(저.표지(c), 'utf8'), /^local$/m);
    assert.match(r.출력, /local 표지를 남겼다/);
    const 열림 = 로컬로돌린다(저, {}, ['put', 'local', 'HEAD']);
    assert.deepEqual(열림.호출, []);
  } finally {
    rmSync(저.뿌리, { recursive: true, force: true });
  }
});

test('run local — 하나가 실패해도 나머지를 돌고, 표지 없이 처음 실패한 종료 코드로 끝난다', () => {
  const 저 = 임시저장소();
  try {
    const c = 저.커밋('apps/admin/src/a.ts');
    const r = 로컬로돌린다(저, { FAKE_FAIL: 'run check:spec' });
    assert.equal(r.종료, 3);
    assert.match(r.출력, /^check:spec EXIT=3$/m);
    assert.match(r.출력, /^test:always EXIT=0$/m);
    assert.equal(r.호출.length, 7);
    assert.equal(existsSync(저.표지(c)), false);
    assert.match(r.출력, /표지를 남기지 않는다/);
  } finally {
    rmSync(저.뿌리, { recursive: true, force: true });
  }
});

test('run local — package.json · db/ 가 바뀐 브랜치면 test:changed 대신 전체 npm test', () => {
  for (const 경로 of ['package.json', 'db/migrations/0001.sql', 'tsconfig.json']) {
    const 저 = 임시저장소();
    try {
      저.커밋(경로);
      const r = 로컬로돌린다(저);
      assert.equal(r.종료, 0, r.출력);
      assert.deepEqual(r.호출.slice(4), ['run check:tests', 'test'], 경로);
      assert.match(r.출력, /^test EXIT=0$/m);
    } finally {
      rmSync(저.뿌리, { recursive: true, force: true });
    }
  }
});

test('run local — 도는 동안 작업 폴더가 바뀌거나 시작 때 코드가 덜 커밋돼 있으면 표지를 안 남긴다', () => {
  const 저 = 임시저장소();
  try {
    const c = 저.커밋('apps/admin/src/a.ts');
    const r = 로컬로돌린다(저, { FAKE_TOUCH: join(저.뿌리, 'made.md') });
    assert.equal(r.종료, 0, r.출력);
    assert.equal(existsSync(저.표지(c)), false);
    assert.match(r.출력, /시작 때와 다르다/);
    rmSync(join(저.뿌리, 'made.md'));
    저.쓴다('apps/admin/src/dirty.ts', 'x');
    const 더러움 = 로컬로돌린다(저);
    assert.equal(더러움.종료, 0, 더러움.출력);
    assert.equal(existsSync(저.표지(c)), false);
    assert.match(더러움.출력, /커밋 안 된/);
  } finally {
    rmSync(저.뿌리, { recursive: true, force: true });
  }
});

test('run local — HEAD 에 local 이 있고 차이가 같음 · 문서면 check:spec · check:docs-contract 만 돌고 재사용을 찍는다', () => {
  const 저 = 임시저장소();
  try {
    const c = 저.커밋('apps/admin/src/a.ts');
    assert.equal(로컬로돌린다(저).종료, 0);
    let r = 로컬로돌린다(저);
    assert.deepEqual(r.호출, ['run check:spec', 'run check:docs-contract']);
    assert.match(r.출력, new RegExp(`^재사용 local ${c.slice(0, 12)}$`, 'm'));
    저.커밋('docs/x.md');
    r = 로컬로돌린다(저);
    assert.deepEqual(r.호출, ['run check:spec', 'run check:docs-contract']);
    assert.match(r.출력, /^재사용 local /m);
    저.커밋('apps/admin/src/b.ts');
    assert.equal(로컬로돌린다(저).호출.length, 7);
  } finally {
    rmSync(저.뿌리, { recursive: true, force: true });
  }
});

test('전체 단위 테스트 규칙 정규식이 pre-push 훅의 것과 같다', () => {
  const 훅 = readFileSync(fileURLToPath(new URL('../hooks/pre-push', import.meta.url)), 'utf8');
  const m = 훅.match(/grep -qE '(\^\(db\/[^']*)'/);
  assert.ok(m, 'pre-push 에서 전체 규칙 줄을 못 찾았다');
  assert.equal(모듈.전체규칙글자, m[1]);
});
