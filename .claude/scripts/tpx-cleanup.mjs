#!/usr/bin/env node
// /tpx 병합 뒤 정리를 한 번에 한다 — 병합 확인 → 루트 pull → 작업 폴더 제거 → 브랜치 삭제.
// 사용법: node .claude/scripts/tpx-cleanup.mjs <PR 번호> [--dry-run]  (루트 또는 작업 폴더에서 실행)
//
// 왜 앞 단계가 실패하면 멈추는가 — pull 이 안 됐는데 작업 폴더를 지우면 되돌릴 기준이 사라진다.
// 왜 -D · --force 를 안 쓰는가 — 병합 안 된 커밋이나 남은 변경이 있으면 git 이 거부한다. 그 거부를 그대로 보고한다.
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const prNumber = args.find((arg) => /^\d+$/.test(arg));

/** git 을 주어진 폴더에서 실행하고 출력을 돌려준다. 실패하면 예외를 던진다 */
function git(cwd, ...gitArgs) {
  return execFileSync('git', gitArgs, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

/** 단계 하나를 실행하고 결과를 찍는다. 실패하면 거기서 멈춘다 */
function step(label, fn) {
  try {
    fn();
    console.log(`✓ ${label}`);
  } catch (error) {
    fail(`${label} 실패 — 여기서 멈췄다. 앞 단계까지만 반영됐다\n${String(error.stderr || error.message).trim()}`);
  }
}

/** `git worktree list --porcelain` 을 {path, branch} 목록으로 바꾼다. 첫 항목이 루트다 */
function parseWorktrees(text) {
  return text.split('\n\n').filter(Boolean).map((block) => {
    const lines = block.split('\n');
    const path = lines.find((line) => line.startsWith('worktree ')).slice('worktree '.length);
    const ref = lines.find((line) => line.startsWith('branch '));
    return { path, branch: ref ? ref.slice('branch refs/heads/'.length) : null };
  });
}

if (!prNumber) fail('PR 번호가 없다. 예: node .claude/scripts/tpx-cleanup.mjs 267');

const pr = JSON.parse(
  execFileSync('gh', ['pr', 'view', prNumber, '--json', 'state,headRefName'], { encoding: 'utf8' }),
);
if (pr.state !== 'MERGED') fail(`PR #${prNumber} 이 아직 MERGED 가 아니다(현재 ${pr.state}). 아무것도 지우지 않았다`);

const branch = pr.headRefName;
const worktrees = parseWorktrees(git(process.cwd(), 'worktree', 'list', '--porcelain'));
const root = worktrees[0].path;
const workTree = worktrees.find((item) => item.branch === branch && item.path !== root);
const hasLocal = git(root, 'branch', '--list', branch) !== '';
const hasRemote = git(root, 'ls-remote', '--heads', 'origin', branch) !== '';

console.log(`PR #${prNumber} MERGED 확인 · 브랜치 ${branch}`);
if (dryRun) {
  console.log('--dry-run 예정 목록');
  console.log('  1. 루트 pull (git pull --ff-only origin main)');
  if (workTree) console.log(`  2. 작업 폴더 제거 ${workTree.path}`);
  if (hasLocal) console.log(`  3. 로컬 브랜치 삭제 ${branch} (-d)`);
  if (hasRemote) console.log(`  4. 원격 브랜치 삭제 origin/${branch}`);
  process.exit(0);
}

if (git(root, 'branch', '--show-current') !== 'main') fail(`루트가 main 이 아니다. 루트에서 다시 실행하라 — 아무것도 지우지 않았다`);

step('루트 pull (git pull --ff-only origin main)', () => git(root, 'pull', '--ff-only', 'origin', 'main'));
if (workTree) step(`작업 폴더 제거 ${workTree.path}`, () => git(root, 'worktree', 'remove', workTree.path));
if (hasLocal) step(`로컬 브랜치 삭제 ${branch}`, () => git(root, 'branch', '-d', branch));
if (hasRemote) step(`원격 브랜치 삭제 origin/${branch}`, () => git(root, 'push', 'origin', '--delete', branch));
