// 지켜보기 요약 — 지켜본 표본에서 이름마다 생긴 것 · 나온 자리 · 간 길 · 빠르기 · 사라진 것 · 바뀐 값을 묶는다 (도메인/게임 §3.10 「지켜보기」). 게임에 묻는 일은 authoring-game-watch 가 한다

export type 자리 = [number, number, number];

/** 한 번 본 것 — 열쇠는 오브젝트 번호에 「몇 번째로 켜졌나」를 붙인 것이다(풀에 넣었다 다시 꺼내 쓰는 오브젝트는 번호가 같다) */
export interface 표본 {
  초: number;
  보인: { 열쇠: string; 이름: string; 경로: string }[];
  자리: Record<string, 자리>;
  /** 칸(`컴포넌트.칸`)마다 오브젝트의 값 */
  값: Record<string, Record<string, unknown>>;
  /** 곁(--near)의 자리 */
  곁: 자리 | null;
}

/** 이름마다 알아본 컴포넌트와 값이 있는 칸 */
export type 칸정보 = Record<string, { 컴포넌트: string[]; 칸: string[] }>;

const 한자리 = 4;
const 움직임 = 1;
const 줄수 = 6;
const 길점 = 8;

// 펼치기 · 판 돌리기도 쓴다 — 지켜보기(판 돌리기를 부른다)에 두면 import 가 고리를 돈다
/** 네트워크 틀(Netcode)이 모든 컴포넌트에 물려준 칸 — 게임 값이 아니다 */
export const 틀칸 = /^(?:m_TargetIdBeingSynchronized|m_VarInit|IsLocalPlayer|IsOwner|IsOwnedByServer|IsServer|IsClient|IsHost|IsSpawned|HasAuthority|NetworkObjectId|OwnerClientId|NetworkBehaviourId.*|ServerIsHost|IsSessionOwner|HasNetworkObject|IsDestroying|enabled|isActiveAndEnabled)$/;
// ControlCli. 는 테스트 도구 SDK 부품(ControlCliId · ControlCliAxes)이라 게임 값이 아니다 — Id 하나로 값 줄을 요구받았다(2026-11-27 CGP Lobby · MenuCamera)
export const 엔진것 = /^(?:UnityEngine|UnityEditor|Unity\.|TMPro|Cinemachine|DG\.|ControlCli\.)/;

export const 이름만 = (경로: string): string => 경로.split('/').pop()!.replace(/\[-?\d+\]$/, '');
/** 화면 그림(HUD · 창) 아래 것 — 판에서 움직이는 것이 아니다 */
export const 화면그림인가 = (경로: string): boolean => /canvas|hud|popup/i.test(경로) || /UI\(Clone\)/.test(경로);

export const 거리 = (a: 자리, b: 자리): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const 점 = (p: 자리): string => `(${p.map((v) => v.toFixed(1)).join(',')})`;
const 가운데값 = (들: number[]): number => [...들].sort((a, b) => a - b)[Math.floor(들.length / 2)]!;

/** 가까운 것끼리 한 자리로 — 많은 자리부터 */
export function 자리묶기(들: readonly 자리[]): { 자리: 자리; 수: number }[] {
  const 묶음: { 자리: 자리; 수: number }[] = [];
  for (const p of 들) {
    const 있는 = 묶음.find((m) => 거리(m.자리, p) <= 한자리);
    if (있는 === undefined) 묶음.push({ 자리: p, 수: 1 });
    else 있는.수 += 1;
  }
  return 묶음.sort((a, b) => b.수 - a.수);
}

/** 값은 부를 때마다 새것으로 온다 — 글로 견준다 */
const 글 = (v: unknown): string => (typeof v === 'object' ? JSON.stringify(v) : String(v));
const 자리글 = (들: readonly 자리[]): string => {
  const 묶음 = 자리묶기(들);
  return `${묶음.length}곳 ${묶음.slice(0, 줄수).map((m) => `${점(m.자리)}×${m.수}`).join(' ')}${묶음.length > 줄수 ? ' …' : ''}`;
};

