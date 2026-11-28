// 게임 배우기의 곳(STAGE 줄) — 맵 정보 일곱 종류 검사 · 맵을 다 안 채운 곳 · 곳마다 깸 · 판 수 (도메인/게임 §3.10 「맵 파악」 「게임플레이」)
// 장면 처음부터 있던 NavMesh · 막힘 오브젝트를 한 번도 안 열고 놓을 자리를 한 칸씩 찍어 봤다(#16053) — 곳마다 맵을 다 적어야 배우기가 끝난다
import type { 지도줄 } from './authoring-game-find.js';
import { type 판기록, 가장큰, 값찾기, 같나, 계산머리, 계획읽기, 수로, 회고기록이름 } from './authoring-learn-check.js';

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

/** 가 본 곳(가봄 · 못깸) 가운데 맵 일곱 종류를 다 안 채운 곳의 열쇠 */
export const 맵빈곳 = (줄들: readonly 줄[]): string[] => 곳줄들(줄들).filter((x) => (칸(x).상태 === '가봄' || 칸(x).상태 === '못깸') && !맵다됨(x)).map((x) => x.key);

/**
 * 한 곳을 이만큼 해 보고 못 깨면 그 곳은 이번에 더 안 하고, 그 곳에서 정보 모으기를 한 번 한 뒤 다음 맵을 해 본다. 그 곳은 게임플레이 단계에서 다시 깬다(2026-11-27 사용자 「5판동안 하고 못깨면 게임플레이 단계에서 깨는걸로」 · 「다음 맵을 시도」).
 * 50판으로 끊던 것은 둘째 맵 하나에 세 시간이 넘었다. 못깸으로 닫지 않는다. 5판은 맵마다 쓸 수단을 다 못 써 보고 넘어가 10판으로 올렸다(2026-11-27 사용자)
 */
export const 넘김판 = 10;

/** 계획이 쓸 계산 줄마다 지금 data JSON — 판 기록에 남겨 다음 계획 때 고쳤나를 본다 */
export const 계산찍기 = (쓸것: readonly string[], 줄들: readonly 줄[]): Record<string, string> =>
  Object.fromEntries(쓸것.filter((k) => k.startsWith(계산머리)).map((k) => [k, JSON.stringify(칸(줄들.find((x) => x.key === k && x.learned !== null)))]));

/**
 * 계획이 쓸 계산 줄 가운데, 그 줄을 쓴 가장 새 판이 기대를 깼거나 목표에 못 닿고 졌는데 줄이 그때 그대로인 것 — 막을 까닭 글.
 * 틀린 계산을 고치지 않고 근거로만 쓰며 판을 되풀이했다(2026-11-27 16060 둘째 맵 세 번 짐). 게임플레이 계획의 기대가 계산의 예측이라 기대 깨짐을 틀린 신호로 본다.
 * 기대가 앞 웨이브에만 걸린 계획은 일찍 져도 기대가 안 깨진다(16094 셋째 맵 네 판) — 목표에 못 닿은 짐도 틀린 신호로 본다
 */
