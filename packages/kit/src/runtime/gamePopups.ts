// 돌발 팝업 자동 닫기 — 막힌 게임 동작에서 조작 맵의 돌발 팝업 창이 떠 있으면 닫고 그 동작을 한 번 더 한다 (도메인/게임 §3.10 결정 31 · 「돌발 팝업 자동 닫기」)
// 케이스마다 「팝업 있으면 닫기」를 쓰지 않게 한다. 목록에 없는 창이면 지금처럼 실패다

import type { Game } from 'control-cli';

import type { GamePopup } from '../types.js';
import { stepScope } from './context.js';

type Env = Record<string, string | undefined>;

/** kit 이 보내기 전에 던진 인자 검사 오류 — 게임에 간 것이 없어 창을 닫고 다시 할 까닭이 없다(닫으면 케이스 상태와 절차 기록만 바뀐다) */
export class 인자오류 extends Error {}

/** 다시 해 보는 동작 — 누르기 · 끌기 · 글자 넣기 · 손가락 누르기 · 기다리기. 읽기(text · get)는 창에 가려도 읽혀 막히지 않는다 */
export const 다시할동작 = ['click', 'drag', 'type', 'touchDown', 'mouseMove', 'waitFor', 'waitForValue'] as const;
type 동작 = (typeof 다시할동작)[number];
// 오브젝트 주소인 인자 자리 — drag 만 둘째(to)도 주소다
const 주소자리: Record<동작, number> = { click: 1, drag: 2, type: 1, touchDown: 1, mouseMove: 1, waitFor: 1, waitForValue: 1 };

/** 러너가 넘긴 PLATFORM_GAME_POPUPS(JSON 배열)를 읽는다. 비면 빈 목록. 꼴이 틀리면 던진다 — 조용히 버리면 닫아야 할 창이 실패로 남는다 */
export function 돌발팝업읽기(env: Env): GamePopup[] {
  const 글 = env.PLATFORM_GAME_POPUPS ?? '';
  if (글 === '') return [];
  let 값: unknown;
  try {
    값 = JSON.parse(글);
  } catch (err) {
    throw new Error(`돌발 팝업 목록(PLATFORM_GAME_POPUPS)을 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
  const 맞나 = (x: unknown): x is GamePopup =>
    typeof x === 'object' && x !== null && typeof (x as GamePopup).window === 'string' && (x as GamePopup).window !== '' &&
    typeof (x as GamePopup).close === 'string' && (x as GamePopup).close !== '';
  if (!Array.isArray(값) || !값.every(맞나)) throw new Error('돌발 팝업 목록(PLATFORM_GAME_POPUPS)은 { window, close } 배열이어야 한다');
  return 값.map((p) => ({ window: p.window, close: p.close }));
}

// 케이스가 그 창 자체나 창 안 오브젝트를 다루면 닫지 않는다 — 초대 창을 확인하는 케이스에서 초대 창을 닫으면 버그를 숨긴다
const 창안인가 = (주소: string, 창: string): boolean => 주소 === 창 || 주소.startsWith(`${창}/`);
const 글 = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** 절차 기록 한 줄 — 그 절차의 통과 확인 줄로 남겨 절차 · 증적 화면에 그대로 보인다. 절차 밖이면 로그만 */
function 적는다(p: GamePopup): void {
  const 줄 = `돌발 팝업 닫음 — ${p.window}`;
  console.log(`[kit] ${줄} (${p.close} 누름)`);
  stepScope.getStore()?.assertions.push({ statement: 줄, status: 'PASS', actual: `${p.close} 누름`, expected: null });
}

/** 이름 · 선택자로 준 주소도 견줄 수 있게 경로로 푼다. 못 찾으면 준 글 그대로 — 그 주소가 팝업 경로 아래인지만 본다 */
async function 경로로(찾기: Game['find'], 주소: string): Promise<string> {
  try {
    return (await 찾기(주소))?.path ?? 주소;
  } catch {
    // 이름이 겹쳐 던지면 준 글로 견준다 — 판정에 드는 오류가 아니다
    return 주소;
  }
}

/**
 * 떠 있는 돌발 팝업을 닫고 닫은 창 목록을 돌려준다. 찾기 · 닫기가 실패한 창은 까닭을 로그에 남기고 건너뛴다 — 원래 실패를 덮지 않는다.
 * find · click 은 감싸기 전 원래 것을 받는다 — 닫기 버튼 누르기가 다시 팝업 닫기를 부르지 않게
 */
async function 닫는다(찾기: Game['find'], 누르기: Game['click'], 팝업들: readonly GamePopup[], 주소들: readonly string[]): Promise<GamePopup[]> {
  const 경로들 = [...주소들, ...(await Promise.all(주소들.map((a) => 경로로(찾기, a))))];
  const 닫은: GamePopup[] = [];
  for (const p of 팝업들) {
    try {
      const 창 = await 찾기(p.window);
      if (창 === null) continue;
      // 행이 경로가 아닌 이름으로 적혀도 찾은 경로로 견준다
      if (경로들.some((a) => 창안인가(a, p.window) || 창안인가(a, 창.path))) continue;
      await 누르기(p.close);
    } catch (err) {
      console.error(`[kit] 돌발 팝업 ${p.window} 을 닫지 못했다: ${글(err)}`);
      continue;
    }
    적는다(p);
    닫은.push(p);
  }
  return 닫은;
}

/**
 * 게임 드라이버의 동작을 감싼다 — 동작이 던지면(막힘 · 기다림 시간 초과) 돌발 팝업을 닫고 한 번만 더 한다.
 * 닫은 창이 없으면 원래 오류를, 한 번 더 해도 실패하면 그 오류를 그대로 낸다. 목록이 비면 아무것도 감싸지 않는다.
 * 끊김(답을 못 받음)이면 다시 하지 않는다 — 게임은 이미 눌렀을 수 있어 사기 버튼이 두 번 눌린다
 */
export function 돌발팝업을건다<T extends Pick<Game, 'find' | 'click'> & Record<동작, (...인자: never[]) => Promise<unknown>>>(
  드라이버: T,
  팝업들: readonly GamePopup[],
  끊김인가: (err: unknown) => boolean = () => false,
): void {
  if (팝업들.length === 0) return;
  const 찾기 = 드라이버.find.bind(드라이버);
  const 누르기 = 드라이버.click.bind(드라이버);
  for (const 이름 of 다시할동작) {
    const 원래 = (드라이버[이름] as (...인자: unknown[]) => Promise<unknown>).bind(드라이버);
    const 감싼 = async (...인자: unknown[]): Promise<unknown> => {
      try {
        return await 원래(...인자);
      } catch (err) {
        if (끊김인가(err) || err instanceof 인자오류) throw err;
        const 주소들 = 인자.slice(0, 주소자리[이름]).filter((a): a is string => typeof a === 'string');
        if ((await 닫는다(찾기, 누르기, 팝업들, 주소들)).length === 0) throw err;
        return await 원래(...인자);
      }
    };
    Object.assign(드라이버, { [이름]: 감싼 });
  }
}