export function 요약(들: readonly 표본[], 칸: 칸정보, 곁이름: string | null): string[] {
  if (들.length === 0) return ['한 번도 못 봤다 — 게임에 붙었나 본다'];
  const 처음 = new Set(들[0]!.보인.map((x) => x.열쇠));
  const 끝 = new Set(들.at(-1)!.보인.map((x) => x.열쇠));
  const 이름들 = new Map<string, Map<string, { 초: number; p: 자리; 곁: 자리 | null }[]>>();
  for (const s of 들) {
    for (const { 열쇠, 이름 } of s.보인) {
      if (!이름들.has(이름)) 이름들.set(이름, new Map());
      const 길들 = 이름들.get(이름)!;
      if (!길들.has(열쇠)) 길들.set(열쇠, []);
      const p = s.자리[열쇠];
      if (p !== undefined) 길들.get(열쇠)!.push({ 초: s.초, p, 곁: s.곁 });
    }
  }
  const 첫본초 = new Map<string, number>();
  for (const s of 들) for (const { 열쇠 } of s.보인) if (!첫본초.has(열쇠)) 첫본초.set(열쇠, s.초);
  const 줄: string[] = [];
  const 덩이 = [...이름들].map(([이름, 길들]) => {
    const 열쇠들 = [...길들.keys()];
    const 새것 = 열쇠들.filter((k) => !처음.has(k));
    const 간것 = 열쇠들.filter((k) => !끝.has(k));
    const 움직인 = 열쇠들.filter((k) => {
      const 길 = 길들.get(k)!;
      return 길.some((x) => 거리(x.p, 길[0]!.p) > 움직임);
    });
    return { 이름, 길들, 열쇠들, 새것, 간것, 움직인 };
  });
  // 생기고 · 사라지고 · 움직인 것부터 — 배경은 뒤에 이름만
  const 볼것 = 덩이.filter((x) => x.새것.length + x.간것.length + x.움직인.length > 0 || (칸[x.이름]?.칸.length ?? 0) > 0);
  for (const { 이름, 길들, 열쇠들, 새것, 간것, 움직인 } of 볼것.sort((a, b) => b.새것.length + b.간것.length + b.움직인.length - (a.새것.length + a.간것.length + a.움직인.length))) {
    줄.push(`■ ${이름} — 처음 ${열쇠들.filter((k) => 처음.has(k)).length} · 새로 ${새것.length} · 사라짐 ${간것.length} · 움직임 ${움직인.length}`);
    // 나온 때 자리를 못 읽은 것은 뺀다 — 길 가운데를 나온 자리로 적지 않게
    const 첫자리 = 새것.flatMap((k) => (길들.get(k)![0]?.초 === 첫본초.get(k) ? [길들.get(k)![0]!.p] : []));
    if (첫자리.length > 0) 줄.push(`  나온 자리 ${자리글(첫자리)}${첫자리.length < 새것.length ? ` (${새것.length - 첫자리.length}개는 나온 때 자리를 못 읽음)` : ''}`);
    const 길있는 = 움직인.filter((k) => 길들.get(k)!.length >= 2);
    const 쓴자리: 자리[] = [];
    for (const k of [...길있는].sort((a, b) => 길들.get(b)!.length - 길들.get(a)!.length)) {
      const 길 = 길들.get(k)!;
      if (쓴자리.length >= 4 || 쓴자리.some((p) => 거리(p, 길[0]!.p) <= 한자리)) continue;
      쓴자리.push(길[0]!.p);
      const 걸음 = Math.max(1, Math.ceil(길.length / 길점));
      const 고른 = 길.filter((_, i) => i % 걸음 === 0 || i === 길.length - 1);
      줄.push(`  길 ${고른.map((x) => `${x.초.toFixed(0)}s${점(x.p)}`).join(' → ')}`);
    }
    if (길있는.length > 0) {
      const 빠르기 = 길있는.map((k) => {
        const 길 = 길들.get(k)!;
        const 간 = 길.slice(1).reduce((합, x, i) => 합 + 거리(x.p, 길[i]!.p), 0);
        return 간 / Math.max(0.1, 길.at(-1)!.초 - 길[0]!.초);
      });
      줄.push(`  빠르기 초당 ${가운데값(빠르기).toFixed(2)}칸(가운데 값 · ${빠르기.length}개)`);
    }
    const 끝자리 = 간것.flatMap((k) => (길들.get(k)!.at(-1) === undefined ? [] : [길들.get(k)!.at(-1)!]));
    if (끝자리.length > 0) {
      const 곁거리 = 끝자리.flatMap((x) => (x.곁 === null ? [] : [거리(x.p, x.곁)]));
      줄.push(`  마지막으로 보인 자리 ${자리글(끝자리.map((x) => x.p))}${곁거리.length === 0 ? '' : ` · 그때 ${곁이름} 과 거리 ${Math.min(...곁거리).toFixed(1)}~${Math.max(...곁거리).toFixed(1)}`}`);
    }
    for (const 칸이름 of new Set(들.flatMap((s) => Object.keys(s.값)))) {
      const 바뀜: string[] = [];
      for (const k of 열쇠들) {
        let 앞: unknown;
        for (const s of 들) {
          const v = s.값[칸이름]?.[k];
          if (v === undefined) continue;
          if (앞 !== undefined && 글(v) !== 글(앞)) 바뀜.push(`${s.초.toFixed(1)}s ${글(앞)}→${글(v)}${s.곁 !== null && s.자리[k] !== undefined ? `(${곁이름} 과 ${거리(s.자리[k]!, s.곁).toFixed(1)})` : ''}`);
          앞 = v;
        }
      }
      if (바뀜.length > 0) 줄.push(`  ${칸이름} 바뀜 ${바뀜.length}번: ${바뀜.slice(0, 12).join(' · ')}${바뀜.length > 12 ? ' …' : ''}`);
      const 읽은 = 열쇠들.filter((k) => 들.some((s) => s.값[칸이름]?.[k] !== undefined)).length;
      if (바뀜.length === 0 && 읽은 > 0) 줄.push(`  ${칸이름} 읽은 ${읽은}개는 안 바뀜${읽은 < 열쇠들.length ? ` — ${열쇠들.length - 읽은}개는 안 읽음` : ''}`);
    }
    const 아는 = 칸[이름];
    if (아는 !== undefined && 아는.컴포넌트.length > 0) 줄.push(`  컴포넌트 ${아는.컴포넌트.join(' · ')}${아는.칸.length === 0 ? '' : ` — 칸 ${아는.칸.join(' · ')}`}`);
  }
  const 가만 = 덩이.filter((x) => !볼것.includes(x));
  if (가만.length > 0) 줄.push(`가만히 있는 것: ${가만.map((x) => `${x.이름}${x.열쇠들.length > 1 ? `×${x.열쇠들.length}` : ''}`).slice(0, 40).join(' · ')}`);
  return 줄;
}