export function 계산안고침(쓸것: readonly string[], 줄들: readonly 줄[], 기록들: readonly 판기록[]): string | null {
  const 지금 = 계산찍기(쓸것, 줄들);
  for (const [k, 글] of Object.entries(지금)) {
    // 기대도 안 깨진 멈춤 · 치트 조각은 판 결과가 없다 — 그 앞의 진 판을 가리지 않게 건너뛴다
    const 조각 = (x: 판기록): boolean => (x.멈춤 !== undefined || x.치트 === true) && (x.값기록?.어긋남 ?? null) === null;
    const r = [...기록들].reverse().find((x) => x.값기록?.계산?.[k] !== undefined && !조각(x));
    if (r === undefined || r.값기록!.계산![k] !== 글) continue;
    // 옛 기록 · 손으로 고친 기록은 어긋남 필드가 없을 수 있다
    const 어 = r.값기록!.어긋남 ?? null;
    if (어 === null) {
      const 짐 = 못닿고짐(r, 줄들);
      if (짐 === null) continue;
      return `${k} 를 근거로 쓴 ${r.이름} 가 목표 ${짐.값} ${짐.기준} · 실제 ${짐.닿은} 에서 졌다 — 계산이 판과 어디서 달랐나(입력한 레벨 · 수 · 길 · 빠진 피해)를 찾아 입력을 고치고 \`npx tsx scripts/authoring-game-calc.ts <입력>\` 로 다시 계산해 ${k} 줄을 고친 뒤 계획을 돌린다`;
    }
    return `${k} 를 근거로 쓴 ${r.이름} 에서 기대 ${어.기대} 가 ${어.초.toFixed(0)}초에 깨졌다(${어.값이름} ${어.값}) — 계산이 판과 어디서 달랐나(입력한 레벨 · 수 · 길 · 빠진 피해)를 찾아 입력을 고치고 \`npx tsx scripts/authoring-game-calc.ts <입력>\` 로 다시 계산해 ${k} 줄을 고친 뒤 계획을 돌린다`;
  }
  return null;
}

/** 판이 목표에 못 닿고 짐으로 끝났으면 목표와 닿은 가장 큰 수 — 멈춤 · 치트 조각은 결과가 판 결과가 아니라 안 본다 */
export function 못닿고짐(r: 판기록, 줄들: readonly 줄[]): { 값: string; 기준: number; 닿은: number } | null {
  if (r.값기록 === undefined || r.멈춤 !== undefined || r.치트 === true) return null;
  const 계획 = 계획읽기(칸(줄들.find((x) => x.key === r.값기록!.계획 && x.learned !== null)));
  if (typeof 계획 === 'string' || 계획.곳 === undefined) return null;
  const 결 = 결과읽기(칸(곳줄들(줄들).find((x) => x.key === 계획.곳)));
  if (결 === null || typeof 결 === 'string' || 판결과(r, 결) !== '짐') return null;
  const 닿은 = 가장큰(r.값기록, 계획.목표.값);
  // 목표 값을 한 번도 못 읽었으면 계산 탓인지 주소 탓인지 모른다 — 계산을 고치라고 막지 않는다
  return 닿은 === null || 닿은 >= 계획.목표.기준 ? null : { ...계획.목표, 닿은 };
}

/** 그 곳 회고 가운데 끝 n 개의 나아감이 그 앞 회고들의 가장 먼 나아감을 못 넘었으면 그 n 개. 앞 회고가 없거나 나아감을 못 읽었으면 견줄 수 없어 null */
export function 곳안늚<T extends 줄>(줄들: readonly T[], 곳: string, n: number): T[] | null {
  const 곳회고 = 줄들.filter((x) => x.kind === 'PLAY' && x.learned !== null && 회고기록이름(x.key) !== null && 칸(x).곳 === 곳).sort((a, b) => (a.key < b.key ? -1 : 1));
  const 끝 = 곳회고.slice(-n);
  const 앞 = 곳회고.slice(0, -n);
  const 최대 = (들: T[]): number => Math.max(-Infinity, ...들.map((x) => 칸(x).나아감).filter((v): v is number => typeof v === 'number'));
  return 앞.length === 0 || 끝.length < n || !Number.isFinite(최대(앞)) || 최대(끝) > 최대(앞) ? null : 끝;
}

type 결과조건 = string | { 이상: number } | { 이하: number };
/** 깰 곳의 결과 자리 — 판이 끝난 순간 이 자리를 읽어 깸 · 짐을 가른다. 칸이 없으면 화면 글자 */
export interface 결과 { 주소: string; 칸?: string; 깸: 결과조건; 짐: 결과조건 }

