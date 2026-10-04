// 끝의 전체 3회 결과 파일을 에이전트가 직접 판정한다 — 자식의 말이 아니라 Playwright json 결과로 (SPEC 도메인/작성 §3.6)

import { lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';

import { type 파일글, 품질숫자, 품질줄 } from './authoring-quality.js';

const 결과상한 = 50 * 1024 * 1024;
const 케이스글상한 = 1024 * 1024;
const 깊이상한 = 20;

/**
 * 작성 요약 머리에 싣는 줄 — 끝의 전체 3회 경고(있으면)와 품질 숫자. 자식이 끝난 뒤 root 가 읽는다.
 * 자식이 둔 링크 · 하드링크로 남의 파일을 읽지 않게 일반 파일 · nlink 1 · 폴더 안만 본다(산출물읽기와 같은 검사).
 * `결과폴더` 는 자식의 `AUTHORING_GATE3_DIR` — 실행마다 새로 만드는 임시라 앞 실행 파일이 남지 않는다.
 * 부르는 쪽은 예외를 잡아 「끝 검사를 못 했다」로 적는다 — 이 검사로 올리기가 죽으면 안 된다
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
  // 링크 폴더는 lstat 이라 따라가지 않는다. 깊이도 묶는다 — 자식이 아주 깊은 폴더를 두면 재귀가 죽는다
  const 훑기 = (자리: string, 깊이: number) => {
    if (깊이 > 깊이상한) return;
    for (const 이름 of 이름들(자리)) {
      const 길 = join(자리, 이름);
      const 정보 = lstatSync(길, { throwIfNoEntry: false });
      if (정보?.isDirectory()) 훑기(길, 깊이 + 1);
      else if (정보 !== undefined && 이름.endsWith('.ts')) {
        const 글 = 안전한글(길, 트리, 케이스글상한);
        if (글 !== null) 파일들.push({ 경로: relative(테스트, 길), 글, 때: 정보.mtimeMs });
      }
    }
  };
  훑기(join(테스트, 폴더), 0);
  const 경고 = 끝전체3회경고(결과들, 케이스수정(파일들));
  const 임시 = 남은임시도우미(파일들.map((f) => f.경로));
  return [...(경고 === null ? [] : [경고]), ...(임시 === null ? [] : [임시]), 품질줄(품질숫자(파일들))];
}

/** 보조가 모자란 도우미를 적어 둔 `components/draft-<묶음>` 이 남았나 — 자식이 합칠 때 공용으로 옮기고 지운다 (작성 §3.6 팬아웃, 2026-10-04) */
export function 남은임시도우미(경로들: string[]): string | null {
  const 남은것 = 경로들.filter((p) => /(^|\/)components\/draft-[^/]*\.ts$/.test(p));
  return 남은것.length === 0 ? null : `⚠️ 공용으로 옮기지 않은 임시 도우미 ${남은것.length}개 — ${남은것.join(' · ')}`;
}

/** 올리기가 부르는 문 — 끝 검사가 예외를 던져도 올리기는 간다. 경고만 하고 막지 않는 장치다 (작성 §3.6) */
export function 끝검사(결과폴더: string, 트리: string, 폴더: string): string[] {
  try {
    return 끝검사줄들(결과폴더, 트리, 폴더);
  } catch (e) {
    return [`⚠️ 끝 검사를 못 했다 — ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`];
  }
}

/** 케이스 파일마다, 그 파일과 그것이 가져다 쓰는 Page Object · Component 가운데 가장 늦은 수정 시각 */
function 케이스수정(파일들: (파일글 & { 때: number })[]): Record<string, number> {
  const 표 = new Map(파일들.map((f) => [f.경로, f]));
  const 메모 = new Map<string, number>();
  const 늦은 = (경로: string, 본: Set<string>): number => {
    const f = 표.get(경로);
    if (f === undefined || 본.has(경로)) return 0;
    if (메모.has(경로)) return 메모.get(경로)!;
    본.add(경로);
    const 가져옴 = [...f.글.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map((m) => normalize(join(dirname(경로), m[1]!)).replace(/\.js$/, ''));
    const 값 = Math.max(f.때, ...가져옴.map((p) => 늦은(p.endsWith('.ts') ? p : `${p}.ts`, 본)));
    메모.set(경로, 값);
    return 값;
  };
  return Object.fromEntries(파일들.filter((f) => f.경로.endsWith('.spec.ts')).map((f) => [f.경로, 늦은(f.경로, new Set())]));
}

interface 묶음글 {
  file?: unknown;
  specs?: { tests?: { projectName?: unknown; status?: unknown }[] }[];
  suites?: 묶음글[];
}
interface 결과글 {
  config?: { workers?: unknown };
  stats?: { startTime?: unknown };
  suites?: 묶음글[];
}

/**
 * 끝의 전체 3회가 규칙대로 돌았는지 — 아니면 PR 본문 머리에 실을 경고 한 줄, 맞으면 null.
 * 올리기는 막지 않는다(막으면 다 만든 케이스를 통째로 못 쓴다 · 2026-10-03 게이트 0). 사람이 반영 전에 본다.
 *
 * - `결과들` — 덩어리마다 json 글 하나. 자식 명령 하나가 최대 10분이라 하나씩 차례로 나눠 돌 수 있다
 * - `케이스수정` — 폴더의 케이스 파일(testDir 기준 `mkt/MKT-UI-001.spec.ts` — 결과의 최상위 `suites[].file` 과 같은 꼴)마다
 *   그 파일과 그것이 쓰는 Page Object 의 가장 늦은 수정 시각. `specs[].file` 은 kit 런타임 파일이라 쓰지 않는다(2026-10-03 실측)
 *
 * **파일마다 그 파일이 든 가장 늦게 시작한 결과로 본다** — 고친 파일만 뒤에 다시 돌리는 절차(SKILL 관문 3)를 그대로 받아들이려고.
 * 그 결과에서 데스크톱 3회 · 실패 0 · 고친 뒤에 시작했는지를 본다. 케이스 하나 = 테스트 하나(`catalog/rules.ts`) · 보류의 skipped 도 센다.
 * 결과 파일은 자식이 쓴다 — 고의로 꾸미면 못 잡는다. 품질 사고를 막는 장치이지 보안 장치가 아니다.
 */
export function 끝전체3회경고(결과들: string[], 케이스수정: Record<string, number>): string | null {
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

  // 파일 → 결과마다 (시작 시각, 데스크톱 상태들). 하위 묶음(describe)은 위 파일 이름을 물려받는다
  const 파일결과 = new Map<string, { 시작: number; 상태들: unknown[] }[]>();
  읽은것.forEach((r) => {
    const 시작 = Date.parse(String(r.stats?.startTime));
    const 모으기 = (묶음: 묶음글, 파일: string, 상태들: unknown[]) => {
      for (const spec of 묶음.specs ?? []) for (const t of spec.tests ?? []) if (t.projectName === 'desktop') 상태들.push(t.status);
      for (const 안 of 묶음.suites ?? []) 모으기(안, 파일, 상태들);
    };
    for (const 묶음 of r.suites ?? []) {
      if (typeof 묶음.file !== 'string') continue;
      const 상태들: unknown[] = [];
      모으기(묶음, 묶음.file, 상태들);
      if (상태들.length > 0) 파일결과.set(묶음.file, [...(파일결과.get(묶음.file) ?? []), { 시작, 상태들 }]);
    }
  });

  let 빠진 = 0;
  let 어긋난 = 0;
  let 실패 = 0;
  let 낡은 = 0;
  for (const [파일, 수정] of Object.entries(케이스수정)) {
    const 후보 = 파일결과.get(파일);
    if (후보 === undefined) {
      빠진 += 1;
      continue;
    }
    const 마지막 = 후보.reduce((a, b) => (b.시작 > a.시작 ? b : a));
    if (마지막.상태들.length !== 3) 어긋난 += 1;
    실패 += 마지막.상태들.filter((s) => s === 'unexpected').length;
    if (!Number.isFinite(마지막.시작) || 마지막.시작 < 수정) 낡은 += 1;
  }
  if (빠진 > 0) 까닭들.push(`빠진 파일 ${빠진}개`);
  if (어긋난 > 0) 까닭들.push(`3회가 아닌 파일 ${어긋난}개`);
  if (실패 > 0) 까닭들.push(`실패 ${실패}회`);
  if (낡은 > 0) 까닭들.push(`마지막 실행 뒤에 고친 파일 ${낡은}개`);

  return 까닭들.length === 0 ? null : 경고(까닭들.join(' · '));
}
