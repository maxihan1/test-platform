// 돌려 본 결과 기록을 에이전트가 직접 판정한다 — 자식의 말이 아니라 Playwright json 결과로 (SPEC 도메인/작성 §3.6)

import { lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { type 파일글, 품질숫자, 품질줄 } from './authoring-quality.js';

const 결과상한 = 50 * 1024 * 1024;
const 케이스글상한 = 1024 * 1024;
const 깊이상한 = 20;

/** 마지막 전체 돌려 보기 기록 이름. 보조 AI 가 맡은 화면들을 3번 돌린 기록은 `gate3-part-<묶음>-<번호>.json` 이다 */
export const 끝기록꼴 = /^gate3-final.*\.json$/;
export const 돌린기록꼴 = /^gate3-(final|part-).*\.json$/;

/** 자식이 둔 링크 · 하드링크로 남의 파일을 읽지 않게 일반 파일 · nlink 1 · 폴더 안만 본다(산출물읽기와 같은 검사) */
function 안전한글(파일: string, 자리: string, 상한: number): string | null {
  const 정보 = lstatSync(파일, { throwIfNoEntry: false });
  if (정보 === undefined || !정보.isFile() || 정보.nlink !== 1 || 정보.size > 상한) return null;
  return realpathSync(파일) === join(realpathSync(자리), relative(자리, 파일)) ? readFileSync(파일, 'utf8') : null;
}

function 이름들(자리: string): string[] {
  try {
    return readdirSync(자리);
  } catch {
    return []; // 폴더가 없으면 기록이 없는 것이다 — 판정이 그렇게 적는다
  }
}

export interface 돌린기록 {
  이름: string;
  글: string;
}

/** `AUTHORING_GATE3_DIR` 의 돌려 본 기록. 못 읽은 파일은 깨진 글로 넘겨 판정이 「못 읽었다」로 적게 한다 */
export function 돌린기록들(결과폴더: string): 돌린기록[] {
  return 이름들(결과폴더)
    .filter((이름) => 돌린기록꼴.test(이름))
    .sort()
    .map((이름) => ({ 이름, 글: 안전한글(join(결과폴더, 이름), 결과폴더, 결과상한) ?? '{깨짐' }));
}

/** `tests/<폴더>` 아래 .ts 파일과 수정 시각(testDir 기준 경로). 링크 폴더는 lstat 이라 따라가지 않고 깊이도 묶는다 — 아주 깊은 폴더를 두면 재귀가 죽는다 */
export function 케이스파일읽기(트리: string, 폴더: string): (파일글 & { 때: number })[] {
  const 테스트 = join(트리, 'tests');
  const 파일들: (파일글 & { 때: number })[] = [];
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
  return 파일들;
}

/**
 * 작성 요약 머리에 싣는 줄 — 마지막 전체 돌려 보기 경고(있으면)와 품질 숫자. 자식이 끝난 뒤 root 가 읽는다.
 * `결과폴더` 는 자식의 `AUTHORING_GATE3_DIR` — 실행마다 새로 만들고, 끊긴 자리부터 다시 시작하면 앞 실행의 기록만 옮겨 온다(authoring-keeping).
 * `바뀐` 은 커밋한 뒤 기준과의 차이(저장소 기준 경로) — 그 파일에 닿는 케이스만 본다(살필케이스).
 * 부르는 쪽은 예외를 잡아 「끝 검사를 못 했다」로 적는다 — 이 검사로 올리기가 죽으면 안 된다
 */
export function 끝검사줄들(결과폴더: string, 트리: string, 폴더: string, 바뀐: readonly string[]): string[] {
  const 파일들 = 케이스파일읽기(트리, 폴더);
  const 바뀐테스트 = new Set([...바뀐].filter((p) => p.startsWith('tests/')).map((p) => p.slice('tests/'.length)));
  const 경고 = 끝돌려보기경고(돌린기록들(결과폴더), 살필케이스(파일들, 바뀐테스트));
  const 임시 = 남은임시도우미(파일들.map((f) => f.경로));
  return [...(경고 === null ? [] : [경고]), ...(임시 === null ? [] : [임시]), 품질줄(품질숫자(파일들))];
}

/** 보조가 모자란 도우미를 적어 둔 `helpers/draft-<묶음>.helper.ts` 가 남았나 — 자식이 합칠 때 공용으로 옮기고 지운다 (작성 §3.6 팬아웃, 2026-10-04). 옛 자리 `components/draft-*` 도 잡는다 — 진행 중인 작업이 거기 쓸 수 있다 */
export function 남은임시도우미(경로들: string[]): string | null {
  const 남은것 = 경로들.filter((p) => /(^|\/)(components|helpers)\/draft-[^/]*\.ts$/.test(p));
  return 남은것.length === 0 ? null : `⚠️ 공용으로 옮기지 않은 임시 도우미 ${남은것.length}개 — ${남은것.join(' · ')}`;
}

/** 올리기가 부르는 문 — 끝 검사가 예외를 던져도 올리기는 간다. 경고만 하고 막지 않는 장치다 (작성 §3.6) */
export function 끝검사(결과폴더: string, 트리: string, 폴더: string, 바뀐: readonly string[]): string[] {
  try {
    return 끝검사줄들(결과폴더, 트리, 폴더, 바뀐);
  } catch (e) {
    return [`⚠️ 끝 검사를 못 했다 — ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`];
  }
}

/**
 * 끝의 3회로 볼 케이스 파일마다, 그 파일과 그것이 가져다 쓰는 Page Object · Component · 도우미 가운데 가장 늦은 수정 시각.
 * 이번 작성이 바꾼 파일(`바뀐` — 기준과의 차이, testDir 기준 경로)에 닿는 케이스만 본다. 안 건드린 케이스는 앞 작성에서 3회를 통과했다 —
 * 반영 · 화면이 맞음 · 바뀐 화면 고치기가 케이스 1~4건을 고치고 폴더 전체 472 파일을 돌아 15~17분을 썼다(PRD-F9-13). 첫 작성은 다 바뀐 것이라 전체다
 */
export function 살필케이스(파일들: (파일글 & { 때: number })[], 바뀐: ReadonlySet<string>): Record<string, number> {
  const 표 = new Map(파일들.map((f) => [f.경로, f]));
  // 케이스마다 새로 따라간다 — 나눠 쓰는 메모는 import 가 돌면 덜 찬 집합을 남긴다(code-review).
  // 폴더 밖 파일(tests/<다른 폴더>)도 담는다 — 글을 못 읽어 그 너머는 못 따라가도 그 파일이 바뀌었으면 케이스를 본다
  const 닿음 = (시작: string): string[] => {
    const 본 = new Set<string>();
    const 갈곳 = [시작];
    for (let 경로 = 갈곳.pop(); 경로 !== undefined; 경로 = 갈곳.pop()) {
      if (본.has(경로)) continue;
      본.add(경로);
      for (const m of 표.get(경로)?.글.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g) ?? []) {
        const p = normalize(join(dirname(경로), m[1]!)).replace(/\.js$/, '');
        갈곳.push(p.endsWith('.ts') ? p : `${p}.ts`);
      }
    }
    return [...본];
  };
  return Object.fromEntries(
    파일들
      .filter((f) => f.경로.endsWith('.spec.ts'))
      .flatMap((f) => {
        const 닿은 = 닿음(f.경로);
        return 닿은.some((p) => 바뀐.has(p)) ? [[f.경로, Math.max(...닿은.map((p) => 표.get(p)?.때 ?? 0))] as const] : [];
      }),
  );
}

