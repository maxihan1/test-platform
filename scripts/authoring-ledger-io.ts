// 원장 껍데기 — 자식을 띄우기 전에 자료 글자본을 읽어 원장을 만들고 사본을 쓴다. 판단은 authoring-ledger 의 순수 함수에 있다
// authoring-run.ts 가 300줄에 닿아 이리로 뗐다 (2026-09-30)

import { lstatSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { 읽을자료 } from './authoring-assets.js';
import { type 원장, 원장만들기 } from './authoring-ledger.js';
import { tcId들, 사람이뺀번호 } from './authoring-ledger-check.js';
import { type 이어작성입력, 남은번호, 이어작성막힘, 이어작성사본이름 } from './authoring-continue.js';
import type { 원장입력 } from './authoring-prompt.js';

export const 원장사본이름 = 'ledger.json';

/** 링크 · 특수 파일은 안 읽는다 — 자료 폴더는 자식 uid 것이고 이어받은 폴더는 앞 자식이 만졌다. 못 읽으면 null */
function 안전히읽기(경로: string): string | null {
  const 정보 = lstatSync(경로, { throwIfNoEntry: false });
  return 정보?.isFile() === true ? readFileSync(경로, 'utf8') : null;
}

/**
 * **root 가 자식 폴더에 쓴다** — 자식이 심은 링크(`ledger.json` → root 파일)를 따라가지 않게 먼저 지우고 새로 만든다(`wx` — 있으면 실패).
 * 쓰는 동안 자식은 떠 있지 않다(띄우기 전 · 거둔 뒤) — 사이에 다시 심을 프로세스가 없다 (2026-09-30 보안 검토)
 */
function 새로쓰기(경로: string, 글: string): boolean {
  try {
    rmSync(경로, { force: true, recursive: true });
    writeFileSync(경로, 글, { mode: 0o644, flag: 'wx' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 원장을 만들어 **메모리에 든다**(`원장` — 올리기 판정이 이것을 쓴다). 자식에게는 사본 경로만 준다(`입력`).
 * 자식이 사본을 고쳐도 판정은 안 흔들린다. 사본을 못 쓰면 원장 없음으로 돈다 — 자식이 모르는 원장으로 거절하지 않는다
 */
export function 원장준비(
  계획: 읽을자료[],
  자료폴더: string,
  사람이뺌: Set<string> = new Set(),
): { 원장: 원장 | { 없음: string }; 입력: 원장입력 } {
  const r = 원장만들기(계획, 안전히읽기);
  if (!('원장' in r)) return { 원장: r, 입력: r };
  const 사본 = join(자료폴더, 원장사본이름);
  // 기준 표의 사람이 뺌을 같이 싣는다 — 자식의 관문 0(check:ledger --agent)이 에이전트의 올리기 판정과 같은 목록을 쓴다 (2026-09-30 게이트 1)
  if (!새로쓰기(사본, JSON.stringify({ ...r, 사람이뺌: [...사람이뺌] }, null, 2))) {
    const 없음 = { 없음: '원장 사본을 자료 폴더에 못 썼다' };
    return { 원장: 없음, 입력: 없음 };
  }
  const 가족 = Object.entries(r.원장.가족).map(([k, n]) => `${k} ${String(n)}`).join(' · ');
  const 요약 = `요구 ${String(r.원장.항목.length)}${가족 === '' ? ' · 문단 모드' : ` · 번호 가족 ${가족}`}${r.원장.빠진자료.length > 0 ? ` · 원장에 못 넣은 자료 ${r.원장.빠진자료.join(' · ')}` : ''}`;
  return { 원장: r.원장, 입력: { 사본, 요약 } };
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
export function 기준읽기(깃: 깃손, 기준: string, 서비스: string, 폴더: string): { 표글: string; 있는케이스: Set<string> } | { 까닭: string } {
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
 * 자식을 띄우기 전 원장 준비 전부 — 기준 표의 사람이 뺌 · 원장 사본 · (이어 작성이면) 남은 번호와 그 사본.
 * 기준 표를 못 읽으면 보통 작성은 사람이 뺌 없이 돈다(이 판 전과 같다). 이어 작성은 막는다 — 남은 번호를 모르고 돌면 덮은 것까지 다시 맡는다
 */
export function 원장과남은번호(입력: {
  계획: 읽을자료[];
  자료폴더: string;
  깃: 깃손;
  기준: string;
  서비스: string;
  폴더: string;
  이어작성원본: number | null;
}): { 원장: 원장 | { 없음: string }; 입력: 원장입력; 사람이뺌: Set<string>; 이어작성?: 이어작성입력 } | { 막힘: string } {
  const 기준 = 기준읽기(입력.깃, 입력.기준, 입력.서비스, 입력.폴더);
  if ('까닭' in 기준) {
    if (입력.이어작성원본 !== null) return { 막힘: 기준.까닭 };
    console.error(`[작성] ${기준.까닭} — 기준 표의 「사람이 뺌」 없이 대조한다`);
  }
  const 사람이뺌 = '까닭' in 기준 ? new Set<string>() : 사람이뺀번호(기준.표글);
  const r = 원장준비(입력.계획, 입력.자료폴더, 사람이뺌);
  if (입력.이어작성원본 === null || '까닭' in 기준) return { ...r, 사람이뺌 };
  const 남은 = '없음' in r.원장 ? [] : 남은번호(r.원장, 기준.표글, 기준.있는케이스, 사람이뺌);
  const 막힘 = 이어작성막힘(r.원장, 남은);
  if (막힘 !== null) return { 막힘 };
  const 사본 = join(입력.자료폴더, 이어작성사본이름);
  if (!새로쓰기(사본, JSON.stringify({ 원본: 입력.이어작성원본, 남은 }, null, 2))) return { 막힘: '남은 번호 사본을 자료 폴더에 못 썼다' };
  return { ...r, 사람이뺌, 이어작성: { 원본: 입력.이어작성원본, 남은, 사본 } };
}
