// 기준(main) SHA 의 파일로 화면 ↔ 케이스 지도를 세어 자료 폴더에 적는다 — 화면만 요청이 기획서 화면을 또 쓰지 않게(PRD-F6-03),
// 저장본과 달라진 화면을 쓰는 케이스만 돌려 보게(PRD-F6-04) (도메인/작성 §3.6 「기획서에 없는 화면 — 두 번째 작성」 · 「바뀐 화면 — 닿는 케이스만 다시 본다」)
// 지도 ① · ② 와 같은 함수로 잇는다. 표준 기획서 지금 판 번호 → 그 번호를 덮는 케이스 → 케이스가 가져오는 화면 파일 → 화면 주소 → 크롤러 같은 틀.
// DB 지도를 안 쓰는 까닭 — 지도는 스캔이 채우므로 병합 직후 「다시 스캔」 전이면 방금 병합한 첫 PR 의 케이스가 없다

import { join, posix } from 'node:path';

import { 지도줄들 } from '../apps/admin/src/catalog/reqMap.js';
import { 가져온화면파일, 화면주소 } from '../apps/admin/src/catalog/screenMap.js';
import { 주소틀 } from './authoring-crawl-rules.js';
import { 케이스tcId } from './authoring-held-apply.js';
import { type 깃손, 새로쓰기 } from './authoring-ledger-io.js';
import { 덮은파일이름, 화면케이스파일이름 } from './authoring-reverse.js';

export interface 덮은입력 {
  깃: 깃손;
  기준: string;
  서비스: string;
  폴더: string;
  /** 표준 기획서 지금 판의 번호 */
  번호들: readonly string[];
}

/** 기준 SHA 의 케이스 하나가 닿는 화면 */
export interface 케이스화면 {
  tcId: string;
  /** 케이스 파일 경로 */
  파일: string;
  /** 가져오는 화면 파일(pages · components) 경로 — 이번에 고쳤는지 볼 때 쓴다 */
  화면파일들: string[];
  /** pages 화면 주소의 같은 틀(정렬) — 화면 조각은 여러 화면에 나와 주소가 없다(지도 ② 와 같다) */
  틀들: string[];
}

/** 기준 SHA 에서 서비스 폴더 케이스마다 닿는 화면과, PRD 의 번호를 덮는 케이스가 닿는 같은 틀 목록(정렬 · 중복 없음). git 이 실패하면 까닭 */
export function 기준화면지도(입력: 덮은입력): { 케이스: 케이스화면[]; 덮은틀: string[] } | { 까닭: string } {
  const { 깃, 기준, 서비스, 폴더, 번호들 } = 입력;
  const 표 = `docs/cases/${서비스}.md`;
  const 목록 = 깃(['ls-tree', '-r', '-z', '--name-only', 기준, '--', 표, `tests/${폴더}`]);
  if (!목록.ok) return { 까닭: `기준 판의 파일 목록을 못 읽었다: ${목록.까닭 ?? ''}` };
  const 파일들 = new Set(목록.낸것.split('\0').filter((f) => f !== ''));
  const 읽기 = (f: string): string | { 까닭: string } => {
    const r = 깃(['show', `${기준}:${f}`]);
    return r.ok ? r.낸것 : { 까닭: `기준 판의 ${f} 를 못 읽었다: ${r.까닭 ?? ''}` };
  };
  // 화면 파일 하나를 여러 케이스가 가져온다 — 한 번만 읽는다
  const 화면들 = new Map<string, string | { 까닭: string }>();
  const 화면읽기 = (f: string) => 화면들.get(f) ?? 화면들.set(f, 읽기(f)).get(f)!;
  const 케이스: 케이스화면[] = [];
  for (const f of 파일들) {
    if (!f.startsWith(`tests/${폴더}/`) || !f.endsWith('.spec.ts')) continue;
    const 글 = 읽기(f);
    if (typeof 글 !== 'string') return 글;
    const tcId = 케이스tcId(글);
    if (tcId === null) continue;
    const 화면파일들: string[] = [];
    const 틀들 = new Set<string>();
    for (const 상대 of 가져온화면파일(글)) {
      const 경로 = posix.join(posix.dirname(f), 상대);
      if (!파일들.has(경로)) continue;
      화면파일들.push(경로);
      if (!상대.startsWith('pages/')) continue;
      const 화면글 = 화면읽기(경로);
      if (typeof 화면글 !== 'string') return 화면글;
      const 주소 = 화면주소(화면글);
      const 틀 = 주소 === null ? null : 주소틀(주소);
      if (틀 !== null) 틀들.add(틀);
    }
    케이스.push({ tcId, 파일: f, 화면파일들, 틀들: [...틀들].sort() });
  }
  if (!파일들.has(표)) return { 케이스, 덮은틀: [] };
  const 표글 = 읽기(표);
  if (typeof 표글 !== 'string') return 표글;
  const 지금 = new Set(번호들);
  const 덮는케이스 = new Set(지도줄들(표글, 서비스).filter((x) => 지금.has(x.reqId)).map((x) => x.tcId));
  return { 케이스, 덮은틀: [...new Set(케이스.filter((x) => 덮는케이스.has(x.tcId)).flatMap((x) => x.틀들))].sort() };
}