interface 시험글 {
  projectName?: unknown;
  status?: unknown;
  results?: { duration?: unknown; error?: { message?: unknown } }[];
}
interface 묶음글 {
  file?: unknown;
  specs?: { tests?: 시험글[] }[];
  suites?: 묶음글[];
}
interface 결과글 {
  config?: { workers?: unknown; metadata?: { slowApi?: unknown } };
  stats?: { startTime?: unknown };
  suites?: 묶음글[];
}

/** 한 파일 · 한 기기를 한 기록에서 돌린 것. 3번 돌렸으면 상태가 셋이다 */
export interface 돌린판 {
  기록: string;
  시작: number;
  느림: boolean;
  끝: boolean;
  상태들: unknown[];
  /** 돌린 회차마다 걸린 시간(ms) — 돌려 보기 명령이 다음 차례 길이를 어림한다 */
  시간들: number[];
  /** 빨간 회차의 첫 오류 줄 */
  오류: string | null;
}

/** 기록들을 `파일\0기기` 마다 돌린 판으로 모은다. 하위 묶음(describe)은 위 파일 이름을 물려받는다. 못 읽으면 null */
export function 판들읽기(기록들: 돌린기록[]): { 판들: Map<string, 돌린판[]>; 동시: unknown } | null {
  let 읽은것: (결과글 & { 이름: string })[];
  try {
    읽은것 = 기록들.map((r) => ({ ...(JSON.parse(r.글) as 결과글), 이름: r.이름 }));
  } catch {
    return null;
  }
  const 판들 = new Map<string, 돌린판[]>();
  for (const r of 읽은것) {
    const 끝 = 끝기록꼴.test(r.이름);
    const 머리 = { 기록: r.이름, 시작: Date.parse(String(r.stats?.startTime)), 느림: r.config?.metadata?.slowApi === true, 끝 };
    const 모으기 = (묶음: 묶음글, 담기: (t: 시험글) => void) => {
      for (const spec of 묶음.specs ?? []) for (const t of spec.tests ?? []) 담기(t);
      for (const 안 of 묶음.suites ?? []) 모으기(안, 담기);
    };
    for (const 묶음 of r.suites ?? []) {
      if (typeof 묶음.file !== 'string') continue;
      const 이번 = new Map<string, 돌린판>();
      모으기(묶음, (t) => {
        if (typeof t.projectName !== 'string') return;
        const 판 = 이번.get(t.projectName) ?? { ...머리, 상태들: [], 시간들: [], 오류: null };
        판.상태들.push(t.status);
        for (const 회 of t.results ?? []) if (typeof 회.duration === 'number') 판.시간들.push(회.duration);
        const 말 = t.results?.find((회) => typeof 회.error?.message === 'string')?.error?.message;
        if (판.오류 === null && t.status === 'unexpected' && typeof 말 === 'string') 판.오류 = 첫줄(말);
        이번.set(t.projectName, 판);
      });
      for (const [기기, 판] of 이번) 판들.set(`${묶음.file}\0${기기}`, [...(판들.get(`${묶음.file}\0${기기}`) ?? []), 판]);
    }
  }
  // 보조 AI 기록은 PC · 휴대폰을 한 번에 돌려 동시 둘이다 — 마지막 전체 돌려 보기 기록만 하나씩인지 본다
  return { 판들, 동시: 읽은것.filter((r) => 끝기록꼴.test(r.이름)).map((r) => r.config?.workers).find((w) => w !== 1) };
}

