// PRD 에 이미 있는 화면을 기준(main) SHA 의 파일로 세어 자료 폴더에 적는다 — 화면만 요청이 기획서 화면을 또 쓰지 않게 (도메인/작성 §3.6 「기획서에 없는 화면 — 두 번째 작성」)
// 지도 ① · ② 와 같은 함수로 잇는다. 표준 기획서 지금 판 번호 → 그 번호를 덮는 케이스 → 케이스가 가져오는 화면 파일 → 화면 주소 → 크롤러 같은 틀.
// DB 지도를 안 쓰는 까닭 — 지도는 스캔이 채우므로 병합 직후 「다시 스캔」 전이면 방금 병합한 첫 PR 의 케이스가 없다

import { join, posix } from 'node:path';

import { 지도줄들 } from '../apps/admin/src/catalog/reqMap.js';
import { 가져온화면파일, 화면주소 } from '../apps/admin/src/catalog/screenMap.js';
import { 주소틀 } from './authoring-crawl-rules.js';
import { 케이스tcId } from './authoring-held-apply.js';
import { type 깃손, 새로쓰기 } from './authoring-ledger-io.js';
import { 덮은파일이름 } from './authoring-reverse.js';

export interface 덮은입력 {
  깃: 깃손;
  기준: string;
  서비스: string;
  폴더: string;
  /** 표준 기획서 지금 판의 번호 */
  번호들: readonly string[];
}

/** 기준 SHA 에서 PRD 의 번호를 덮는 케이스가 가져오는 화면 파일의 같은 틀 목록(정렬 · 중복 없음). git 이 실패하면 까닭 */
export function 덮은틀들(입력: 덮은입력): string[] | { 까닭: string } {
  const { 깃, 기준, 서비스, 폴더, 번호들 } = 입력;
  const 표 = `docs/cases/${서비스}.md`;
  const 목록 = 깃(['ls-tree', '-r', '-z', '--name-only', 기준, '--', 표, `tests/${폴더}`]);
  if (!목록.ok) return { 까닭: `기준 판의 파일 목록을 못 읽었다: ${목록.까닭 ?? ''}` };
  const 파일들 = new Set(목록.낸것.split('\0').filter((f) => f !== ''));
  if (!파일들.has(표)) return [];
  const 읽기 = (f: string): string | { 까닭: string } => {
    const r = 깃(['show', `${기준}:${f}`]);
    return r.ok ? r.낸것 : { 까닭: `기준 판의 ${f} 를 못 읽었다: ${r.까닭 ?? ''}` };
  };
  const 표글 = 읽기(표);
  if (typeof 표글 !== 'string') return 표글;
  // 화면 파일 하나를 여러 케이스가 가져온다 — 한 번만 읽는다
  const 화면들 = new Map<string, string | { 까닭: string }>();
  const 화면읽기 = (f: string) => 화면들.get(f) ?? 화면들.set(f, 읽기(f)).get(f)!;
  const 지금 = new Set(번호들);
  const 덮는케이스 = new Set(지도줄들(표글, 서비스).filter((x) => 지금.has(x.reqId)).map((x) => x.tcId));
  const 틀들 = new Set<string>();
  for (const f of 파일들) {
    if (!f.startsWith(`tests/${폴더}/`) || !f.endsWith('.spec.ts')) continue;
    const 글 = 읽기(f);
    if (typeof 글 !== 'string') return 글;
    const tcId = 케이스tcId(글);
    if (tcId === null || !덮는케이스.has(tcId)) continue;
    for (const 상대 of 가져온화면파일(글)) {
      // 화면 조각(components)은 여러 화면에 나와 주소가 없다 — 지도 ② 와 같게 pages 만 본다
      const 경로 = posix.join(posix.dirname(f), 상대);
      if (!상대.startsWith('pages/') || !파일들.has(경로)) continue;
      const 화면글 = 화면읽기(경로);
      if (typeof 화면글 !== 'string') return 화면글;
      const 주소 = 화면주소(화면글);
      const 틀 = 주소 === null ? null : 주소틀(주소);
      if (틀 !== null) 틀들.add(틀);
    }
  }
  return [...틀들].sort();
}

/** 덮은 틀을 세어 자료 폴더 `covered.json` 으로 쓴다(root 가 자식 폴더에 쓰는 안전한 꼴). 못 세거나 못 쓰면 까닭 */
export function 덮은화면준비(입력: 덮은입력 & { 자료폴더: string }): { 파일: string } | { 까닭: string } {
  const 틀들 = 덮은틀들(입력);
  if ('까닭' in 틀들) return 틀들;
  const 파일 = join(입력.자료폴더, 덮은파일이름);
  return 새로쓰기(파일, JSON.stringify(틀들)) ? { 파일 } : { 까닭: `${덮은파일이름} 를 자료 폴더에 못 썼다` };
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
