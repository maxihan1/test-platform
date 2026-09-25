#!/usr/bin/env node
// 바뀐 파일이 「테스트만」(tests/<폴더>/ 의 spec · 케이스 문서)인지 판정한다. pre-push 훅과 CI 가 가벼운 길을 고를 때 쓴다.
//
// 쓰는 법: git -c core.quotePath=false diff --name-only <base>...HEAD | node cases-only.mjs <base>
//   종료 0 = 테스트만(가벼운 길) · 1 = 그 밖(무거운 길). 판정을 못 해도 1 이다 — 틀리면 코드가 검사 없이 들어간다.
//   core.quotePath=false 를 빼면 한글 파일명이 따옴표로 싸여 와서 늘 무거운 길이 된다(안전하지만 느리다).
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 파일 목록이 전부 `tests/<폴더>/*.spec.ts` 또는 `docs/cases/*.md` 인가. 폴더가 base 에 있었는지는 묻지 않는다.
 * 전에는 새 폴더를 무거운 길로 보냈다(CI 실행 단계에 없어 다음 PR 이 빨개진다는 이유). 그런데 서비스 폴더는
 * CI 가 돌리지 않고, 케이스 병합의 근거는 작성 에이전트의 관문 3 기록이다. 새 서비스의 첫 케이스를
 * 막을 까닭이 없어 뺐다 (2026-09-25 사용자 승인).
 *
 * 대신 spec 이름은 케이스 번호 모양(`<접두사>-NNN.spec.ts`)만 받는다 (2026-09-25 게이트 2).
 * `ci-covers-tests` 가 이 모양만 든 폴더를 서비스 폴더로 면제하므로, 더 넓게 받으면 cases 차선으로 들어온 폴더가
 * 면제에서 빠져 다음 full PR 이 남의 폴더 때문에 빨개진다. 기획서에 숨긴 지시로 아무 이름을 심는 길도 좁아진다.
 * 접두사 모양은 SPEC §2 tcId 접두사(`^[A-Z][A-Z0-9]{0,11}$`)와 같다.
 */
export function 테스트만인가(파일들) {
  if (파일들.length === 0) return false;
  return 파일들.every((f) => {
    if (f.split('/').includes('..')) return false;
    if (/^docs\/cases\/[^/]+\.md$/.test(f)) return true;
    return /^tests\/[^/]+\/[A-Z][A-Z0-9]{0,11}-\d{3}\.spec\.ts$/.test(f);
  });
}

// 경로 글자로 비교하면 심링크(/var → /private/var)·대소문자만 다른 경로에서 본체를 건너뛰고 종료 0 이 된다.
// native 라야 맥의 대소문자 무시 파일시스템에서 실제 이름으로 풀린다
function 직접불렸나() {
  try {
    return realpathSync.native(fileURLToPath(import.meta.url)) === realpathSync.native(process.argv[1] ?? '');
  } catch {
    return false;
  }
}

const 직접 = 직접불렸나();
if (!직접 && basename(process.argv[1] ?? '').toLowerCase() === 'cases-only.mjs') {
  // 명령줄로 불린 모양인데 본체가 안 돈다 — 판단 불가는 무거운 길이다
  console.error('[cases-only] 직접 불렸는지 못 가렸다 — 무거운 길로 간다');
  process.exit(1);
}

if (직접) {
  const base = process.argv[2];
  if (!base) {
    console.error('[cases-only] base ref 를 인자로 줘라');
    process.exit(1);
  }
  // 폴더 목록은 더 안 보지만 base 는 확인한다 — 못 읽는 base 로 받은 목록은 믿을 수 없다
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${base}^{commit}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    console.error(`[cases-only] ${base} 를 못 읽었다 — 무거운 길로 간다: ${e.message}`);
    process.exit(1);
  }
  const 파일들 = readFileSync(0, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  process.exit(테스트만인가(파일들) ? 0 : 1);
}