/** 색 글자를 빼고 첫 줄만 — 오류 글 전체는 길고 대화 토큰을 먹는다 */
function 첫줄(글: string): string {
  return (stripVTControlCharacters(글).split('\n').find((줄) => 줄.trim() !== '') ?? '').trim().slice(0, 200);
}

/** 한 파일 · 한 기기가 지금 판(마지막 수정 뒤)으로 어디까지 확인됐나 */
export interface 파일상태 {
  /** 돌린 기록이 하나라도 있다 */
  있음: boolean;
  /** 마지막 수정 뒤에 돌린 기록이 있다 */
  새것: boolean;
  /** 마지막 수정 뒤 · 응답 늦추기로 3번 다 초록(보류의 skipped 포함)인 기록이 있다 — 보조 AI 기록이든 마지막 기록이든 */
  셋: boolean;
  /** 마지막 수정 뒤 마지막 전체 돌려 보기 기록 가운데 가장 늦은 것 */
  끝판: 돌린판 | null;
}

export function 파일상태보기(판들: readonly 돌린판[] | undefined, 수정: number): 파일상태 {
  const 새것들 = (판들 ?? []).filter((p) => Number.isFinite(p.시작) && p.시작 >= 수정);
  const 끝들 = 새것들.filter((p) => p.끝);
  return {
    있음: (판들 ?? []).length > 0,
    새것: 새것들.length > 0,
    셋: 새것들.some((p) => p.느림 && p.상태들.length >= 3 && !p.상태들.includes('unexpected')),
    끝판: 끝들.length === 0 ? null : 끝들.reduce((a, b) => (b.시작 > a.시작 ? b : a)),
  };
}

