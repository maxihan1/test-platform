// 작성 폰 돌려 보기를 팜 폰 여러 대로 나눈다 — 폰마다 계정 · 혼자 도는 케이스 · 빨간 케이스 다시 보기 · 덤 폰 잡기 (SPEC 도메인/작성 §3.6 「앱 화면」 「폰 여러 대로 나눠 돌린다」)
// 11-16 MTA #15522 는 543분 가운데 476분을 폰 한 대에서 케이스를 차례로 돌리는 데 썼다. 돌리는 쪽은 authoring-run3-game `폰실행`, 팜 부르기는 authoring-phone-farm 이다

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { 기본역할, 출처 } from '@platform/kit/accounts';

import { type 돌린판, 닿는파일, 앱케이스나누기, 케이스파일읽기, 살필케이스 } from './authoring-gate3.js';
import { 바로닿는파일 } from './authoring-reach.js';
import { 동시계정번호, 일회용역할 } from './authoring-roles.js';

type 계정줄 = { baseUrl?: unknown; role?: unknown; loginId?: unknown; loginPassword?: unknown };

function 계정줄들(글: string | undefined): 계정줄[] {
  try {
    const 값: unknown = JSON.parse(글 || '[]');
    return Array.isArray(값) ? 값.filter((a): a is 계정줄 => typeof a === 'object' && a !== null) : [];
  } catch {
    return [];
  }
}

const 찬계정 = (a: 계정줄) => typeof a.loginId === 'string' && a.loginId !== '' && typeof a.loginPassword === 'string' && a.loginPassword !== '';

/**
 * 이 앱 줄에서 나눠 쓸 계정 번호 — 1 은 원래 일반 회원, 그 뒤는 같은 줄의 「일반 회원 N」(아이디 · 비밀번호가 다 있고 앞에서 고른 계정과 아이디가 다를 때만).
 * 원래 일반 회원이 없으면 [1] 하나다 — 나눌 기준 계정이 없다
 */
export function 계정번호들(계정글: string | undefined, 주소: string): number[] {
  const 줄 = 계정줄들(계정글).filter((a) => 출처(a.baseUrl) === 출처(주소) && 찬계정(a));
  const 원래 = 줄.find((a) => a.role === 기본역할);
  if (원래 === undefined) return [1];
  // 같은 아이디는 한 번만 — 「일반 회원 2」와 「일반 회원 3」이 같은 계정이면 두 폰이 한 계정으로 돈다
  const 본아이디 = new Set([원래.loginId]);
  const 번호들: number[] = [];
  for (const a of 줄.map((x) => ({ x, n: typeof x.role === 'string' ? 동시계정번호(x.role) : null })).sort((l, r) => (l.n ?? 0) - (r.n ?? 0))) {
    if (a.n === null || 본아이디.has(a.x.loginId) || 번호들.includes(a.n)) continue;
    본아이디.add(a.x.loginId);
    번호들.push(a.n);
  }
  return [1, ...번호들];
}

/** k 번 묶음이 kit 에 넘길 계정 글 — 그 줄의 일반 회원 자리에 「일반 회원 k」 계정을 넣는다. 1 이거나 그 계정이 없으면 그대로 */
export function 묶음계정글(계정글: string | undefined, 주소: string, k: number): string | undefined {
  if (k === 1) return 계정글;
  const 줄들 = 계정줄들(계정글);
  const 같은줄 = (a: 계정줄) => 출처(a.baseUrl) === 출처(주소);
  const 원래 = 줄들.find((a) => 같은줄(a) && a.role === 기본역할 && 찬계정(a));
  // 계정번호들과 같은 줄을 고른다 — 빈 줄 · 원래와 같은 아이디가 먼저 있어도 건너뛴다
  const 덤 = 줄들.find((a) => 같은줄(a) && 찬계정(a) && a.loginId !== 원래?.loginId && typeof a.role === 'string' && 동시계정번호(a.role) === k);
  if (덤 === undefined) return 계정글;
  return JSON.stringify([{ ...덤, role: 기본역할 }, ...줄들.filter((a) => !(같은줄(a) && a.role === 기본역할))]);
}

/**
 * 일반 회원 · 일회용 · 폰마다 계정 밖의 역할(관리자 같은)을 쓰는 케이스 — 서버 전체를 바꿀 수 있어 다른 폰이 쉴 때 혼자 돈다.
 * 케이스 글자의 `account: '<역할>'` 로 본다 — 작성 규칙이 역할을 글자로 적게 한다(`tpx-cases` 5-writing). 상수로 적은 역할은 못 본다
 */