const 조건인가 = (v: unknown): v is 결과조건 => 글인가(v) || (Object.keys(객체(v)).length === 1 && (typeof 객체(v).이상 === 'number' || typeof 객체(v).이하 === 'number'));
const 결과꼴 = 'data.결과 는 { 주소, 칸?, 깸, 짐 } 이다 — 깸 · 짐은 판이 끝난 순간 그 자리의 글(「승 리」) 이나 { 이상: <수> } · { 이하: <수> }. 칸이 없으면 화면 글자를 읽는다';

/** 곳 줄의 결과 칸 — 없으면 null(깰 곳이 아니다 · 메뉴 · 랭킹 창), 꼴이 틀리면 까닭 글 */
export function 결과읽기(data: unknown): 결과 | null | string {
  const r = 객체(data).결과;
  if (r === undefined) return null;
  const x = 객체(r);
  if (!글인가(x.주소) || (x.칸 !== undefined && !글인가(x.칸)) || !조건인가(x.깸) || !조건인가(x.짐)) return 결과꼴;
  return { 주소: x.주소, ...(x.칸 === undefined ? {} : { 칸: x.칸 as string }), 깸: x.깸, 짐: x.짐 };
}

/** 판 기록 하나가 깸인가 짐인가 — 끝난 순간 결과 자리가 어느 쪽으로도 안 읽히면 판이 아니다(멈춤으로 쪼개진 조각 · 끝까지 안 간 부르기) */
export function 판결과(기록: 판기록, 결: 결과): '깸' | '짐' | null {
  const v = 값찾기(기록, 결.칸 === undefined ? { 주소: 결.주소 } : { 주소: 결.주소, 칸: 결.칸 });
  if (v === undefined || v === null) return null;
  const 맞나 = (c: 결과조건): boolean => (typeof c === 'string' ? 같나(v, c) : '이상' in c ? (수로(v) ?? -Infinity) >= c.이상 : (수로(v) ?? Infinity) <= c.이하);
  return 맞나(결.깸) ? '깸' : 맞나(결.짐) ? '짐' : null;
}

/**
 * 시뮬불가 — 시뮬레이션으로 이기는 안이 없어 판 없이 넘긴 곳(STAGE data.시뮬불가 { 계산, 웨이브, 모자람, 다시봄? }). 다른 맵을 다 돈 뒤 한 번 다시 시뮬하고, 그래도 없으면 다시봄 을 달아 닫는다(2026-11-28 사용자)
 * 정보 — 그 곳에서 정보 모으기를 했거나(웨이브를 한 단계라도 넘긴 기록) 못 하는 이유(STAGE data.정보못모음)를 적었다
 */
export interface 곳판 { 열쇠: string; 판: number; 깸: number; 못깸?: string; 정보?: true; 시뮬불가?: { 글: string; 다시봄: boolean } }

/** STAGE data.시뮬불가 — 없으면 null, 형태가 틀리면 까닭 글 */
/** 재현안맞음 — 값 고치기 · 숫자 맞추기 · 게임 세계 코드에 규칙 넣기를 다 해도 그 판 재현이 안 맞을 때 그 판 기록 이름. 맵을 닫고 감시 세션이 비교 표를 보고 고친다 */
export function 시뮬불가읽기(data: unknown): { 계산: string; 웨이브: string; 모자람: string; 다시봄: boolean; 재현안맞음?: string } | null | string {
  const v = 객체(data).시뮬불가;
  if (v === undefined) return null;
  const x = 객체(v);
  if (!글인가(x.계산) || !x.계산.startsWith(계산머리) || !글인가(x.웨이브) || !글인가(x.모자람) || (x.다시봄 !== undefined && x.다시봄 !== true) || (x.재현안맞음 !== undefined && !글인가(x.재현안맞음))) return `data.시뮬불가 는 { 계산: <${계산머리}시뮬 줄 열쇠>, 웨이브: <진 웨이브>, 모자람: <무엇이 얼마 모자랐나>, 다시봄?: true(다른 맵을 다 돈 뒤 다시 시뮬해도 불가), 재현안맞음?: <판 기록 이름>(고쳐도 그 판 재현이 안 맞음) } 이다`;
  return { 계산: x.계산, 웨이브: x.웨이브, 모자람: x.모자람, 다시봄: x.다시봄 === true, ...(글인가(x.재현안맞음) ? { 재현안맞음: x.재현안맞음 } : {}) };
}

