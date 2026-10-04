// 원장 껍데기 — 자식을 띄우기 전에 자료 글자본을 읽어 원장을 만들고 사본을 쓴다. 판단은 authoring-ledger 의 순수 함수에 있다
// authoring-run.ts 가 300줄에 닿아 이리로 뗐다 (2026-09-30)

import { lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { TCID } from '../apps/admin/src/catalog/rules.js';
import type { 읽을자료 } from './authoring-assets.js';
import { type 원장, 원장만들기 } from './authoring-ledger.js';
import { 지문파일글, 지문파일읽기, 지문파일자리, 지문합치기, 차이줄, 판견주기 } from './authoring-ledger-diff.js';
import { type 기준결정, tcId들, 사람이뺀번호, 요구줄들, 제외번호들 } from './authoring-ledger-check.js';
import { 표tcId들 } from './authoring-conflicts.js';
import { 칸재료만들기 } from './authoring-slots.js';
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

/** 기준(main) 판의 표 · 케이스로 대조에 넘길 것을 만든다. 표를 못 읽었으면(null) 칸 재료가 없다 — 쓰인 번호를 모르고 매기면 남의 케이스 파일을 덮어쓴다 */
export function 기준결정만들기(기준표: { 표글: string; 있는케이스: Set<string>; 접두사: string } | null, 원장번호들: string[]): 기준결정 {
  if (기준표 === null) return { 사람이뺌: new Set(), 다음요청: new Set(), 칸재료: null };
  // 요구 줄 tcId 도 넣는다 — 표tcId들 은 백틱 칸을 못 본다. 「제거함(…)」 안 번호도 쓰인 번호다
  const 줄tcId = 요구줄들(기준표.표글).map((줄) => /^제거함\((.+)\)$/.exec(줄.tcId)?.[1] ?? 줄.tcId).filter((t) => TCID.test(t));
  const 쓰인 = new Set([...표tcId들(기준표.표글), ...줄tcId, ...기준표.있는케이스]);
  return {
    사람이뺌: 사람이뺀번호(기준표.표글),
    다음요청: 제외번호들(기준표.표글, '다음 요청'),
    칸재료: 칸재료만들기(기준표.접두사, 요구줄들(기준표.표글), 쓰인, 원장번호들),
  };
}

/**
 * 원장을 만들어 **메모리에 든다**(`원장` — 올리기 판정이 이것을 쓴다). 자식에게는 사본 경로만 준다(`입력`).
 * 자식이 사본을 고쳐도 판정은 안 흔들린다. 사본을 못 쓰면 원장 없음으로 돈다 — 자식이 모르는 원장으로 거절하지 않는다
 */
export function 원장준비(
  계획: 읽을자료[],
  자료폴더: string,
  기준표: { 표글: string; 있는케이스: Set<string>; 접두사: string } | null,
): { 원장: 원장 | { 없음: string }; 입력: 원장입력; 기준: 기준결정 } {
  const r = 원장만들기(계획, 안전히읽기);
  if (!('원장' in r)) return { 원장: r, 입력: r, 기준: 기준결정만들기(기준표, []) };
  const 기준 = 기준결정만들기(기준표, r.원장.항목.map((h) => h.번호));
  const 사본 = join(자료폴더, 원장사본이름);
  // 기준 표의 결정 · 칸 재료를 같이 싣는다 — 자식의 관문 0(check:ledger --agent) · 번호 명령이 에이전트의 올리기 판정과 같은 재료를 쓴다 (2026-09-30 · 2026-10-04 게이트 1)
  const 사본글 = { ...r, 사람이뺌: [...기준.사람이뺌], 다음요청: [...기준.다음요청], 칸재료: 기준.칸재료 };
  if (!새로쓰기(사본, JSON.stringify(사본글, null, 2))) {
    const 없음 = { 없음: '원장 사본을 자료 폴더에 못 썼다' };
    return { 원장: 없음, 입력: 없음, 기준 };
  }
  const 가족 = Object.entries(r.원장.가족).map(([k, n]) => `${k} ${String(n)}`).join(' · ');
  const 요약 = `요구 ${String(r.원장.항목.length)}${가족 === '' ? ' · 문단 모드' : ` · 번호 가족 ${가족}`}${r.원장.빠진자료.length > 0 ? ` · 원장에 못 넣은 자료 ${r.원장.빠진자료.join(' · ')}` : ''}`;
  return { 원장: r.원장, 입력: { 사본, 요약 }, 기준 };
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

/** 기준(main) 판의 요구 지문 파일 글. 파일이 없으면 `{ 글: null }`, git 이 실패하면 null(못 읽음). git 에서 읽어 링크를 안 따라간다 */
export function 앞지문읽기(깃: 깃손, 기준: string, 서비스: string): { 글: string | null } | null {
  const 자리 = 지문파일자리(서비스);
  const 목록 = 깃(['ls-tree', '--name-only', 기준, '--', 자리]);
  if (!목록.ok) return null;
  if (목록.낸것.trim() === '') return { 글: null };
  const r = 깃(['show', `${기준}:${자리}`]);
  return r.ok ? { 글: r.낸것 } : null;
}

/**
 * `docs` · `docs/cases` 가 링크 아닌 진짜 폴더이고 실제 경로가 트리 안인가 — 없으면 만든다. 트리는 자식 uid 폴더라
 * 자식이 그 자리를 트리 밖 폴더 링크로 바꿔 둘 수 있다. 마지막 이름만 지키면 root 가 트리 밖에 쓰고 지운다 (2026-10-04 계획 검토).
 * 아니면 까닭 글을 돌려준다
 */
function 폴더막힘(트리: string): string | null {
  try {
    for (const 마디 of [['docs'], ['docs', 'cases']]) {
      const 길 = join(트리, ...마디);
      const 정보 = lstatSync(길, { throwIfNoEntry: false });
      if (정보 === undefined) mkdirSync(길, { mode: 0o755 });
      else if (!정보.isDirectory()) return `${마디.join('/')} 가 트리 안의 진짜 폴더가 아니다`;
    }
    return realpathSync(join(트리, 'docs', 'cases')) === join(realpathSync(트리), 'docs', 'cases') ? null : 'docs/cases 가 트리 밖을 가리킨다';
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/**
 * 올리기 전에 트리에 요구 지문 파일을 쓴다 — 바뀐 파일 목록을 읽기 **전에** 불러야 커밋에 든다 (§3.6 「요구 지문」).
 * 원장이 있으면 앞 판과 자료마다 합쳐 쓰고 PR 머리 줄을 돌려준다. 원장이 없으면 자식이 만진 파일을 앞 판으로 되돌리고 줄은 없다.
 * `담기` 가 false 면 트리의 지문 파일을 커밋에 넣지 않는다 — 앞 판을 못 읽었거나(합칠 재료가 없다) 쓰기 · 되돌리기에 실패해
 * 자식 손을 탄 파일이 남았을 수 있다 (2026-10-04 보안 검토)
 */
export function 지문쓰기(트리: string, 서비스: string, r: 원장 | { 없음: string }, 앞: { 글: string | null } | null): { 줄: string | null; 담기: boolean } {
  const 경고 = (글: string) => ({ 줄: '없음' in r ? null : 글, 담기: false });
  if (앞 === null) return 경고('⚠️ 앞 판 지문을 못 읽음 — 요구 지문 파일을 안 썼다');
  const 막힘 = 폴더막힘(트리);
  if (막힘 !== null) return 경고(`⚠️ 요구 지문 파일을 못 썼다 — ${막힘}`);
  const 자리 = join(트리, 지문파일자리(서비스));
  if ('없음' in r) {
    if (앞.글 !== null) return { 줄: null, 담기: 새로쓰기(자리, 앞.글) };
    rmSync(자리, { force: true, recursive: true });
    return { 줄: null, 담기: true };
  }
  const 앞파일 = 앞.글 === null ? null : 지문파일읽기(앞.글);
  if (!새로쓰기(자리, 지문파일글(지문합치기(앞파일, r)))) return 경고('⚠️ 요구 지문 파일을 못 썼다');
  if (앞.글 === null) return { 줄: 차이줄('앞 판 없음'), 담기: true };
  return { 줄: 앞파일 === null ? 차이줄('못 읽음') : 차이줄(판견주기(앞파일, r)), 담기: true };
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
}):
  | { 원장: 원장 | { 없음: string }; 입력: 원장입력; 기준: 기준결정; 이어작성?: 이어작성입력; 앞지문: { 글: string | null } | null }
  | { 막힘: string } {
  const 기준 = 기준읽기(입력.깃, 입력.기준, 입력.서비스, 입력.폴더);
  if ('까닭' in 기준) {
    if (입력.이어작성원본 !== null) return { 막힘: 기준.까닭 };
    console.error(`[작성] ${기준.까닭} — 기준 표의 「사람이 뺌」 · 「다음 요청」 · 칸 재료 없이 대조한다`);
  }
  // 올릴 때 지문 파일을 앞 판과 자료마다 합친다 — 트리가 아니라 기준 SHA 에서 읽는다(이어받은 트리는 앞 실행이 바꿨을 수 있다)
  const r = { ...원장준비(입력.계획, 입력.자료폴더, '까닭' in 기준 ? null : { ...기준, 접두사: 입력.서비스 }), 앞지문: 앞지문읽기(입력.깃, 입력.기준, 입력.서비스) };
  if (입력.이어작성원본 === null || '까닭' in 기준) return r;
  const 남은 = '없음' in r.원장 ? [] : 남은번호(r.원장, 기준.표글, 기준.있는케이스, r.기준);
  const 막힘 = 이어작성막힘(r.원장, 남은);
  if (막힘 !== null) return { 막힘 };
  const 사본 = join(입력.자료폴더, 이어작성사본이름);
  if (!새로쓰기(사본, JSON.stringify({ 원본: 입력.이어작성원본, 남은 }, null, 2))) return { 막힘: '남은 번호 사본을 자료 폴더에 못 썼다' };
  return { ...r, 이어작성: { 원본: 입력.이어작성원본, 남은, 사본 } };
}
