// 조작 맵 줄 파일(app-route.json · game-route.json)을 서버 올리기 검사로 미리 돌려 서버가 거절할 자리를 모두 모은다
// 경로 검색은 꼴이 틀린 줄을 말없이 빼거나 그대로 받아서, 자식의 탐색 검사가 여기서 안 짚으면 체크포인트의 올리기가 400 으로 작성을 멈춘다(2026-11-27 #16095)
import { 맵줄검사 } from '../apps/admin/src/prd/appRoute.js';
import { 조작행검사 } from '../apps/admin/src/prd/gameRoute.js';
import { 새맵줄이름 } from './authoring-app-route.js';
import { 게임자리 } from './authoring-game.js';

type 올리기검사 = (본문: unknown) => { error: string; detail: string } | { rows: unknown[] };

const 자리상한 = 20;

/**
 * 서버는 첫 자리만 말해 줄마다 따로 돌려 틀린 자리를 다 모은다. 줄이 다 맞을 때만 실제로 보낼 본문 전체(겹친 줄 · remove · 줄 수)를 본다.
 * 거절할 자리가 없으면 null, 있으면 「rows.3.fromKey · rows.7.reason 외 N개」
 */
export function 서버거절자리(검사: 올리기검사, 몸: unknown, 보낼몸: unknown = 몸): string | null {
  const 줄들 = typeof 몸 === 'object' && 몸 !== null ? (몸 as { rows?: unknown }).rows : undefined;
  const 자리들 = Array.isArray(줄들)
    ? 줄들.flatMap((x, i) => {
        const r = 검사({ rows: [x] });
        return 'error' in r ? [r.detail.replace(/^rows\.0/, `rows.${String(i)}`)] : [];
      })
    : [];
  if (자리들.length === 0) {
    const r = 검사(보낼몸);
    if ('error' in r) 자리들.push(r.detail);
  }
  if (자리들.length === 0) return null;
  return 자리들.slice(0, 자리상한).join(' · ') + (자리들.length > 자리상한 ? ` 외 ${String(자리들.length - 자리상한)}개` : '');
}

/** 앱 — 경로 검색(새줄더하기)은 서버가 거절할 줄을 말없이 뺀다(#16095 · fromKey 의 「 · 」). 앱맵올리기는 본문을 그대로 보낸다 */
export function 앱맵거절줄(몸: unknown): string | null {
  const 자리 = 서버거절자리(맵줄검사, 몸);
  return 자리 === null ? null : `${새맵줄이름} 에 서버가 거절할 줄이 있다 — ${자리} (글 칸에 「 · 」 「 → 」 · 줄바꿈 · 앞뒤 빈칸 · 끝의 「·」 「→」를 못 쓴다. 「까닭」은 진행 불가 줄에만, 같은 줄(종류 · 출발 · 동작)은 한 번만. 칸 규칙은 docs/spec/도메인/작성.md §7 「앱 조작 맵 통로」)`;
}

/** 게임 맵올리기는 돌발 팝업 행을 넣지도 지우지도 않는다 — 끝 보고로 나가 병합 뒤 서버가 올린다 */
export const 팝업빼기 = (v: unknown) => (Array.isArray(v) ? v.filter((x) => (x as { kind?: unknown } | null)?.kind !== 'POPUP') : v);

/**
 * 게임 — 경로 검색이 받는 행도 서버는 거절할 수 있다(앞뒤 빈칸 · 줄바꿈 · 한도). 행마다는 돌발 팝업 행까지 보고,
 * 본문 전체는 맵올리기가 실제로 보내는 것(팝업 뺀 것)으로 본다. JSON 이 아니면 null — 맵행읽기가 이미 짚는다
 */
export function 게임맵거절행(글: string | null): string | null {
  let 몸: { rows?: unknown; remove?: unknown } | null;
  try {
    몸 = JSON.parse(글 ?? 'null') as typeof 몸;
  } catch {
    return null;
  }
  if (typeof 몸 !== 'object' || 몸 === null) return null;
  const 자리 = 서버거절자리(조작행검사, 몸, { ...몸, rows: 팝업빼기(몸.rows), ...(몸.remove === undefined ? {} : { remove: 팝업빼기(몸.remove) }) });
  return 자리 === null ? null : `${게임자리.새맵행} 에 서버가 거절할 행이 있다 — ${자리} (글 칸에 줄바꿈 · 앞뒤 빈칸을 못 쓰고 한도를 넘으면 안 된다. 같은 행(종류 · 출발 · 동작)은 한 번만. 칸 규칙은 docs/spec/도메인/게임.md §7 「조작 맵」)`;
}