/** 계획 줄이 적은 곳 — 판 기록의 계획에서 곳을 찾는다 */
export const 계획곳 = (줄들: readonly 줄[], 계획: string): unknown => 칸(줄들.find((x) => x.key === 계획 && x.learned !== null)).곳;

/** 깰 곳(결과 칸이 있는 곳)마다 판 수 · 깬 수 — 판은 그 곳을 적은 계획(data.곳)으로 해 본 기록 가운데 결과가 읽힌 것 */
export function 곳셈(줄들: readonly 줄[], 기록들: readonly 판기록[]): 곳판[] {
  return 곳줄들(줄들).flatMap((x) => {
    const 결 = 결과읽기(칸(x));
    if (결 === null || typeof 결 === 'string') return [];
    // 판 중간 멈춤으로 끝난 기록은 판이 아니다 — 결과를 수로 읽는 곳은 도는 중의 값도 깸 · 짐 어느 한쪽에 걸린다.
    // 정보 모으기가 웨이브를 넘긴 판(치트)이 이어진 기록도 판이 아니다 — 넘긴 웨이브가 깸으로 읽힌다
    // 맞추기 판(자료를 모으려고 돈 판)은 깬 것만 판 수(10판 상한)에 센다
    const 판들 = 기록들.flatMap((r) => (r.값기록 !== undefined && r.멈춤 === undefined && r.치트 !== true && 계획곳(줄들, r.값기록.계획) === x.key ? [{ 결: 판결과(r, 결), 맞추기: typeof 객체(r.따라감).맞추기판 === 'string' }] : [])).filter((v) => v.결 !== null);
    // 맞추기 판에서 깬 판은 판으로도 센다 — 깸이 판 수보다 많아 「0판 중 1」로 보이지 않게
    const 들 = 판들.filter((v) => !v.맞추기 || v.결 === '깸').map((v) => v.결);
    const d = 칸(x);
    const 모음 = 기록들.some((r) => { const 정 = 객체(객체(r.값).정보모으기); return 정.곳 === x.key && typeof 정.단계 === 'number' && 정.단계 > 0; }) || 글인가(d.정보못모음);
    const 불가 = 시뮬불가읽기(d);
    return [{ 열쇠: x.key, 판: 들.length, 깸: 판들.filter((v) => v.결 === '깸').length, ...(d.상태 === '못깸' && 글인가(d.까닭) ? { 못깸: d.까닭 } : {}), ...(모음 ? { 정보: true as const } : {}), ...(불가 === null || typeof 불가 === 'string' ? {} : { 시뮬불가: { 글: `${불가.웨이브} · ${불가.모자람}`, 다시봄: 불가.다시봄 } }) }];
  });
}