/**
 * 마지막 전체 돌려 보기가 규칙대로 돌았는지 — 아니면 PR 본문 머리에 실을 경고 한 줄, 맞으면 null.
 * 올리기는 막지 않는다(막으면 다 만든 케이스를 통째로 못 쓴다 · 2026-10-03 게이트 0). 사람이 반영 전에 본다.
 *
 * - `기록들` — 마지막 전체 돌려 보기(`gate3-final*`) · 보조 AI(`gate3-part-*`) 기록. 명령 하나가 최대 10분이라 차례로 나눠 돈다
 * - `케이스수정` — 이번 작성이 닿은 케이스 파일(testDir 기준 `mkt/MKT-UI-001.spec.ts` — 결과의 최상위 `suites[].file` 과 같은 꼴 · 살필케이스)마다
 *   그 파일과 그것이 쓰는 Page Object 의 가장 늦은 수정 시각. `specs[].file` 은 kit 런타임 파일이라 쓰지 않는다(2026-10-03 실측)
 *
 * 파일마다 PC 만 본다(휴대폰 빨강은 자식이 고치거나 요약에 적는다). 마지막 수정 뒤에
 * ① 응답 늦추기로 3번 다 초록인 기록 하나(보조 AI 것이든 마지막 것이든)와 ② 마지막 전체 돌려 보기 기록 하나가 있어야 한다.
 * ②는 1번이면 된다 — 가끔만 빨개지는 케이스는 보조 AI 의 3번이 잡고(14632 에서 44개), 메인 3번은 「3번 다 빨강」만 냈다(#221 · #246 · 2026-10-19 사용자).
 * 실패 수는 ②의 가장 늦은 기록으로 센다. 케이스 하나 = 테스트 하나(`catalog/rules.ts`) · 보류의 skipped 도 센다.
 * 기록은 자식이 쓴다 — 고의로 꾸미면 못 잡는다. 품질 사고를 막는 장치이지 보안 장치가 아니다.
 */
export function 끝돌려보기경고(기록들: 돌린기록[], 케이스수정: Record<string, number>): string | null {
  const 경고 = (까닭: string) => `⚠️ 마지막 전체 돌려 보기가 규칙대로 돌지 않았다 — ${까닭}`;
  // 바꾼 케이스 · 부품이 없으면(표만 고친 작성) 돌릴 것이 없다
  if (Object.keys(케이스수정).length === 0) return null;
  if (기록들.length === 0) return 경고('돌려 본 기록이 없다');
  const 읽음 = 판들읽기(기록들);
  if (읽음 === null) return 경고('기록을 못 읽었다');

  const 까닭들: string[] = [];
  if (읽음.동시 !== undefined) 까닭들.push(`동시 ${String(읽음.동시)}개로 돌렸다`);
  const 셈 = { 빠진: 0, 낡은: 0, 셋없음: 0, 끝없음: 0, 실패: 0, 빠른: 0 };
  for (const [파일, 수정] of Object.entries(케이스수정)) {
    const 상태 = 파일상태보기(읽음.판들.get(`${파일}\0desktop`), 수정);
    if (!상태.있음) 셈.빠진 += 1;
    else if (!상태.새것) 셈.낡은 += 1;
    else {
      if (!상태.셋) 셈.셋없음 += 1;
      if (상태.끝판 === null) 셈.끝없음 += 1;
      else {
        셈.실패 += 상태.끝판.상태들.filter((s) => s === 'unexpected').length;
        if (!상태.끝판.느림) 셈.빠른 += 1;
      }
    }
  }
  if (셈.빠진 > 0) 까닭들.push(`돌려 보지 않은 파일 ${셈.빠진}개`);
  if (셈.낡은 > 0) 까닭들.push(`마지막으로 돌린 뒤에 고친 파일 ${셈.낡은}개`);
  if (셈.셋없음 > 0) 까닭들.push(`3번 다 초록인 기록이 없는 파일 ${셈.셋없음}개`);
  if (셈.끝없음 > 0) 까닭들.push(`마지막 전체 돌려 보기에서 빠진 파일 ${셈.끝없음}개`);
  if (셈.실패 > 0) 까닭들.push(`실패 ${셈.실패}회`);
  if (셈.빠른 > 0) 까닭들.push(`서버 응답을 늦추지 않고 돈 파일 ${셈.빠른}개`);
  return 까닭들.length === 0 ? null : 경고(까닭들.join(' · '));
}
