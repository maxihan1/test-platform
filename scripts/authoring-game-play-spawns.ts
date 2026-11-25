// 판 도중 새로 나온 것 — 도중 화면 간격마다 켜진 오브젝트를 종류별로 세고, 지도에 없는 새 종류는 처음 보일 때 한 번 펼친다 (도메인/게임 §3.10 「조작 도우미」)
// 판이 끝나면 보스 · 웨이브의 적이 사라져 펼칠 것이 없다 — 보이는 그 자리에서 펼친다. 숨겨 뒀다 켠 것도 find-all(꺼진 것은 뺀다)에 켜지는 순간 나온다
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Found, Game } from 'control-cli';

import { 게임자리 } from './authoring-game.js';
import { 펼친다 } from './authoring-game-props.js';
import { 이름만, 화면그림인가 } from './authoring-game-watch-report.js';

/** 한 판에 펼치는 종류 — 판 도중 명령이 많으면 조작 함수의 입력이 밀린다 */
export const 펼칠상한 = 10;
const 이어실패한도 = 3;
/** 판이 끝난 뒤 돌던 세기 · 펼치기를 기다리는 한도 */
const 끝기다림ms = 10_000;
/** 함수를 부르기 전에 처음 목록을 기다리는 한도 — 판 첫 순간에 나온 것이 처음에 섞이지 않게 */
const 준비한도ms = 3_000;
const 찍을줄 = 15;

export interface 센때 {
  초: number;
  /** 처음과 수가 다른 종류만 — 장면 전체를 적으면 판 하나에 수만 칸이다 */
  수: Record<string, number>;
}
export interface 펼친기록 {
  종류: string;
  초: number;
  주소: string;
  글?: string[];
  못함?: string;
}
export interface 나온것 {
  간격ms: number;
  /** 판 시작(장면이 바뀌었으면 바뀐 뒤 첫) 목록의 종류별 수 */
  처음: Record<string, number>;
  /** 다시잡음 — 앞 장면에서 센 새것이 없어 바뀐 장면의 첫 목록을 처음으로 다시 잡았다. 아니면 그 뒤는 세지 않았다 */
  장면바뀜: { 초: number; 장면: string; 다시잡음: boolean }[];
  센때: 센때[];
  /** 처음에 없던 종류가 처음 보인 초 */
  첫초: Record<string, number>;
  화면것: string[];
  지도에없음: string[];
  펼침: 펼친기록[];
  안펼침: string[];
}

const 까닭 = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** 판이 끝나 세기를 그쳤다 — 돌던 펼치기가 판 뒤에 명령을 더 보내지 않게 다음 명령에서 멈춘다. 실패로 세지 않는다 */
class 그침 extends Error {}

/** 같은 종류로 묶는 이름 — `(Clone)` · ` (1)` · `[n]` 꼬리를 뗀다 */
export const 종류 = (경로: string): string => 이름만(경로).replace(/\(Clone\)/g, '').replace(/\s*\(\d+\)$/, '').trim();

/**
 * 맨 위 것만 센다 — 뿌리에 있거나 부모가 처음 목록에 있던 것. 새로 나온 것 안의 뼈 · 부품은 부모가 처음에 없어 빠진다.
 * 경로 순번은 형제가 사라지면 당겨진다 — 부모 자리가 처음과 같아도 부모 번호가 처음에 없던 것이면 새것 안의 부품이다.
 * ponytail: 새 묶음 오브젝트 아래에 적을 만드는 게임이면 묶음만 세진다 — 그런 게임이 나오면 부모의 종류가 「담는 것」인지 보고 한 칸 더 내려간다
 */
export function 세기(들: readonly Found[], 처음경로: ReadonlySet<string>, 처음번호: ReadonlySet<string> = new Set()): { 수: Record<string, number>; 하나: Map<string, Found> } {
  const 수: Record<string, number> = {};
  const 하나 = new Map<string, Found>();
  const 경로별 = new Map(들.map((f) => [f.path, f]));
  for (const f of 들) {
    const 부모 = f.path.slice(0, f.path.lastIndexOf('/'));
    if (부모 !== '' && !처음경로.has(부모)) continue;
    const 부모번호 = 경로별.get(부모)?.id;
    if (부모번호 !== undefined && 처음번호.size > 0 && !처음번호.has(부모번호)) continue;
    const k = 종류(f.path);
    if (k === '') continue;
    수[k] = (수[k] ?? 0) + 1;
    if (!하나.has(k)) 하나.set(k, f);
  }
  return { 수, 하나 };
}