/** 게임플레이가 끝났나 — 남은 것(빈 목록이면 끝). 깰 곳이 하나도 없으면 끝이 아니다 */
export function 남은깰곳(줄들: readonly 줄[], 기록들: readonly 판기록[]): string[] {
  const 셈 = 곳셈(줄들, 기록들);
  if (셈.length === 0) return ['깰 곳(data.결과 가 있는 STAGE)이 없다'];
  // 넘김판을 해 본 곳은 이번에 더 안 한다 — 남은 것으로 세면 다음 맵이 없을 때 끝나지 않는다. 시뮬불가로 넘긴 곳은 다른 맵을 다 돈 뒤에 본다
  const 남은 = 셈.filter((x) => x.깸 === 0 && x.못깸 === undefined && x.판 < 넘김판 && x.시뮬불가 === undefined);
  // 넘김판을 하고도 못 깬 곳은 정보 모으기를 한 번 해야 넘어간다 — 같은 판 수에서 맵이 먼저 닫혀 정보 모으기에 한 번도 못 닿았다(2026-11-27 16094 · 16097)
  const 모을곳 = 셈.filter((x) => x.깸 === 0 && x.못깸 === undefined && x.판 >= 넘김판 && x.정보 !== true && x.시뮬불가 === undefined);
  const 다시볼곳 = 남은.length + 모을곳.length > 0 ? [] : 다시시뮬곳(셈);
  return [
    ...(남은.length === 0 ? [] : [`아직 못 깬 곳 ${남은.length}(${남은.slice(0, 5).map((x) => `${x.열쇠} ${x.판}판`).join(' · ')})`]),
    ...(모을곳.length === 0 ? [] : [`정보 모으기 남은 곳 ${모을곳.length}(${모을곳.slice(0, 5).map((x) => x.열쇠).join(' · ')})`]),
    ...(다시볼곳.length === 0 ? [] : [`다시 시뮬 남은 곳 ${다시볼곳.length}(${다시볼곳.slice(0, 5).map((x) => x.열쇠).join(' · ')}) — 다른 맵을 다 돌았다. 그동안 쌓인 손 값 · 고친 데이터로 다시 시뮬해 이기는 안이 나오면 판을 돌고, 그래도 없으면 data.시뮬불가.다시봄 을 true 로`]),
  ];
}

/** 시뮬불가로 넘겼고 아직 다시 안 본 곳 — 깨지도 못깸으로 닫지도 않았다 */
const 다시시뮬곳 = (셈: readonly 곳판[]): 곳판[] => 셈.filter((x) => x.깸 === 0 && x.못깸 === undefined && x.시뮬불가 !== undefined && !x.시뮬불가.다시봄);

/** 곳의 맵 정보 — 그 곳 STAGE 의 맵 종류(`<곳>#<종류>`, 없음이 아닌 것)와 data.곳 이 그 곳인 줄(계획 · 회고 빼고) */
export function 곳맵(줄들: readonly 줄[], 곳: string): { 열쇠: string; 글: string }[] {
  const 맵 = 객체(칸(줄들.find((x) => x.key === 곳 && x.learned !== null)).맵);
  return [
    ...맵종류.filter((k) => 맵[k] !== undefined && !글인가(객체(맵[k]).없음)).map((k) => ({ 열쇠: `${곳}#${k}`, 글: JSON.stringify(맵[k]) })),
    ...줄들.filter((x) => x.learned !== null && x.key !== 곳 && x.kind !== 'TRIAL' && x.kind !== 'PLAY' && 칸(x).곳 === 곳).map((x) => ({ 열쇠: x.key, 글: x.learned!.text })),
  ];
}

/** 멈춤 보고에 붙이는 그 곳 맵 정보 — 열쇠와 글 앞 100자 */
export function 곳맵줄(줄들: readonly 줄[], 곳: string): string[] {
  const 들 = 곳맵(줄들, 곳);
  return [`그 곳(${곳})의 맵 정보 ${들.length} — 새 계획의 data.쓸것 에 믿고 쓸 것을 적는다`, ...들.slice(0, 15).map((x) => `  ${x.열쇠}: ${x.글.replace(/\s+/g, ' ').slice(0, 100)}`)];
}

