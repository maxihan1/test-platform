// 원장 껍데기 — 자식을 띄우기 전에 원장 사본을 쓰고, 올린 뒤 표의 임시 번호를 바꿔 적는다. 판단은 authoring-ledger · authoring-prd 의 순수 함수에 있다
// 작성의 원장은 표준 기획서 항목이다 — 원본 자료의 원장은 옮기기 대조에만 쓴다 (도메인/작성 §3.6 「작성은 표준 기획서만 읽는다」)

import { lstatSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import type { PrdItem } from '@platform/kit/types';

import { TCID } from '../apps/admin/src/catalog/rules.js';
import type { 읽을자료 } from './authoring-assets.js';
import { type 원장, 번호바꾸기, 번호찾기, 원장만들기 } from './authoring-ledger.js';
import { type 기준결정, tcId들, 사람이뺀번호, 요구줄들, 제외번호들 } from './authoring-ledger-check.js';
import { 표tcId들 } from './authoring-conflicts.js';
import { 경고줄 } from './authoring-design-check.js';
import { 케이스파일들 } from './authoring-progress.js';
import { type 표줄, 칸재료만들기 } from './authoring-slots.js';
import { type 이어작성입력, 남은번호, 이어작성막힘, 이어작성사본이름 } from './authoring-continue.js';
import { 옛번호지도, 옮긴것읽기, 임시꼴, 판합치기, 표준원장 } from './authoring-prd.js';
import type { 원장입력 } from './authoring-prompt.js';

export const 원장사본이름 = 'ledger.json';
/** 원본 자료의 원장 사본 — 자식이 표준 기획서 항목 근거(`ref`)에 원본 번호를 적을 때 본다 */
export const 원본원장사본이름 = 'source-ledger.json';
/** 자식이 원장 사본을 다시 만들 재료 — 기준(main) 표 */
export const 기준재료이름 = 'ledger-base.json';

/** 기준(main) 판의 요구사항 표와 그 서비스 케이스 tcId 들 */
export interface 기준표 {
  표글: string;
  있는케이스: Set<string>;
}

/** 링크 · 특수 파일은 안 읽는다 — 자료 폴더는 자식 uid 것이고 이어받은 폴더는 앞 자식이 만졌다. 못 읽으면 null */
function 안전히읽기(경로: string): string | null {
  const 정보 = lstatSync(경로, { throwIfNoEntry: false });
  return 정보?.isFile() === true ? readFileSync(경로, 'utf8') : null;
}

/**
 * **root 가 자식 폴더에 쓴다** — 자식이 심은 링크(`ledger.json` → root 파일)를 따라가지 않게 먼저 지우고 새로 만든다(`wx` — 있으면 실패).
 * 쓰는 동안 자식은 떠 있지 않다(띄우기 전 · 거둔 뒤) — 사이에 다시 심을 프로세스가 없다 (2026-09-30 보안 검토)
 */
export function 새로쓰기(경로: string, 글: string): boolean {
  try {
    rmSync(경로, { force: true, recursive: true });
    writeFileSync(경로, 글, { mode: 0o644, flag: 'wx' });
    return true;
  } catch {
    return false;
  }
}

/** 기준(main) 판의 표 · 케이스로 대조에 넘길 것을 만든다. 표를 못 읽었으면(null) 칸 재료가 없다 — 쓰인 번호를 모르고 매기면 남의 케이스 파일을 덮어쓴다 */
export function 기준결정만들기(
  기준: (기준표 & { 접두사: string }) | null,
  원장번호들: string[],
  옛번호?: ReadonlyMap<string, readonly string[]>,
): 기준결정 {
  if (기준 === null) return { 사람이뺌: new Set(), 다음요청: new Set(), 칸재료: null };
  // 요구 줄 tcId 도 넣는다 — 표tcId들 은 백틱 칸을 못 본다. 「제거함(…)」 안 번호도 쓰인 번호다
  const 줄tcId = 요구줄들(기준.표글).map((줄) => /^제거함\((.+)\)$/.exec(줄.tcId)?.[1] ?? 줄.tcId).filter((t) => TCID.test(t));
  const 쓰인 = new Set([...표tcId들(기준.표글), ...줄tcId, ...기준.있는케이스]);
  return {
    사람이뺌: 사람이뺀번호(기준.표글),
    다음요청: 제외번호들(기준.표글, '다음 요청'),
    칸재료: 칸재료만들기(기준.접두사, 요구줄들(기준.표글), 쓰인, 원장번호들, 옛번호),
  };
}

/**
 * 출처가 원본 번호뿐인 요구 줄 — 표준 기획서 전에 만든 표(옛 표)의 줄이다. 번호 없는 줄은 모른다 (§3.6 「★ 표준 기획서」 「기존 서비스」).
 * 「제거함(…)」 줄은 지운 케이스의 기록이라 옛 줄로 안 센다 — 갈아쓸 때도 남는다
 */
export function 옛줄들(표글: string, 접두사: string): 표줄[] {
  const 새꼴 = new RegExp(`^${접두사}-(?:REQ|NEW)-\\d+$`);
  return 요구줄들(표글).filter((줄) => {
    if (줄.tcId.startsWith('제거함(')) return false;
    const 번호들 = 번호찾기(줄.출처).번호들;
    return 번호들.length > 0 && !번호들.some((n) => 새꼴.test(n));
  });
}

/**
 * 옛 표를 옮긴 요청의 PR 머리 줄 — 옛 케이스 번호 가운데 새 표가 물려받은 수 · 새 표에 남은 옛 출처 줄 · 새 표에 없는데 남은 옛 케이스 파일.
 * 지우지 않고 보이기만 한다 — 자식이 표를 덜 쓰고 끝났을 때 에이전트가 케이스를 무더기로 지우지 않게. 기준 표에 옛 줄이 없으면 빈 목록이다
 */
export function 옛표줄들(트리: string, 서비스: string, 폴더: string, 기준표글: string): string[] {
  try {
    return 옛표셈(트리, 서비스, 폴더, 기준표글);
  } catch (e) {
    // 보이기만 하는 줄이다 — 서버에 판을 올린 뒤라 여기서 던지면 다 된 올리기가 거절이 된다
    return [`⚠️ 옛 표 셈을 못 했다 — ${e instanceof Error ? e.message : String(e)}`];
  }
}

function 옛표셈(트리: string, 서비스: string, 폴더: string, 기준표글: string): string[] {
  const 옛번호 = new Set(옛줄들(기준표글, 서비스).map((줄) => 줄.tcId).filter((t) => TCID.test(t)));
  if (옛번호.size === 0) return [];
  const 새표글 = 안전히읽기(join(트리, 'docs', 'cases', `${서비스}.md`)) ?? '';
  const 남은옛줄 = 옛줄들(새표글, 서비스);
  const 옛자리 = new Set(남은옛줄.map((줄) => 줄.차례));
  const 새번호 = new Set(요구줄들(새표글).filter((줄) => !옛자리.has(줄.차례)).map((줄) => 줄.tcId));
  const 파일번호 = new Set([...케이스파일들(join(트리, 'tests', 폴더))].map((p) => basename(p, '.spec.ts')));
  const 물려받음 = [...옛번호].filter((t) => 새번호.has(t)).length;
  return [
    `옛 표 옮김: 옛 케이스 ${String(옛번호.size)} 중 번호 물려받음 ${String(물려받음)} · 새 표에 없음 ${String(옛번호.size - 물려받음)}`,
    ...경고줄('옛 출처(원본 번호) 줄이 남음', 남은옛줄.map((줄) => `요구 ${String(줄.차례 + 1)}`), 10),
    ...경고줄('새 표에 없는데 안 지운 옛 케이스 파일', [...옛번호].filter((t) => !새번호.has(t) && 파일번호.has(t)).sort(), 10),
  ];
}

/**
 * 작성의 원장 사본 — 지금 판에 (있으면) 자식의 결과 파일을 합친 항목으로 만든다. 에이전트(띄우기 전 · 이어받기)와
 * 자식의 `npm run prd:ledger` 가 이 함수 하나를 쓴다 — 같은 판 · 같은 결과 파일이면 같은 원장 · 같은 칸 재료다.
 * 기준 표의 결정 · 칸 재료를 같이 싣는다 — 자식의 관문 0 · 번호 명령이 에이전트의 올리기 판정과 같은 재료를 쓴다 (2026-09-30 · 2026-10-04 게이트 1)
 */
export function 표준원장사본(
  지금: readonly PrdItem[],
  옮긴몸: unknown,
  접두사: string,
  기준: 기준표 | null,
): { 원장: 원장 | { 없음: string }; 기준: 기준결정; 글: string } {
  const 옮긴 = 옮긴몸 === undefined ? null : 옮긴것읽기(옮긴몸, 접두사);
  const 항목들 = 옮긴 === null || '사유' in 옮긴 ? 지금 : 판합치기(지금, 옮긴).items;
  const 원장값 = 표준원장(항목들);
  const 결정 = 기준결정만들기(기준 === null ? null : { ...기준, 접두사 }, '없음' in 원장값 ? [] : 원장값.항목.map((h) => h.번호), 옛번호지도(항목들));
  const 사본 = '없음' in 원장값 ? 원장값 : { 원장: 원장값, 사람이뺌: [...결정.사람이뺌], 다음요청: [...결정.다음요청], 칸재료: 결정.칸재료 };
  return { 원장: 원장값, 기준: 결정, 글: JSON.stringify(사본, null, 2) };
}

const 요약 = (r: 원장) => {
  const 가족 = Object.entries(r.가족).map(([k, n]) => `${k} ${String(n)}`).join(' · ');
  return `요구 ${String(r.항목.length)}${가족 === '' ? ' · 문단 모드' : ` · 번호 가족 ${가족}`}${r.빠진자료.length > 0 ? ` · 원장에 못 넣은 자료 ${r.빠진자료.join(' · ')}` : ''}`;
};

/**
 * 원본 자료의 원장 — **메모리에 든다**(옮기기 대조가 이것을 쓴다). 자식에게는 사본 경로만 준다 — 표준 기획서 항목의 근거 번호를 적을 때 본다.
 * 자식이 사본을 고쳐도 대조는 안 흔들린다. 사본을 못 쓰면 원장 없음으로 돈다
 */
export function 원본원장준비(계획: 읽을자료[], 자료폴더: string): { 원장: 원장 | { 없음: string }; 입력: 원장입력 } {
  const r = 계획.length === 0 ? { 없음: '화면만 — 원본 자료가 없다' } : 원장만들기(계획, 안전히읽기);
  if (!('원장' in r)) return { 원장: r, 입력: r };
  const 사본 = join(자료폴더, 원본원장사본이름);
  if (!새로쓰기(사본, JSON.stringify(r, null, 2))) return { 원장: r.원장, 입력: { 없음: '원본 원장 사본을 자료 폴더에 못 썼다' } };
  return { 원장: r.원장, 입력: { 사본, 요약: 요약(r.원장) } };
}

/**
 * git 이 추적하는 파일 목록에서 그 서비스 케이스 파일(하위 폴더 포함)만 골라 글을 읽는다 — 폴더를 직접 훑으면
 * 커밋에 안 들어가는 파일(무시 목록 · 링크 폴더 밑)로 대조를 넘을 수 있다 (2026-09-30 보안 검토). `읽기` 는 모양 검사 붙은 손이다
 */
export function 케이스글들(추적파일: string[], 폴더: string, 읽기: (상대경로: string) => string): string[] {
  return 추적파일.filter((f) => f.startsWith(`tests/${폴더}/`) && f.endsWith('.spec.ts')).map(읽기);
}

/** 사본에서 git 한 번 — 사본 환경(`GIT_DIR` 은 bare) 으로 치는 손을 받는다. 검사는 가짜 손을 넣는다 */
export type 깃손 = (인자: string[]) => { ok: boolean; 낸것: string; 까닭?: string };

/**
 * 기준(main) 판의 요구사항 표와 그 서비스 케이스 tcId 들. **트리가 아니라 기준 SHA 에서 읽는다** — 이어받은 트리는 앞 실행이 바꿨을 수 있다.
 * 표가 없으면(처음 작성하는 서비스) 빈 글이다. 그 밖의 git 실패는 까닭 — 빈 표로 뭉개면 이어 작성이 덮은 번호까지 다시 맡는다
 */
export function 기준읽기(깃: 깃손, 기준: string, 서비스: string, 폴더: string): 기준표 | { 까닭: string } {
  const 표 = `docs/cases/${서비스}.md`;
  const 목록 = 깃(['ls-tree', '-r', '-z', '--name-only', 기준, '--', 표, `tests/${폴더}`]);
  if (!목록.ok) return { 까닭: `기준 판의 파일 목록을 못 읽었다: ${목록.까닭 ?? ''}` };
  const 파일들 = 목록.낸것.split('\0').filter((f) => f !== '');
  const 읽기 = (f: string): string | { 까닭: string } => {
    const r = 깃(['show', `${기준}:${f}`]);
    return r.ok ? r.낸것 : { 까닭: `기준 판의 ${f} 를 못 읽었다: ${r.까닭 ?? ''}` };
  };
  let 표글 = '';
  if (파일들.includes(표)) {
    const 글 = 읽기(표);
    if (typeof 글 !== 'string') return 글;
    표글 = 글;
  }
  const 케이스글: string[] = [];
  for (const f of 케이스글들(파일들, 폴더, (x) => x)) {
    const 글 = 읽기(f);
    if (typeof 글 !== 'string') return 글;
    케이스글.push(글);
  }
  return { 표글, 있는케이스: tcId들(케이스글) };
}

/**
 * `docs` · `docs/cases` 가 링크 아닌 진짜 폴더이고 실제 경로가 트리 안인가. 트리는 자식 uid 폴더라
 * 자식이 그 자리를 트리 밖 폴더 링크로 바꿔 둘 수 있다. 마지막 이름만 지키면 root 가 트리 밖에 쓰고 지운다 (2026-10-04 계획 검토).
 * 아니면 까닭 글을 돌려준다
 */
function 폴더막힘(트리: string): string | null {
  try {
    for (const 마디 of [['docs'], ['docs', 'cases']]) {
      const 정보 = lstatSync(join(트리, ...마디), { throwIfNoEntry: false });
      if (정보 === undefined || !정보.isDirectory()) return `${마디.join('/')} 가 트리 안의 진짜 폴더가 아니다`;
    }
    return realpathSync(join(트리, 'docs', 'cases')) === join(realpathSync(트리), 'docs', 'cases') ? null : 'docs/cases 가 트리 밖을 가리킨다';
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/**
 * 올린 뒤 요구사항 표 출처 칸의 임시 번호를 서버가 준 번호로 바꿔 적는다 — 바뀐 파일 목록을 읽기 **전에** 불러야 커밋에 든다.
 * 표가 없으면 할 일이 없다(null). 못 쓰면 까닭 — 임시 번호가 남은 표는 올리지 않는다 (§3.6 「작성은 표준 기획서만 읽는다」).
 * 제자리에 쓴다 — 지우고 새로 만들면 root 파일이 돼 이어받은 자식이 표를 못 고친다. 그래서 링크 · 하드링크 · 트리 밖을 먼저 거른다(가리기와 같은 관례)
 */
export function 표번호바꾸기(트리: string, 서비스: string, 맞춤: ReadonlyMap<string, string>, 남김금지 = false): string | null {
  const 자리 = join(트리, 'docs', 'cases', `${서비스}.md`);
  const 정보 = lstatSync(자리, { throwIfNoEntry: false });
  if ((맞춤.size === 0 && !남김금지) || 정보 === undefined) return null;
  const 막힘 = 폴더막힘(트리) ?? (정보.isFile() && 정보.nlink === 1 ? null : '표가 일반 파일이 아니다');
  if (막힘 !== null) return `요구사항 표의 임시 번호를 못 바꿨다 — ${막힘}`;
  const 글 = readFileSync(자리, 'utf8');
  const 새글 = 번호바꾸기(글, 맞춤);
  if (새글 !== 글) writeFileSync(자리, 새글);
  // 올린 뒤에도 남은 임시 번호 — 결과 파일에 없는 번호를 표에 적었다. main 에 들어가면 다음 실행의 바꿔 적기가 그 글자를 엉뚱한 요구로 바꾼다 (2026-10-10 spec-review)
  const 남은 = 남김금지 ? [...new Set(번호찾기(새글).번호들.filter((n) => 임시꼴(서비스).test(n)))] : [];
  return 남은.length === 0 ? null : `요구사항 표에 받은 번호가 없는 임시 번호가 남았다 — ${남은.slice(0, 10).join(' · ')}. 결과 파일에 그 항목을 더하거나 표에서 고쳐라`;
}

/**
 * 자식을 띄우기 전 원장 준비 전부 — 기준 표 · 작성의 원장 사본 · 자식이 다시 만들 재료 · (옮기면) 원본 원장 · (이어 작성이면) 남은 번호.
 * 기준 표를 못 읽으면 보통 작성은 사람이 뺌 없이 돈다. 이어 작성은 막는다 — 남은 번호를 모르고 돌면 덮은 것까지 다시 맡는다
 */
export function 원장과남은번호(입력: {
  계획: 읽을자료[];
  자료폴더: string;
  깃: 깃손;
  기준: string;
  서비스: string;
  폴더: string;
  이어작성원본: number | null;
  /** 표준 기획서 지금 판 — 자식 앞에서 받은 것 */
  지금: readonly PrdItem[];
  /** 옮기는 요청인가 — 자료(또는 화면만)가 있고 이어 작성이 아니다 */
  옮긴다: boolean;
  /** 이어받은 폴더에 앞 자식이 쓴 결과 파일. 없으면 undefined */
  옮긴몸?: unknown;
}):
  | { 원장: 원장 | { 없음: string }; 입력: 원장입력; 기준: 기준결정; 기준표: 기준표 | null; 원본원장: 원장 | { 없음: string }; 원본입력: 원장입력; 이어작성?: 이어작성입력 }
  | { 막힘: string } {
  const 기준 = 기준읽기(입력.깃, 입력.기준, 입력.서비스, 입력.폴더);
  if ('까닭' in 기준) {
    if (입력.이어작성원본 !== null) return { 막힘: 기준.까닭 };
    console.error(`[작성] ${기준.까닭} — 기준 표의 「사람이 뺌」 · 「다음 요청」 · 칸 재료 없이 대조한다`);
  }
  const 기준값 = '까닭' in 기준 ? null : 기준;
  // 자식이 결과 파일을 고친 뒤 원장을 다시 만들 재료 — 판정은 에이전트 메모리의 것으로 한다(자식이 고쳐도 안 흔들린다)
  const 재료 = { 접두사: 입력.서비스, 기준표: 기준값 === null ? null : { 표글: 기준값.표글, 있는케이스: [...기준값.있는케이스] } };
  const 사본 = 표준원장사본(입력.지금, 입력.옮긴몸, 입력.서비스, 기준값);
  const 사본자리 = join(입력.자료폴더, 원장사본이름);
  const 못씀 = !새로쓰기(join(입력.자료폴더, 기준재료이름), JSON.stringify(재료)) || !새로쓰기(사본자리, 사본.글);
  const 원본 = 입력.옮긴다 ? 원본원장준비(입력.계획, 입력.자료폴더) : { 원장: { 없음: '옮기지 않는 요청이다' }, 입력: { 없음: '옮기지 않는 요청이다' } };
  // 옛 표 — 옮기는 요청이면 자식이 표를 표준 기획서 번호로 새로 쓴다. tcId 는 칸 재료가 물려준다 (§3.6 「기존 서비스」)
  const 옛줄 = 기준값 !== null && 입력.옮긴다 ? 옛줄들(기준값.표글, 입력.서비스).length : 0;
  const 옛 = 옛줄 > 0 ? { 옛줄 } : {};
  const r = {
    원장: 사본.원장,
    // 사본을 못 쓰면 자식은 원장 없이 돈다 — 판정은 메모리의 원장으로 그대로 한다.
    // 옮기는 요청은 판이 비어도 사본 자리를 준다 — 자식이 옮긴 뒤 다시 만들어 그 원장으로 표를 쓴다(「원장 없음」이면 관문 0 을 건너뛴다)
    입력: 못씀
      ? { 없음: '원장 사본을 자료 폴더에 못 썼다' }
      : '없음' in 사본.원장
        ? 입력.옮긴다 ? { 사본: 사본자리, 요약: `${사본.원장.없음} — 옮긴 뒤 다시 만든다`, ...옛 } : 사본.원장
        : { 사본: 사본자리, 요약: 요약(사본.원장), ...옛 },
    기준: 사본.기준,
    기준표: 기준값,
    원본원장: 원본.원장,
    원본입력: 원본.입력,
  };
  if (입력.이어작성원본 === null || 기준값 === null) return r;
  const 남은 = '없음' in r.원장 ? [] : 남은번호(r.원장, 기준값.표글, 기준값.있는케이스, r.기준);
  const 막힘 = 이어작성막힘(r.원장, 남은);
  if (막힘 !== null) return { 막힘 };
  const 남은자리 = join(입력.자료폴더, 이어작성사본이름);
  if (!새로쓰기(남은자리, JSON.stringify({ 원본: 입력.이어작성원본, 남은 }, null, 2))) return { 막힘: '남은 번호 사본을 자료 폴더에 못 썼다' };
  return { ...r, 이어작성: { 원본: 입력.이어작성원본, 남은, 사본: 남은자리 } };
}
