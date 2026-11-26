// 판 중간 멈춤 — 계획으로 해 보는 동안 10초마다 기대가 깨졌나 · 처음 보는 오브젝트가 나왔나를 보고, 걸리면 함수를 끊고 게임을 멈춘 채 그 순간을 AI 에게 넘긴다 (도메인/게임 §3.10 「판 중간 멈춤」)
// 함수가 5~7분 도는 동안 세계수가 110초 깎였는데 끝나야 봤다(#16053). 10초마다 AI 를 다 부르면 3분 반 판에 6만 토큰이라 기계가 보고 걸릴 때만 넘긴다
import type { Game } from 'control-cli';

import type { 나온것 } from './authoring-game-play-spawns.js';
import type { 값기록 } from './authoring-learn-check.js';

export const 멈춤간격ms = 10_000;
/** 멈춘 순간 앞으로 돌아보는 길이 — 바뀐 것 · 게임 로그 */
const 돌아볼초 = 20;
const 실을로그 = 30;
const 실을종류 = 20;

const 까닭 = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** 멈춘 순간 — 기록 json 의 멈춤 칸. 사진은 기록이 남길 때 파일 이름으로 바뀐다 */
export interface 멈춤보고 {
  초: number;
  까닭: string;
  /** 그 순간 볼값(마지막 2초 읽기) */
  값: Record<string, number | null>;
  /** 20초 앞과 견줘 수가 바뀐 종류 — [앞, 뒤] */
  바뀐것: Record<string, [number, number]>;
  /** 20초 동안 게임 로그 — 초는 함수 시작부터 */
  로그: string[];
  사진?: string;
}

export interface 멈춤고리 {
  그친다: () => void;
  끝난다: () => Promise<{ 멈춤: 멈춤보고 | null; 사진?: Buffer; 못함: string | null }>;
}

/** 센 때 가운데 그 초 이전 마지막 것의 종류 수 — 없으면 처음 수 */
function 그때수(나온: 나온것, 초: number): Record<string, number> {
  const 때 = [...나온.센때].reverse().find((x) => x.초 <= 초);
  return { ...나온.처음, ...(때?.수 ?? {}) };
}

/** 20초 앞과 지금 사이에 수가 바뀐 종류(생김 · 사라짐 · 수 바뀜) */
export function 바뀐것(나온: 나온것 | null, 초: number): Record<string, [number, number]> {
  if (나온 === null || 나온.센때.length === 0) return {};
  const 앞 = 그때수(나온, 초 - 돌아볼초);
  const 뒤 = 그때수(나온, 초);
  const 들 = [...new Set([...Object.keys(앞), ...Object.keys(뒤)])].filter((k) => (앞[k] ?? 0) !== (뒤[k] ?? 0));
  return Object.fromEntries(들.slice(0, 실을종류).map((k) => [k, [앞[k] ?? 0, 뒤[k] ?? 0]]));
}

/**
 * 간격마다 본다 — 값 기록의 처음 어긋남(값 읽기가 2초마다 잡는다) · 판 도중 처음 보인 지도에 없는 종류. 걸리면 그 순간 사진을 찍고 멈춘다를 부른다(한 번만).
 * 게임 로그는 도는 동안 시각과 함께 모은다 — 로그의 시각은 게임 PC 시계라 서버 시계와 견줄 수 없다
 */
export function 멈춤보기시작(
  게임: Pick<Game, 'logs' | 'screenshot'>,
  시작: number,
  볼: { 값: () => 값기록; 나온: () => 나온것 | null; 로그앞: number | null },
  멈춘다: (까닭: string) => void,
  간격ms = 멈춤간격ms,
): 멈춤고리 {
  let 서있다 = true;
  let 깨운다: (() => void) | undefined;
  let 로그자리 = 볼.로그앞;
  const 로그들: { 초: number; 줄: string }[] = [];
  const 본새것 = new Set<string>();
  let 멈춤: 멈춤보고 | null = null;
  let 사진: Buffer | undefined;
  let 못함: string | null = null;
  const 로그모으기 = async (): Promise<void> => {
    if (로그자리 === null) return;
    try {
      const r = await 게임.logs(로그자리);
      const 초 = (Date.now() - 시작) / 1000;
      로그자리 = r.last;
      for (const l of r.logs) 로그들.push({ 초, 줄: `${l.type} ${l.message}` });
    } catch (e) {
      못함 ??= `게임 로그 모으기: ${까닭(e)}`;
      로그자리 = null;
    }
  };
  const 한번 = async (): Promise<void> => {
    await 로그모으기();
    // 로그를 읽는 동안 함수가 끝났다 — 끝난 판을 멈추지 않는다
    if (!서있다) return;
    const 기 = 볼.값();
    const 나온 = 볼.나온();
    // 펼치기가 끝난 이름만 — 펼치는 중에 멈추면 세기가 그쳐 펼친 글 없이 멈춘다
    const 새것 = (나온?.지도에없음 ?? []).filter((k) => !본새것.has(k) && (나온!.펼침.some((x) => x.종류 === k) || 나온!.안펼침.includes(k)));
    for (const k of 새것) 본새것.add(k);
    const 왜 = 기.어긋남 !== null ? `기대 ${기.어긋남.기대} 가 ${기.어긋남.초.toFixed(0)}초에 깨짐(${기.어긋남.값이름} ${기.어긋남.값})` : 새것.length > 0 ? `처음 보는 오브젝트 ${새것.join(' · ')}` : null;
    if (왜 === null) return;
    const 초 = (Date.now() - 시작) / 1000;
    멈춤 = { 초, 까닭: 왜, 값: { ...(기.때.at(-1)?.값 ?? {}) }, 바뀐것: 바뀐것(나온, 초), 로그: 로그들.filter((x) => x.초 >= 초 - 돌아볼초).slice(-실을로그).map((x) => `${x.초.toFixed(0)}초 ${x.줄}`) };
    서있다 = false;
    멈춘다(왜);
    try {
      사진 = await 게임.screenshot();
    } catch (e) {
      못함 ??= `멈춘 순간 사진: ${까닭(e)}`;
    }
  };
  const 고리 = (async (): Promise<void> => {
    while (서있다) {
      await new Promise<void>((다음) => {
        const 시계 = setTimeout(다음, 간격ms);
        깨운다 = (): void => {
          clearTimeout(시계);
          다음();
        };
      });
      if (!서있다) return;
      await 한번();
    }
  })();
  const 그친다 = (): void => {
    서있다 = false;
    깨운다?.();
  };
  return {
    그친다,
    끝난다: async () => {
      그친다();
      await 고리;
      return { 멈춤, ...(사진 === undefined ? {} : { 사진 }), 못함 };
    },
  };
}