/** 게임플레이 단계에서 계획으로 해 보기 전에 본다 — 막을 까닭 글, 괜찮으면 null */
export function 놀이막기(계획: { 곳?: string; 쓸것?: readonly string[] }, 줄들: readonly 줄[], 기록들: readonly 판기록[]): string | null {
  if (계획.곳 === undefined) return '게임플레이에서는 계획에 data.곳(해 볼 STAGE 줄 열쇠)을 적는다 — 판 수 · 깸을 곳마다 센다';
  const 셈 = 곳셈(줄들, 기록들).find((x) => x.열쇠 === 계획.곳);
  if (셈 === undefined) return `${계획.곳} 는 깰 곳이 아니다 — 그 STAGE 줄에 data.결과 { 주소, 칸?, 깸, 짐 } 을 먼저 적는다`;
  if (셈.못깸 !== undefined) return `${계획.곳} 는 못깸으로 적었다 — 아직 못 깬 다른 곳을 해 본다`;
  if (셈.시뮬불가?.다시봄 === true) return `${계획.곳} 는 다시 시뮬해도 이기는 안이 없어 닫았다(${셈.시뮬불가.글})`;
  // 시뮬불가로 넘긴 곳은 다른 맵을 다 돈 뒤에 다시 연다(2026-11-28 사용자)
  if (셈.시뮬불가 !== undefined && 남은깰곳(줄들, 기록들).every((x) => x.startsWith('다시 시뮬 남은 곳'))) return null;
  if (셈.시뮬불가 !== undefined) return `${계획.곳} 는 시뮬레이션상 불가로 넘겼다(${셈.시뮬불가.글}) — 다른 맵을 다 돈 뒤에 다시 시뮬한다`;
  if (셈.깸 === 0 && 셈.판 >= 넘김판 && 셈.정보 !== true) {
    return `${계획.곳} 를 ${셈.판}판 해 보고 못 깼다 — 다음 맵으로 넘기기 전에 이 곳에서 정보 모으기를 한 번 한다(\`npx tsx scripts/authoring-game-info.ts <자료 폴더> ${계획.곳} --call '<주소>|<컴포넌트.메서드>'\` · 지침 「${넘김판}판 해 보고도 못 깨면」). 웨이브를 넘기는 함수가 없어 못 하면 그 STAGE 줄 data.정보못모음 에 이유를 적는다`;
  }
  if (셈.깸 === 0 && 셈.판 >= 넘김판) return `${계획.곳} 를 ${셈.판}판 해 보고 못 깼다 — 다음 맵(아직 ${넘김판}판을 안 해 본 깰 곳)을 해 본다. 이 곳은 게임플레이 단계에서 다시 깬다`;
  // 배우기에서 파악한 맵을 쓰게 — 한 칸씩 찍어 보며 놓을 자리를 찾던 것을 되풀이하지 않게(#16053)
  const 맵 = new Set(곳맵(줄들, 계획.곳).map((x) => x.열쇠));
  const 쓸것 = 계획.쓸것 ?? [];
  const 없는 = 쓸것.filter((k) => !맵.has(k) && !줄들.some((x) => x.key === k && x.learned !== null));
  if (없는.length > 0) return `data.쓸것 의 ${없는.join(' · ')} 가 지도에 없다`;
  // 맵 일곱 종류가 다 없음이고 딸린 줄도 없는 곳(메뉴 꼴)은 쓸 맵 정보가 없다 — 막으면 그 곳을 영영 못 한다
  if (맵.size > 0 && !쓸것.some((k) => 맵.has(k))) return `계획의 data.쓸것 에 ${계획.곳} 의 맵 정보를 하나 이상 적는다(${[...맵].slice(0, 8).join(' · ')})`;
  return null;
}

/** 곳마다 한 토막 — PR 머리 · 인수인계에 싣는다 */
export const 곳글 = (x: 곳판): string => `${x.열쇠} ${x.깸 > 0 ? `깸(${x.판}판 중 ${x.깸})` : x.못깸 !== undefined ? `못 깸(${x.판}판 · ${x.못깸})` : x.시뮬불가 !== undefined ? `시뮬레이션상 불가(${x.시뮬불가.글}${x.시뮬불가.다시봄 ? ' · 다시 봐도 불가' : ''})` : `아직(${x.판}판)`}`;