/** 같은 틀 → 그 화면을 쓰는 tcId 목록. 크롤러 `--cases` 가 저장본이 바뀐 줄에 단다 */
export function 화면케이스지도(케이스: readonly 케이스화면[]): Record<string, string[]> {
  const 지도: Record<string, string[]> = {};
  for (const x of 케이스) for (const 틀 of x.틀들) (지도[틀] ??= []).push(x.tcId);
  for (const 틀 of Object.keys(지도)) 지도[틀]!.sort();
  return 지도;
}

/**
 * 자료 폴더에 화면 ↔ 케이스 지도(`screen-cases.json`)를 쓰고, 화면만이면 PRD 에 이미 있는 화면(`covered.json`)도 쓴다(root 가 자식 폴더에 쓰는 안전한 꼴).
 * 못 세거나 못 쓰면 까닭, 다 쓰면 null
 */
export function 화면지도준비(입력: 덮은입력 & { 자료폴더: string; 화면만: boolean }): { 까닭: string } | null {
  const 지도 = 기준화면지도(입력);
  if ('까닭' in 지도) return 지도;
  const 쓰기 = (이름: string, 값: unknown) => (새로쓰기(join(입력.자료폴더, 이름), JSON.stringify(값)) ? null : { 까닭: `${이름} 를 자료 폴더에 못 썼다` });
  return 쓰기(화면케이스파일이름, 화면케이스지도(지도.케이스)) ?? (입력.화면만 ? 쓰기(덮은파일이름, 지도.덮은틀) : null);
}

/**
 * PR 머리 줄 — 크롤 목록(list.json 글)에서 저장본이 바뀐 화면 가운데 기준 케이스가 쓰는 것, 그 케이스, 그중 이번에 케이스나 화면 파일이 바뀐 것.
 * 닿는 케이스가 없으면(바뀐 화면이 없거나 케이스가 안 쓴다) null
 */
export function 바뀐화면줄(목록글: string, 케이스: readonly 케이스화면[], 바뀐파일: ReadonlySet<string>): string | null {
  let 목록: unknown;
  try {
    목록 = JSON.parse(목록글);
  } catch {
    return null;
  }
  if (!Array.isArray(목록)) return null;
  const 바뀐틀 = new Set(
    목록.flatMap((x: { 저장본?: unknown; 틀?: unknown } | null) => (x?.저장본 === '바뀜' && typeof x.틀 === 'string' ? [x.틀] : [])),
  );
  const 닿는 = 케이스.filter((x) => x.틀들.some((틀) => 바뀐틀.has(틀)));
  if (닿는.length === 0) return null;
  const 화면수 = new Set(닿는.flatMap((x) => x.틀들.filter((틀) => 바뀐틀.has(틀)))).size;
  const 고친 = 닿는.filter((x) => 바뀐파일.has(x.파일) || x.화면파일들.some((f) => 바뀐파일.has(f))).map((x) => x.tcId).sort();
  const 앞 = 고친.slice(0, 5).join(' · ') + (고친.length > 5 ? ' …' : '');
  return `바뀐 화면: ${화면수}장 · 그 화면을 쓰는 케이스 ${닿는.length}건 · 그중 케이스나 화면 파일을 고친 것 ${고친.length}건${고친.length > 0 ? ` — ${앞}` : ''}`;
}

/** 크롤 목록(list.json 글)이 하나 이상이고 전부 PRD 에 이미 있는 화면이면 그 장수, 아니면 null */
export function 모두덮음(목록글: string): number | null {
  try {
    const 목록: unknown = JSON.parse(목록글);
    return Array.isArray(목록) && 목록.length > 0 && 목록.every((x) => (x as { 덮음?: unknown } | null)?.덮음 === true) ? 목록.length : null;
  } catch {
    return null;
  }
}

/** 올릴 것이 없고 크롤 화면이 모두 PRD 에 있을 때 요청을 실패로 끝내는 까닭 */
export function 다덮음사유(장수: number): string {
  return `기획서에 없는 화면이 없다 — 크롤러가 찾은 화면 ${String(장수)}장이 모두 PRD 에 있다. 이 요청은 폐기해도 된다`;
}
