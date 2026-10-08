#!/usr/bin/env node
// 바뀐 파일 목록을 차선 넷(docs · spec · cases · full)으로 가른다. pre-push 훅과 CI 가 돌릴 검사를 고를 때 쓴다.
//
// cases-only.mjs 에 붙이지 않고 따로 둔 이유 — 맥 작성 에이전트가 그 파일 하나만 임시 폴더에 복사해
// 종료 코드로 병합을 허락한다(scripts/authoring-io.ts). 거기에 import 를 더하면 복사본이 깨지고,
// 종료 0 의 뜻을 넓히면 에이전트가 문서 PR 까지 병합한다. 그래서 여기서 그 판정을 가져다 쓴다.
//
// 쓰는 법: git -c core.quotePath=false diff --no-renames --name-only <base>...HEAD | node lane.mjs <base>
//   표준출력 `lane=<차선>` 다음 줄에 `record=<need|skip>`. 종료 코드는 늘 0 이다 — CI 의 bash -e 를 죽이지 않는다.
//   무엇이든 실패하면 `lane=full` · `record=need` 이다.
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { 테스트만인가 } from './cases-only.mjs';
import { surfaceOf } from './surfaces.mjs';

// docs 차선은 docs/ 아래 문서 파일(md · html · .gitkeep)과 루트 md 뿐이다. surfaces 의 DOC 은 `**/*.html` 도,
// docs/** 의 아무 파일도 잡아서 새 앱 폴더의 html 이나 docs/ 에 둔 코드가 문서로 샌다 — 차선은 등급보다 좁게 본다
const 문서자리 = (f) => /^docs\/.*(\.md|\.html|\/\.gitkeep)$/.test(f) || /^[^/]+\.md$/.test(f);

/** 판정을 못 하면 full — 틀리면 코드가 검사 없이 들어간다 */
export function lane(파일들) {
  if (파일들.length === 0) return 'full';
  if (파일들.some((f) => f.split('/').includes('..'))) return 'full';
  if (테스트만인가(파일들)) return 'cases';
  const 표면들 = 파일들.map((f) => surfaceOf(f)?.name ?? null);
  const 문서뿐 = 파일들.every((f, i) => (표면들[i] === 'DOC' && 문서자리(f)) || 표면들[i] === 'SPEC');
  if (!문서뿐) return 'full';
  return 표면들.includes('SPEC') ? 'spec' : 'docs';
}

/**
 * 검사 기록(docs/reviews)을 요구해야 하나. 훅과 응답 끝 경고가 이 한 곳을 쓴다.
 * 면제는 모든 경로가 1등급 표면이거나 문서 자리일 때뿐이다 — 명세·미분류·빈 목록·.. 경로는 모르는 것이라 요구한다.
 * DOC 표면은 `docs/x.mjs` · 앱 폴더 html 도 잡으므로 표면만 보지 않고 문서 자리로 좁힌다
 */
export function 기록요구(파일들) {
  if (파일들.length === 0) return true;
  if (파일들.some((f) => f.split('/').includes('..'))) return true;
  return !파일들.every((f) => {
    const 표면 = surfaceOf(f);
    return 표면?.tier === 1 || (표면?.name === 'DOC' && 문서자리(f));
  });
}

function 직접불렸나() {
  try {
    return realpathSync.native(fileURLToPath(import.meta.url)) === realpathSync.native(process.argv[1] ?? '');
  } catch {
    return false;
  }
}

function 판정(base) {
  if (!base) return { 차선: 'full', 요구: true };
  // 못 읽는 base 로 받은 목록은 믿을 수 없다 — 던지면 full 이다
  execFileSync('git', ['rev-parse', '--verify', '--quiet', `${base}^{commit}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  const 파일들 = readFileSync(0, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  return { 차선: lane(파일들), 요구: 기록요구(파일들) };
}

if (직접불렸나()) {
  let 결과 = { 차선: 'full', 요구: true };
  try {
    결과 = 판정(process.argv[2]);
  } catch (e) {
    console.error(`[lane] 판정을 못 했다 — full 로 간다: ${e.message}`);
  }
  console.log(`lane=${결과.차선}\nrecord=${결과.요구 ? 'need' : 'skip'}`);
}
