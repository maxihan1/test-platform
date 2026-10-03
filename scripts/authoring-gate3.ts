// 끝의 전체 3회 결과 파일을 에이전트가 직접 판정한다 — 자식의 말이 아니라 Playwright json 결과로 (SPEC 도메인/작성 §3.6)

import { lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative } from 'node:path';

import { type 파일글, 품질숫자, 품질줄 } from './authoring-quality.js';

const 결과상한 = 50 * 1024 * 1024;
const 케이스글상한 = 1024 * 1024;

/**
 * 작성 요약 머리에 싣는 줄 — 끝의 전체 3회 경고(있으면)와 품질 숫자. 자식이 끝난 뒤 root 가 읽는다.
 * 자식이 둔 링크 · 하드링크로 남의 파일을 읽지 않게 일반 파일 · nlink 1 · 폴더 안만 본다(산출물읽기와 같은 검사).
 * `결과폴더` 는 자식의 `AUTHORING_GATE3_DIR` — 실행마다 새로 만드는 임시라 앞 실행 파일이 남지 않는다
 */
export function 끝검사줄들(결과폴더: string, 트리: string, 폴더: string): string[] {
  const 안전한글 = (파일: string, 자리: string, 상한: number): string | null => {
    const 정보 = lstatSync(파일, { throwIfNoEntry: false });
    if (정보 === undefined || !정보.isFile() || 정보.nlink !== 1 || 정보.size > 상한) return null;
    return realpathSync(파일) === join(realpathSync(자리), relative(자리, 파일)) ? readFileSync(파일, 'utf8') : null;
  };
  const 이름들 = (자리: string): string[] => {
    try {
      return readdirSync(자리);
    } catch {
      return []; // 폴더가 없으면 결과 파일이 없는 것이다 — 판정이 그렇게 적는다
    }
  };
  // 못 읽은 파일은 깨진 글로 넘겨 판정이 「못 읽었다」로 적게 한다
  const 결과들 = 이름들(결과폴더)
    .filter((이름) => /^gate3-final.*\.json$/.test(이름))
    .sort()
    .map((이름) => 안전한글(join(결과폴더, 이름), 결과폴더, 결과상한) ?? '{깨짐');

  const 테스트 = join(트리, 'tests');
  const 파일들: (파일글 & { 때: number })[] = [];
  const 훑기 = (자리: string) => {
    for (const 이름 of 이름들(자리)) {
      const 길 = join(자리, 이름);
      const 정보 = lstatSync(길);
      if (정보.isDirectory()) 훑기(길);
      else if (이름.endsWith('.ts')) {
        const 글 = 안전한글(길, 트리, 케이스글상한);
        if (글 !== null) 파일들.push({ 경로: relative(테스트, 길), 글, 때: 정보.mtimeMs });
      }
    }
  };
  훑기(join(테스트, 폴더));
  const 케이스파일들 = 파일들.map((f) => f.경로).filter((f) => f.endsWith('.spec.ts'));
  const 마지막 = Math.max(0, ...파일들.map((f) => f.때));
  const 경고 = 끝전체3회경고(결과들, 케이스파일들, 마지막);
  return [...(경고 === null ? [] : [경고]), 품질줄(품질숫자(파일들))];
}

interface 결과글 {
  config?: { workers?: unknown };
  stats?: { startTime?: unknown };
  suites?: { file?: unknown; specs?: { tests?: { projectName?: unknown; status?: unknown }[] }[] }[];
}

/**
 * 끝의 전체 3회가 규칙대로 돌았는지 — 아니면 PR 본문 머리에 실을 경고 한 줄, 맞으면 null.
 * 올리기는 막지 않는다(막으면 다 만든 케이스를 통째로 못 쓴다 · 2026-10-03 게이트 0). 사람이 반영 전에 본다.
 *
 * - `결과들` — 덩어리마다 json 글 하나. 자식 명령 하나가 최대 10분이라 하나씩 차례로 나눠 돌 수 있다
 * - `케이스파일들` — 이번 케이스 파일, testDir 기준(`mkt/MKT-UI-001.spec.ts`). 결과의 최상위 `suites[].file` 과 같은 꼴이다.
 *   `specs[].file` 은 kit 런타임 파일이라 쓰지 않는다(2026-10-03 실측)
 * - `마지막수정ms` — 케이스 · Page Object 파일 가운데 가장 늦은 수정 시각. 그 뒤에 돈 결과여야 지금 코드 기준이다
 *
 * 케이스 하나 = 테스트 하나(`catalog/rules.ts`)라 파일마다 데스크톱 결과가 정확히 3이어야 한다. 보류의 skipped 도 센다.
 * 결과 파일은 자식이 쓴다 — 고의로 꾸미면 못 잡는다. 품질 사고를 막는 장치이지 보안 장치가 아니다.
 */
export function 끝전체3회경고(결과들: string[], 케이스파일들: string[], 마지막수정ms: number): string | null {
  const 경고 = (까닭: string) => `⚠️ 끝의 전체 3회가 규칙대로 돌지 않았다 — ${까닭}`;
  if (결과들.length === 0) return 경고('결과 파일이 없다');
  let 읽은것: 결과글[];
  try {
    읽은것 = 결과들.map((글) => JSON.parse(글) as 결과글);
  } catch {
    return 경고('결과 파일을 못 읽었다');
  }

  const 까닭들: string[] = [];
  const 동시 = 읽은것.map((r) => r.config?.workers).find((w) => w !== 1);
  if (동시 !== undefined) 까닭들.push(`동시 ${String(동시)}개로 돌렸다`);

  const 횟수 = new Map<string, number>();
  let 실패 = 0;
  for (const r of 읽은것)
    for (const 묶음 of r.suites ?? [])
      for (const spec of 묶음.specs ?? [])
        for (const t of spec.tests ?? []) {
          if (t.projectName !== 'desktop' || typeof 묶음.file !== 'string') continue;
          횟수.set(묶음.file, (횟수.get(묶음.file) ?? 0) + 1);
          if (t.status === 'unexpected') 실패 += 1;
        }
  const 빠진 = 케이스파일들.filter((f) => !횟수.has(f)).length;
  const 어긋난 = 케이스파일들.filter((f) => 횟수.has(f) && 횟수.get(f) !== 3).length;
  if (빠진 > 0) 까닭들.push(`빠진 파일 ${빠진}개`);
  if (어긋난 > 0) 까닭들.push(`3회가 아닌 파일 ${어긋난}개`);
  if (실패 > 0) 까닭들.push(`실패 ${실패}회`);

  // 덩어리 사이에 다른 파일을 고친 것도 경고로 본다 — 파일마다 가르지 않고 보수적으로
  const 시작들 = 읽은것.map((r) => Date.parse(String(r.stats?.startTime)));
  if (시작들.some((t) => !Number.isFinite(t) || t < 마지막수정ms)) 까닭들.push('마지막 실행 뒤에 케이스를 고쳤다');

  return 까닭들.length === 0 ? null : 경고(까닭들.join(' · '));
}