/** 지도(받아 온 지도 · 아직 안 올린 배운 줄)의 글 — 자료 폴더가 없으면 빈 글이라 새 종류는 다 「지도에 없음」이다 */
export function 지도글(자료: string | undefined): string {
  if (자료 === undefined) return '';
  return [게임자리.지도, 게임자리.배운글].map((f) => {
    try {
      return readFileSync(join(자료, f), 'utf8');
    } catch {
      return '';
    }
  }).join('\n');
}

/**
 * 지도 글에 그 이름이 낱말로 들어 있나 — 앞뒤가 영문 · 숫자 · `_` 이면 다른 이름의 일부다(「Bot」 이 「BotSpawner」 에 걸리지 않게).
 * ponytail: 글 어디에든 낱말로 있으면 있는 것으로 친다 — 지도 요소 이름 · 열쇠만 보려면 지도를 읽어 칸으로 견준다
 */
export function 지도에있나(지도: string, 이름: string): boolean {
  const 꼴 = 이름.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9_])${꼴}(?![A-Za-z0-9_])`).test(지도);
}

type 셀게임 = Pick<Game, 'findAll' | 'scenes' | 'components' | 'members' | 'get'>;

export interface 세는고리 {
  /** 처음 목록을 셌다(한도 3초) — 함수는 이 뒤에 부른다 */
  준비: Promise<void>;
  /** 함수가 끝난 바로 뒤 — 돌던 세기 · 펼치기가 다음 명령에서 멈춘다(멈추기 · 입력 놓기와 겹치지 않게) */
  그친다: () => void;
  /** 돌던 일을 기다린 뒤 끝 수를 한 번 더 센다(펼치지는 않는다). 돌려준 것은 사본이다. 못 센 일은 한 줄로 */
  끝난다: () => Promise<{ 나온: 나온것 | null; 못함: string | null }>;
}

/** 바로 한 번(처음 목록) 세고 간격마다 다시 센다. 세기가 던져도 함수는 계속 돈다 — 세 번 이어 실패하면 그친다 */
export function 세기시작(게임: 셀게임, 간격ms: number, 시작: number, 지도: string): 세는고리 {
  const 나온: 나온것 = { 간격ms, 처음: {}, 장면바뀜: [], 센때: [], 첫초: {}, 화면것: [], 지도에없음: [], 펼침: [], 안펼침: [] };
  let 처음경로: Set<string> | null = null;
  let 처음번호 = new Set<string>();
  let 장면: string | null = null;
  let 장면그침 = false;
  let 서있다 = true;
  let 허용 = true;
  let 실패 = 0;
  let 이어 = 0;
  let 첫까닭: string | undefined;
  let 깨운다: (() => void) | undefined;
  const 묻는다 = async <T,>(일: () => Promise<T>): Promise<T> => {
    if (!허용) throw new 그침();
    const 답 = await 일();
    if (!허용) throw new 그침();
    return 답;
  };
  const 지킨 = {
    findAll: (...a: Parameters<Game['findAll']>) => 묻는다(() => 게임.findAll(...a)),
    scenes: () => 묻는다(() => 게임.scenes()),
    components: (...a: Parameters<Game['components']>) => 묻는다(() => 게임.components(...a)),
    members: (...a: Parameters<Game['members']>) => 묻는다(() => 게임.members(...a)),
    get: (...a: Parameters<Game['get']>) => 묻는다(() => 게임.get(...a)),
  };

  const 한번 = async (펼칠까: boolean): Promise<void> => {
    if (장면그침) return;
    const 들 = await 지킨.findAll('//*');
    const 지금장면 = await 지킨.scenes().then((s) => (typeof s.active === 'string' ? s.active : null), (e: unknown) => {
      if (e instanceof 그침) throw e;
      return null;
    });
    const 초 = (Date.now() - 시작) / 1000;
    const 바뀜 = 처음경로 !== null && 지금장면 !== null && 장면 !== null && 지금장면 !== 장면;
    if (바뀜 && Object.keys(나온.첫초).length > 0) {
      // 앞 장면에서 새것을 셌다(판이 끝나 결과 화면으로 · 다음 스테이지로) — 다른 장면과 견주면 뜻이 없어 그 뒤는 안 센다
      나온.장면바뀜.push({ 초, 장면: 지금장면!, 다시잡음: false });
      장면그침 = true;
      return;
    }
    if (처음경로 === null || 바뀜) {
      // 메뉴에서 판으로 들어가면 판의 모든 것이 새것이 된다 — 바뀐 장면의 첫 목록을 처음으로 다시 잡는다
      처음경로 = new Set(들.map((f) => f.path));
      처음번호 = new Set(들.flatMap((f) => (f.id === undefined ? [] : [f.id])));
      나온.처음 = 세기(들, 처음경로, 처음번호).수;
      나온.센때 = [];
      if (바뀜) 나온.장면바뀜.push({ 초, 장면: 지금장면!, 다시잡음: true });
      장면 = 지금장면;
      return;
    }
    장면 ??= 지금장면;
    const { 수, 하나 } = 세기(들, 처음경로, 처음번호);
    const 다른: Record<string, number> = {};
    for (const k of new Set([...Object.keys(수), ...Object.keys(나온.처음)])) if ((수[k] ?? 0) !== (나온.처음[k] ?? 0)) 다른[k] = 수[k] ?? 0;
    나온.센때.push({ 초, 수: 다른 });
    for (const [k, f] of 하나) {
      if ((나온.처음[k] ?? 0) > 0 || k in 나온.첫초) continue;
      나온.첫초[k] = 초;
      if (화면그림인가(f.path)) {
        나온.화면것.push(k);
        continue;
      }
      if (지도에있나(지도, k)) continue;
      나온.지도에없음.push(k);
      if (!펼칠까 || 나온.펼침.length >= 펼칠상한) {
        나온.안펼침.push(k);
        continue;
      }
      const 주소 = f.id === undefined ? f.path : `//*[@id=${f.id}]`;
      try {
        const 글 = await 펼친다(지킨 as unknown as Game, 주소, 이름만(f.path));
        나온.펼침.push({ 종류: k, 초, 주소, 글 });
      } catch (e) {
        if (e instanceof 그침) {
          나온.안펼침.push(k);
          throw e;
        }
        나온.펼침.push({ 종류: k, 초, 주소, 못함: 까닭(e) });
      }
    }
  };
  const 해본다 = async (펼칠까: boolean): Promise<void> => {
    try {
      await 한번(펼칠까);
      이어 = 0;
    } catch (e) {
      if (e instanceof 그침) return;
      실패 += 1;
      이어 += 1;
      첫까닭 ??= 까닭(e);
    }
  };
  let 첫번끝: () => void = () => {};
  const 첫번 = new Promise<void>((끝) => (첫번끝 = 끝));
  const 고리 = (async (): Promise<void> => {
    await 해본다(true);
    첫번끝();
    while (서있다 && 이어 < 이어실패한도) {
      await new Promise<void>((다음) => {
        const 시계 = setTimeout(다음, 간격ms);
        깨운다 = (): void => {
          clearTimeout(시계);
          다음();
        };
      });
      if (!서있다) return;
      await 해본다(true);
    }
  })();
  const 그친다 = (): void => {
    서있다 = false;
    허용 = false;
    깨운다?.();
  };
  let 준비시계: NodeJS.Timeout | undefined;
  return {
    준비: Promise.race([첫번, new Promise<void>((다음) => (준비시계 = setTimeout(다음, 준비한도ms)))]).finally(() => clearTimeout(준비시계)),
    그친다,
    끝난다: async () => {
      그친다();
      let 시계: NodeJS.Timeout | undefined;
      const 다돎 = await Promise.race([고리.then(() => true), new Promise<boolean>((다음) => (시계 = setTimeout(() => 다음(false), 끝기다림ms)))]);
      clearTimeout(시계);
      // 끝 수 — 판이 끝난 모습. 돌던 일이 안 끝났으면 겹쳐 묻지 않는다
      if (다돎 && 이어 < 이어실패한도) {
        허용 = true;
        await 해본다(false);
        허용 = false;
      }
      return { 나온: 처음경로 === null ? null : structuredClone(나온), 못함: 실패 === 0 ? null : `오브젝트 세기 ${실패}번 못 함: ${첫까닭}` };
    },
  };
}

