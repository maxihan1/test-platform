// pre-push 훅 검사 둘(hook-contract · hook-reuse)이 같이 쓰는 임시 저장소 · 훅 실행 도우미
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const HOOK = fileURLToPath(new URL('../hooks/pre-push', import.meta.url));
export const ZERO = '0000000000000000000000000000000000000000';

// 훅 안에서 이 검사가 돌면 git 이 물려준 GIT_DIR 등이 임시 저장소 대신 진짜 저장소를 가리킨다.
// 2026-09-25 에 같은 모양의 검사가 실제 브랜치에 커밋하고 origin/main 을 옮겼다 (LEARNINGS)
export const 깨끗한환경 = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));

/** base(origin/main) 하나와 그 위에 파일을 더한 커밋 하나가 있는 임시 저장소. 올릴 sha 를 돌려준다 */
export function 임시저장소(더할파일들, 옮길것들 = []) {
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
    `#!/bin/sh\necho "$*" >> "${기록}"\nenv | grep '^GIT_' >> "${기록}.git-env" || true\nif [ -n "$NPM_FAIL" ]; then case "$*" in *"$NPM_FAIL"*) exit 1 ;; esac; fi\n`,
  );
  chmodSync(join(가짜, 'npm'), 0o755);
  return { 뿌리, sha: git('rev-parse', 'HEAD'), 가짜, 기록 };
}

export function 저장소에서돌린다({ 뿌리, sha, 가짜 }, 더할환경 = {}) {
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

export const 불린것 = (기록) => {
  try {
    return readFileSync(기록, 'utf8');
  } catch {
    return '';
  }
};