export function 혼자도나(글: string): boolean {
  return [...글.matchAll(/\baccount:\s*(['"`])(.*?)\1/g)].some(([, , 역할 = '']) => {
    const r = 역할.trim();
    return r !== '' && r !== 기본역할 && !일회용역할.test(r) && 동시계정번호(r) === null;
  });
}

/** 기록 이름 — 어느 폰 · 몇 번 계정으로 돌았는지 이름에 싣는다. 나란히 도는 묶음이 같은 번호를 나눠 쓴다 */
export const 묶음기록이름 = (머리: string, 번호: number, 폰: string, 계정: number): string => `${머리}-${번호}~${폰}~${계정}`;

/** 기록 이름에서 폰 · 계정. 이 꼴 전의 기록(`gate3-app-3.json`)은 폰을 모르고 원래 계정이다 */
export function 기록자리(기록: string): { 폰: string | null; 계정: number } {
  const 맞음 = /~([A-Za-z0-9._:-]{1,64})~(\d{1,2})\.json$/.exec(기록);
  return 맞음 === null ? { 폰: null, 계정: 1 } : { 폰: 맞음[1]!, 계정: Number(맞음[2]) };
}

/** 같은 머리 기록 가운데 다음 번호 — 옛 꼴 · 새 꼴 · 끊겨 버린 기록을 다 센다 */
export function 다음기록번호(이름들: readonly string[], 머리: string): number {
  const 꼴 = new RegExp(`^${머리}-(\\d+)(?:~[^/]*)?\\.json`);
  return Math.max(0, ...이름들.map((n) => Number(꼴.exec(n)?.[1] ?? 0))) + 1;
}

export interface 한판 {
  폰: string | null;
  계정: number;
  빨강: boolean;
  시작: number;
  오류: string | null;
}

/** 고친 뒤(수정 시각 뒤) 돈 판들 */
export const 한판들 = (판들: readonly 돌린판[] | undefined, 수정: number): 한판[] =>
  (판들 ?? []).filter((p) => Number.isFinite(p.시작) && p.시작 >= 수정).map((p) => ({ ...기록자리(p.기록), 빨강: p.상태들.includes('unexpected'), 시작: p.시작, 오류: p.오류 }));

export type 판정 =
  | { 상태: '안돎' }
  | { 상태: '초록' }
  | { 상태: '빨강'; 오류: string }
  | { 상태: '폰차이'; 빨간폰들: string[]; 오류: string }
  | { 상태: '계정차이'; 계정: number; 오류: string }
  | { 상태: '다시'; 계정: number; 뺄폰: string | null };

/**
 * 한 케이스의 지금 판정. 빨갛게 돈 것은 두 번까지 다시 본다 —
 * ① 같은 계정으로 다른 폰: 초록이면 「폰차이」(빨강으로 센다 — 도우미가 그 폰 화면 갈래를 타야 한다).
 * ② 거기서도 빨갛고 「일반 회원 N」으로 돌았으면 원래 계정으로: 초록이면 「계정차이」(케이스 탓이 아니라 그 계정에 시드가 없다 — 빨강으로 안 센다).
 * 지금 다른 폰이 없거나 그 계정을 못 쓰면 ①을 건너뛴다. 끝 검사는 폰도 계정도 없이 불러 남은 「다시」를 빨강으로 본다
 */
export function 판정하기(돈것: readonly 한판[], 있는폰들: readonly string[], 계정들: readonly number[]): 판정 {
  // 같은 폰 · 같은 계정으로 또 돌았으면 늦은 것만 본다 — 다시 돌려 초록이면 빨강이 아니다
  const 늦은것 = new Map<string, 한판>();
  for (const p of 돈것) {
    const 열쇠 = `${p.폰 ?? ''}\0${p.계정}`;
    if ((늦은것.get(열쇠)?.시작 ?? -Infinity) <= p.시작) 늦은것.set(열쇠, p);
  }
  const 판들 = [...늦은것.values()];
  if (판들.length === 0) return { 상태: '안돎' };
  const 빨간 = 판들.filter((p) => p.빨강);
  if (빨간.length === 0) return { 상태: '초록' };
  const 오류 = (p: 한판) => p.오류 ?? '오류 글 없음';
  // 이 꼴 전 기록은 어느 폰인지 모른다 — 다른 폰으로 세지 않는다(같은 폰이었을 수 있다)
  const 다른폰인가 = (a: string | null, b: string | null) => a !== null && b !== null && a !== b;
  for (const r of 빨간) {
    if (판들.some((p) => !p.빨강 && p.계정 === r.계정 && 다른폰인가(p.폰, r.폰))) {
      const 빨간폰들 = [...new Set(빨간.filter((p) => p.계정 === r.계정 && p.폰 !== null).map((p) => p.폰!))];
      return { 상태: '폰차이', 빨간폰들, 오류: 오류(r) };
    }
  }
  if (판들.some((p) => !p.빨강 && p.계정 === 1) && 빨간.every((p) => p.계정 !== 1)) {
    const r = 빨간.at(-1)!;
    return { 상태: '계정차이', 계정: r.계정, 오류: 오류(r) };
  }
  const r = 빨간.reduce((a, b) => (b.시작 > a.시작 ? b : a));
  const 다른폰 = 있는폰들.some((p) => p !== r.폰);
  // 어느 계정으로든 다른 폰에서 이미 빨갰으면 폰 탓이 아니다 — 폰 다시 보기는 한 폰에서만 돈 케이스만
  if (다른폰 && 계정들.includes(r.계정) && !판들.some((p) => 다른폰인가(p.폰, r.폰))) return { 상태: '다시', 계정: r.계정, 뺄폰: r.폰 };
  if (r.계정 !== 1 && !판들.some((p) => p.계정 === 1)) return { 상태: '다시', 계정: 1, 뺄폰: null };
  return { 상태: '빨강', 오류: 오류(r) };
}

/**
 * 폰에서 돌릴 케이스 — 이번에 쓰거나 고친 케이스(`바뀐` 에 든 것)는 다 돌고, 바뀐 도우미로만 닿은 기존 케이스는 표본만 돈다(2026-11-16 사용자 「표본만」).
 * 표본은 「바뀐 파일 · 화면」 짝마다 1개 — 화면은 그 케이스가 바로 가져다 쓰는 Page Object · Component 다(도우미 너머 화면은 안 센다). 화면을 바로 안 쓰는 케이스는 「화면 없음」 한 칸이다.
 * 이번 케이스가 이미 지나는 짝은 더 안 고른다. 앞서 폰에서 빨갰던 기존 케이스(`꼭`)는 짝과 상관없이 돈다 — 빨강이 조용히 사라지지 않게.
 * 이미 돈 기존 케이스(`돈것`)를 먼저 표본으로 써서 부를 때마다 표본이 바뀌어 다시 도는 일을 줄인다. #15526 은 새 케이스 71개에 화면 부품을 고쳐 392개를 골라 열 시간이 넘었다
 */
export function 표본고르기(
  케이스들: readonly string[],
  바뀐: ReadonlySet<string>,
  닿음: (파일: string) => string[],
  바로: (파일: string) => string[],
  고름: { 꼭?: (파일: string) => boolean; 돈것?: (파일: string) => boolean } = {},
): { 표본: string[]; 뺀: string[] } {
  const 화면꼴 = /(^|\/)(pages|components)\//;
  const 짝들 = (f: string) => {
    const 화면들 = 바로(f).filter((p) => 화면꼴.test(p));
    return 닿음(f)
      .filter((p) => p !== f && 바뀐.has(p))
      .flatMap((h) => (화면들.length === 0 ? [''] : 화면들).map((s) => `${h}\0${s}`));
  };
  const 새것 = [...케이스들].filter((f) => 바뀐.has(f)).sort();
  const 덮은 = new Set(새것.flatMap(짝들));
  const 차례 = (f: string) => (고름.꼭?.(f) ? 0 : 고름.돈것?.(f) ? 1 : 2);
  const 기존 = [...케이스들].filter((x) => !바뀐.has(x)).sort((a, b) => 차례(a) - 차례(b) || a.localeCompare(b));
  const 표본: string[] = [];
  const 뺀: string[] = [];
  for (const f of 기존) {
    const 새짝 = 짝들(f).filter((k) => !덮은.has(k));
    if (새짝.length === 0 && 차례(f) !== 0) {
      뺀.push(f);
      continue;
    }
    for (const k of 새짝) 덮은.add(k);
    표본.push(f);
  }
  return { 표본: [...새것, ...표본].sort(), 뺀: 뺀.sort() };
}

/**
 * 이번 작성이 닿은 폰 케이스(android 선언)와 그 케이스 · 부품 가운데 가장 늦은 수정 시각 — 웹 돌려 보기 · 끝 검사와 같은 함수로 고른다.
 * 이번에 쓰거나 고친 케이스는 다 돌고, 바뀐 도우미로만 닿은 기존 케이스는 표본만 돈다(`표본고르기` — 뺀 것은 `뺀기존`)
 */
export function 폰고르기(트리: string, 폴더: string, 바뀐: readonly string[], 판들?: Map<string, 돌린판[]>): { 대상: Record<string, number>; 뺀기존: string[] } {
  const 케이스들 = 케이스파일읽기(트리, 폴더);
  const 바뀐테스트 = new Set(바뀐.filter((p) => p.startsWith('tests/')).map((p) => p.slice('tests/'.length)));
  const 볼것 = 살필케이스(케이스들, 바뀐테스트);
  // 앞서 폰에서 빨갰던 기존 케이스는 꼭 돌고, 고친 뒤 이미 돈 케이스를 표본으로 먼저 쓴다
  const 늦은 = (f: string) => (판들?.get(f) ?? []).reduce<돌린판 | undefined>((a, b) => (a === undefined || b.시작 > a.시작 ? b : a), undefined);
  const { 표본, 뺀 } = 표본고르기(앱케이스나누기(케이스들, 볼것).앱, 바뀐테스트, 닿는파일(케이스들), 바로닿는파일(케이스들), {
    꼭: (f) => 늦은(f)?.상태들.includes('unexpected') === true,
    돈것: (f) => (늦은(f)?.시작 ?? -Infinity) >= (볼것[f] ?? Infinity),
  });
  return { 대상: Object.fromEntries(표본.map((f) => [f, 볼것[f]!])), 뺀기존: 뺀 };
}

/** 표본으로 뺀 기존 케이스 줄 — 끝 검사(⚠️ 머리)와 돌려 보기 출력이 같이 쓴다. 안 돈 것을 초록으로 세지 않게 수를 남긴다 */
export const 표본말 = (뺀수: number, 돌수: number, 갈래: string): string =>
  `⚠️ 도우미가 바뀌었는데 폰에서 안 돈 기존 ${갈래} 케이스 ${뺀수}개 — 「바뀐 파일 · 케이스가 바로 쓰는 화면」 짝마다 표본 1개만 돈다(돌릴 것 ${돌수}개). 정식 실행에서 처음 돈다`;

/** 돌려 보기 출력 — 빨강 · 폰 차이 · 계정 차이를 묶음마다 머리 한 줄과 파일 줄로 */
export function 판정말들(빨강: [string, 판정][], 폰차이: [string, 판정][], 계정차이: [string, 판정][], 이름: (폰: string) => string): string[] {
  const 묶음 = (머리: string, 것들: [string, 판정][], 줄: (f: string, p: 판정) => string) => (것들.length === 0 ? [] : [[머리, ...것들.map(([f, p]) => 줄(f, p))].join('\n')]);
  return [
    ...묶음(`빨강 ${빨강.length}건`, 빨강, (f, p) => `- ${f}: ${p.상태 === '빨강' ? p.오류 : ''}`),
    ...묶음(`폰 차이 ${폰차이.length}건 — 다른 폰에서는 초록이다. 도우미가 그 폰 화면 갈래를 타게 고친다(폰을 살펴보려면 지금 폰을 놓고 \`hold --udid <그 폰>\`)`, 폰차이, (f, p) =>
      p.상태 === '폰차이' ? `- ${f} (${p.빨간폰들.map((x) => `${이름(x)} ${x}`).join(' · ')} 에서만 빨강): ${p.오류}` : '',
    ),
    ...묶음(`계정 차이 ${계정차이.length}건 — 원래 계정으로는 초록이다. 케이스를 고치지 않는다 — 그 계정에 시드가 없을 수 있어 결과 요약에 적는다`, 계정차이, (f, p) =>
      p.상태 === '계정차이' ? `- ${f} (일반 회원 ${p.계정}): ${p.오류}` : '',
    ),
  ];
}

/** 이번에 돌릴 일 — 처음 도는 것은 계정 · 폰을 가리지 않고, 다시 보기는 계정이 정해지고 한 폰을 뺀다 */
export interface 일 {
  파일: string;
  계정: number | null;
  뺄폰: string | null;
  혼자: boolean;
}

export interface 묶음 {
  폰: string;
  계정: number;
  파일들: string[];
}

/**
 * 이번 차례 묶음 — 폰 하나에 계정 하나. 혼자 도는 케이스는 같이 도는 케이스가 다 끝난 뒤 폰 하나 · 원래 계정으로만 돈다.
 * 다시 보기가 많은 계정이 먼저 폰을 고르고, 그 계정의 다시 보기를 가장 많이 받는 폰을 고른다(같으면 앞 폰 — AI 가 잡은 폰이 맨 앞이다).
 * 처음 도는 케이스는 덜 찬 묶음에 하나씩. 묶음마다 `칸` 건까지다
 */
export function 묶음짜기(일들: readonly 일[], 폰들: readonly string[], 계정들: readonly number[], 칸: number): 묶음[] {
  const 같이 = 일들.filter((j) => !j.혼자);
  const 고를일 = 같이.length > 0 ? 같이 : 일들;
  const 쓸계정 = 같이.length > 0 ? 계정들 : [1];
  const 정해진 = (k: number) => 고를일.filter((j) => (j.계정 ?? 0) === k);
  const 차례 = [...쓸계정].sort((a, b) => 정해진(b).length - 정해진(a).length || a - b).slice(0, 폰들.length);
  const 남은폰 = [...폰들];
  const 묶음들: 묶음[] = 차례.map((k) => {
    const 받음 = (폰: string) => 정해진(k).filter((j) => j.뺄폰 !== 폰).length;
    const 폰 = 남은폰.reduce((a, b) => (받음(b) > 받음(a) ? b : a));
    남은폰.splice(남은폰.indexOf(폰), 1);
    return { 폰, 계정: k, 파일들: [] };
  });
  for (const j of 고를일.filter((j) => j.계정 !== null)) {
    const b = 묶음들.find((x) => x.계정 === j.계정 && x.폰 !== j.뺄폰 && x.파일들.length < 칸);
    b?.파일들.push(j.파일);
  }
  for (const j of 고를일.filter((j) => j.계정 === null)) {
    const b = 묶음들.filter((x) => x.파일들.length < 칸).sort((x, y) => x.파일들.length - y.파일들.length)[0];
    b?.파일들.push(j.파일);
  }
  return 묶음들.filter((b) => b.파일들.length > 0);
}

/** 이번에 더 잡을 폰 수 — 같이 도는 일이면 계정 수만큼(일보다 많이는 안), 다시 보기가 잡은 폰을 빼야 하면 적어도 하나. 잡은 폰이 끊겼으면 그 자리도 */
export function 덤폰수(일들: readonly 일[], 계정들: readonly number[], 주폰: string | null): number {
  const 같이 = 일들.filter((j) => !j.혼자);
  const 볼일 = 같이.length > 0 ? 같이 : 일들;
  if (볼일.length === 0) return 0;
  const 나란히 = 같이.length > 0 ? Math.min(계정들.length, 같이.length) : 1;
  const 뺌 = 볼일.some((j) => j.뺄폰 !== null && j.뺄폰 === 주폰) ? 1 : 0;
  return 주폰 === null ? 나란히 : Math.max(나란히 - 1, 뺌);
}

/** 결과를 못 낸 덤 폰 · 폰마다 계정 목록 — 결과 폴더 `phone-split-off.txt` 의 「폰 계정」 줄(없는 쪽은 -) */
const 끈묶음파일 = (결과폴더: string) => join(결과폴더, 'phone-split-off.txt');
export function 끈묶음읽기(결과폴더: string): { 폰들: Set<string>; 계정들: Set<number> } {
  const 줄들 = existsSync(끈묶음파일(결과폴더)) ? readFileSync(끈묶음파일(결과폴더), 'utf8').split('\n') : [];
  const 쌍 = 줄들.map((l) => l.trim().split(/\s+/)).filter((x) => x.length === 2);
  return { 폰들: new Set(쌍.map(([p]) => p!).filter((p) => p !== '-')), 계정들: new Set(쌍.map(([, k]) => Number(k)).filter((k) => k >= 2)) };
}
export function 끈묶음적기(결과폴더: string, 폰: string | null, 계정: number | null): void {
  if (폰 === null && 계정 === null) return;
  appendFileSync(끈묶음파일(결과폴더), `${폰 ?? '-'} ${계정 ?? '-'}\n`);
}
