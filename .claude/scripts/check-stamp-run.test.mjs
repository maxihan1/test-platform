// check-stamp.mjs 의 `run local`(검사 묶음을 스스로 돌리고 표지를 남기는 길)을 임시 저장소와 가짜 npm 으로 본다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { 전체규칙글자 } from './check-stamp.mjs';

const SCRIPT = fileURLToPath(new URL('./check-stamp.mjs', import.meta.url));
// 훅 안에서 돌면 git 이 물려준 GIT_DIR 등이 임시 저장소 대신 진짜 저장소를 가리킨다 (hook-contract.test.mjs 와 같은 이유)
const 깨끗한환경 = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));

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
  const 표지 = (sha) => join(뿌리, '.git', 'tpx-checks', sha);
  return { 뿌리, git, 쓴다, 커밋, 표지 };
}

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

const 검사묶음 = ['run check:deps', 'run typecheck', 'run check:workflow', 'run check:spec', 'run check:tests', 'run test:changed -- origin/main', 'run test:always'];

test('run local — 검사 묶음을 스스로 돌리고 EXIT 줄과 로그 폴더를 찍고 HEAD 에 local 표지를 남긴다', () => {
  const 저 = 임시저장소();
  try {
    const c = 저.커밋('apps/admin/src/a.ts');
    const r = 로컬로돌린다(저);
    assert.equal(r.종료, 0, r.출력);
    assert.deepEqual(r.호출, 검사묶음);
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
  assert.equal(전체규칙글자, m[1]);
});
