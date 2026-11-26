// 게임 배우기의 곳(STAGE 줄) — 맵 정보 일곱 종류 검사 · 맵을 다 안 채운 곳 (도메인/게임 §3.10 「맵 파악」)
// 장면 처음부터 있던 NavMesh · 막힘 오브젝트를 한 번도 안 열고 놓을 자리를 한 칸씩 찍어 봤다(#16053) — 곳마다 맵을 다 적어야 배우기가 끝난다
import type { 지도줄 } from './authoring-game-find.js';
import type { 판기록 } from './authoring-learn-check.js';

/** 곳마다 data.맵 에 다 채워야 하는 종류 — 그 게임에 없는 종류는 { 없음: <이유> } */
export const 맵종류 = ['걷기', '막힘', '놓기', '적', '지킬것', '자원', '출구'] as const;

type 줄 = Pick<지도줄, 'kind' | 'key' | 'learned'>;
const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 글인가 = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const 칸 = (x: 줄 | undefined): Record<string, unknown> => 객체(x?.learned?.data);

const 맵꼴 = `data.맵 은 { ${맵종류.join(' · ')} } 이고 종류마다 { 주소, 칸?, 값, 본때 } 나 { 없음: <이유> } 다 — 주소는 다시 읽을 자리, 값은 게임 좌표(점 목록 · 사각형 · 선), 본때는 그것을 본 판 기록 이름`;

/** 살아 있는 곳 줄 — 뒤집힌 줄은 뺀다 */
export const 곳줄들 = <T extends 줄>(줄들: readonly T[]): T[] => 줄들.filter((x) => x.kind === 'STAGE' && x.learned !== null && x.learned.belief !== 'OVERTURNED');

/**
 * 곳 줄의 data.맵 을 받기 전에 본다 — 틀리면 까닭 글. 다 안 채워도 받는다(채웠나는 맵빈곳이 본다).
 * 본 적 없는 맵을 적지 못하게 — 그 장면에서 부른 판 기록이 있어야 하고, 종류마다 본때가 그 장면의 판 기록이어야 한다
 */
export function 맵검사(data: unknown, 기록들: readonly 판기록[]): string | null {
  const d = 객체(data);
  if (d.맵 === undefined) return null;
  const 맵 = 객체(d.맵);
  if (!글인가(d.장면)) return 'data.장면 에 이 곳의 장면 이름을 적는다 — 맵은 장면마다 적는다(`npx control-cli -s=g scenes` 의 active)';
  const 장면 = d.장면;
  const 이장면 = (r: 판기록): boolean => r.장면들?.includes(장면) === true;
  if (!기록들.some(이장면)) return `장면 ${장면} 에서 조작 도우미를 부른 판 기록이 없다 — 가 본 장면의 맵만 적는다`;
  const 모름 = Object.keys(맵).filter((k) => !(맵종류 as readonly string[]).includes(k));
  if (모름.length > 0) return `data.맵 에 모르는 종류 ${모름.join(' · ')} — ${맵꼴}`;
  for (const k of 맵종류) {
    const x = 맵[k];
    if (x === undefined || 글인가(객체(x).없음)) continue;
    const y = 객체(x);
    if (!글인가(y.주소) || (y.칸 !== undefined && !글인가(y.칸)) || y.값 === undefined || y.값 === null || !글인가(y.본때)) return `data.맵.${k} 가 틀렸다 — ${맵꼴}`;
    const 본 = 기록들.find((r) => r.이름 === y.본때);
    if (본 === undefined || !이장면(본)) return `data.맵.${k}.본때 ${y.본때} 가 장면 ${장면} 에서 부른 판 기록이 아니다 — 그 종류를 읽은 판의 기록 이름을 적는다`;
  }
  return null;
}

/** 맵을 다 채웠나 — 일곱 종류가 다 있다(꼴은 적을 때 맵검사가 봤다) */
export const 맵다됨 = (x: 줄): boolean => 맵종류.every((k) => 객체(칸(x).맵)[k] !== undefined);

/** 가 본 곳 가운데 맵 일곱 종류를 다 안 채운 곳의 열쇠 */
export const 맵빈곳 = (줄들: readonly 줄[]): string[] => 곳줄들(줄들).filter((x) => 칸(x).상태 === '가봄' && !맵다됨(x)).map((x) => x.key);