/** 종류 하나의 수 — 그때 센 값이 없으면 처음과 같다 */
const 그때수 = (나온: 나온것, 때: 센때, k: string): number => 때.수[k] ?? 나온.처음[k] ?? 0;

/** 판 끝 출력 줄 — 새 종류(처음 보인 차례) 다음 수가 바뀐 종류. 화면이름은 그 초에 가까운 도중 화면 파일 이름 */
export function 나온것줄(나온: 나온것, 화면이름: ((초: number) => string) | null, 펼친파일: string | null): string[] {
  const 바뀐 = [...new Set(나온.센때.flatMap((때) => Object.keys(때.수)))];
  const 장면줄 = 나온.장면바뀜.map((x) => `장면이 바뀜 ${x.초.toFixed(0)}초 ${x.장면} — ${x.다시잡음 ? '그때 목록을 처음으로 다시 잡았다' : '앞 장면에서 새것을 셌으니 그 뒤는 세지 않았다'}`);
  if (바뀐.length === 0) return [...장면줄, `새로 나온 것 없음 — ${나온.간격ms / 1000}초마다 센 오브젝트 수가 처음과 같다`];
  const 새것 = 바뀐.filter((k) => k in 나온.첫초).sort((a, b) => 나온.첫초[a]! - 나온.첫초[b]!);
  const 줄 = [...새것, ...바뀐.filter((k) => !(k in 나온.첫초))].map((k) => {
    const 수들 = 나온.센때.map((때) => ({ 초: 때.초, 수: 그때수(나온, 때, k) }));
    const 많 = 수들.reduce((a, b) => (b.수 > a.수 ? b : a));
    const 적 = 수들.reduce((a, b) => (b.수 < a.수 ? b : a));
    const 첫 = 나온.첫초[k];
    const 표 = [
      `처음 ${나온.처음[k] ?? 0}개`,
      ...(첫 === undefined ? [] : [`${첫.toFixed(0)}초에 나옴`]),
      `가장 많을 때 ${많.수}개(${많.초.toFixed(0)}초)`,
      ...(첫 === undefined ? [`가장 적을 때 ${적.수}개(${적.초.toFixed(0)}초)`] : []),
      `끝 ${수들.at(-1)!.수}개`,
      ...(나온.지도에없음.includes(k) ? ['지도에 없음'] : []),
      ...(나온.펼침.some((x) => x.종류 === k && x.글 !== undefined) ? ['펼침'] : 나온.펼침.some((x) => x.종류 === k) ? ['펼치다 실패'] : 나온.안펼침.includes(k) ? ['안 펼침'] : []),
      ...(첫 === undefined || 화면이름 === null ? [] : [`가까운 화면 ${화면이름(첫)}`]),
    ];
    return `  ${나온.화면것.includes(k) ? '화면 ' : ''}${k} — ${표.join(' · ')}`;
  });
  return [
    ...장면줄,
    `새로 나온 것 · 수가 바뀐 것 ${줄.length}종류 — 판 시작 목록과 견줌 · ${나온.간격ms / 1000}초마다 센 값(그 사이에 나왔다 사라진 것은 빠질 수 있다)`,
    ...줄.slice(0, 찍을줄),
    ...(줄.length > 찍을줄 ? [`  … 나머지 ${줄.length - 찍을줄}종류는 기록 json 의 나온것에 있다`] : []),
    ...(나온.펼침.length === 0 ? [] : [`펼친 것 ${나온.펼침.length}종류 — ${펼친파일 ?? '자료 폴더가 없어 파일로 남기지 못했다'}`]),
    ...(나온.안펼침.length === 0 ? [] : [`안 펼친 것(한 판 ${펼칠상한}종류 상한 · 판이 끝난 뒤 처음 보임) — 다음 판에서 보일 때 손으로 펼친다: ${나온.안펼침.join(' · ')}`]),
  ];
}

/** 펼친 글 파일 내용 */
export const 펼친파일글 = (나온: 나온것): string =>
  나온.펼침.map((x) => [`## ${x.종류} — ${x.초.toFixed(0)}초에 처음 보임 · ${x.주소}`, ...(x.글 ?? [`펼치다 실패: ${x.못함 ?? ''}`])].join('\n')).join('\n\n');
