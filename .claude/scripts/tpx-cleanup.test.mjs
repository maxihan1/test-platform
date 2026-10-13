// tpx-cleanup.mjs 가 병합 확인 · 루트 pull · 작업 폴더 · 브랜치 삭제를 순서대로, 실패하면 멈추게 하는지 본다
//
// 왜 임시 git 저장소인가 — 실제 worktree · branch · push --delete 동작을 그대로 돌려야 믿을 수 있다.
// 「gh」만 가짜로 둔다 — PR 상태를 환경 변수로 고르고 실제 GitHub 는 건드리지 않는다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('./tpx-cleanup.mjs', import.meta.url));

/** 커밋 서명 · 사용자 설정에 기대지 않도록 git 을 고정 설정으로 실행한다 */
function git(cwd, ...gitArgs) {
  return execFileSync(
    'git',
    ['-c', 'commit.gpgsign=false', '-c', 'user.name=t', '-c', 'user.email=t@t', ...gitArgs],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ).trim();
}

function commit(cwd, file, message) {
  writeFileSync(join(cwd, file), message);
  git(cwd, 'add', file);
  git(cwd, 'commit', '-m', message);
}

/**
 * origin(bare) · 루트(main) · 작업 폴더(feat) 를 만든다.
 * 병합은 seed 에서 origin 으로 올려서 루트는 뒤처진 상태가 된다 — pull 이 실제로 필요하다.
 */
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'tpx-cleanup-'));
  const origin = join(dir, 'origin.git');
  const seed = join(dir, 'seed');
  const root = join(dir, 'root');
  const wt = join(dir, 'wt');
  const bin = join(dir, 'bin');

  git(dir, 'init', '--bare', '-b', 'main', origin);
  git(dir, 'clone', origin, seed);
  commit(seed, 'a.txt', 'init');
  git(seed, 'push', '-u', 'origin', 'main');

  git(dir, 'clone', origin, root);
  git(root, 'worktree', 'add', '-b', 'feat', wt, 'origin/main');
  commit(wt, 'b.txt', 'feat work');
  git(wt, 'push', '-u', 'origin', 'feat');

  git(seed, 'fetch', 'origin');
  git(seed, 'merge', '--no-ff', '-m', 'merge feat', 'origin/feat');
  git(seed, 'push', 'origin', 'main');

  // 가짜 gh — PR 상태를 FAKE_PR_STATE 로 받아 JSON 을 돌려준다
  mkdirSync(bin);
  const gh = join(bin, 'gh');
  writeFileSync(gh, '#!/bin/sh\necho "{\\"state\\":\\"$FAKE_PR_STATE\\",\\"headRefName\\":\\"feat\\"}"\n');
  chmodSync(gh, 0o755);

  return { root, wt, bin };
}

function runScript(fx, state, ...extra) {
  return spawnSync(process.execPath, [SCRIPT, '267', ...extra], {
    cwd: fx.wt,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${fx.bin}:${process.env.PATH}`, FAKE_PR_STATE: state },
  });
}

test('병합 전 PR 이면 아무것도 지우지 않고 실패한다', () => {
  const fx = fixture();
  const result = runScript(fx, 'OPEN');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /MERGED 가 아니다/);
  assert.ok(existsSync(fx.wt), '작업 폴더가 남아 있어야 한다');
  assert.notEqual(git(fx.root, 'branch', '--list', 'feat'), '', '로컬 브랜치가 남아 있어야 한다');
});

test('--dry-run 은 예정 목록만 찍고 아무것도 바꾸지 않는다', () => {
  const fx = fixture();
  const result = runScript(fx, 'MERGED', '--dry-run');

  assert.equal(result.status, 0);
  assert.match(result.stdout, /작업 폴더 제거/);
  assert.ok(existsSync(fx.wt), '작업 폴더가 남아 있어야 한다');
  assert.notEqual(git(fx.root, 'branch', '--list', 'feat'), '', '로컬 브랜치가 남아 있어야 한다');
});

test('병합되었으면 루트 pull → 작업 폴더 → 로컬 · 원격 브랜치 순으로 지운다', () => {
  const fx = fixture();
  const result = runScript(fx, 'MERGED');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(git(fx.root, 'log', '-1', '--format=%s'), 'merge feat', '루트가 병합 커밋까지 pull 되어야 한다');
  assert.equal(existsSync(fx.wt), false, '작업 폴더가 지워져야 한다');
  assert.equal(git(fx.root, 'branch', '--list', 'feat'), '', '로컬 브랜치가 지워져야 한다');
  assert.equal(git(fx.root, 'ls-remote', '--heads', 'origin', 'feat'), '', '원격 브랜치가 지워져야 한다');
});

test('작업 폴더에 남은 변경이 있으면 지우지 않고 멈춘다', () => {
  const fx = fixture();
  writeFileSync(join(fx.wt, 'dirty.txt'), 'uncommitted');
  const result = runScript(fx, 'MERGED');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /작업 폴더 제거 .*실패/);
  assert.ok(existsSync(fx.wt), '변경이 남은 작업 폴더는 지우지 않는다');
  assert.notEqual(git(fx.root, 'branch', '--list', 'feat'), '', '뒤 단계인 로컬 브랜치 삭제도 하지 않는다');
});
