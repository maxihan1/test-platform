// 게임 케이스가 게임 안 SDK 에 붙는 부품 — 디바이스 팜 게임 명령 주소 · USB adb forward 두 길 (도메인/게임 §3.10 「게임 연결」)

import { isDeepStrictEqual } from 'node:util';

import type { Game, Link, WaitOptions } from 'control-cli';

import { 함수를적게건다 } from './gameFns.js';
import { 돌발팝업읽기, 돌발팝업을건다, 인자오류 } from './gamePopups.js';

// 실패 증적은 따로 둔 파일에 있다 — 가져다 쓰는 곳(test.ts · appFixture.ts)과 테스트 가짜가 game.js 를 보므로 여기서 다시 내보낸다
export { captureGame, 게임증적을남긴다 } from './gameEvidence.js';

type Env = Record<string, string | undefined>;

/**
 * 몸통의 game. 꼴은 control-cli 의 Game 에서 고른 메서드(find · findAll · click · drag · type · text · get · components · members · waitFor · layout · errors · touchDown · touchUp)에 kit 의 waitForValue 를 더한 것이다 (정본은 공통/3-공유계약 「게임 테스트 타입」).
 * 고른 것만 낸다 — control-cli 0.7 부터 좌표를 받는 명령(findAt · swipe · 좌표 터치 · call)이 생겼는데 케이스는 좌표를 쓰지 않는다(도메인/게임 결정 4). 0.8 로 올려도 케이스가 쓰는 꼴은 그대로다
 * findAll · components · members — 읽기만 한다. 같은 이름이 여럿 나온 오브젝트(웨이브의 적 10마리)를 하나씩 고르고, 칸 이름을 몰라도 컴포넌트 · 칸 목록을 펼쳐 값을 본다(도메인/게임 §3.10 「게임 정보 먼저 쌓기」 · 2026-11-27 사용자 「러너도 값을 다 볼 수 있도록」). 메서드 부르기(callMethod · callStatic)는 내지 않는다 — 판정 동작을 함수로 끝내지 않는다(결정 37)
 * waitForValue — 「값이 될 때까지」. SDK 에 기다리기 명령이 없어 get 을 waitFor 와 같은 간격 · 한도로 되풀이한다 (도메인/게임 §3.10 「케이스 꼴」 기다림)
 * touchDown · touchUp — 「손가락을 올려 둔 동안만 보이는 것」(말풍선). 길게 누르기(longPress)는 눌렀다 뗀 뒤에 답해 그 사이 뜬 것을 못 본다.
 * control-cli 의 touchDown 은 좌표도 받아서 Pick 으로 내지 않고 주소만 받는 꼴로 좁혀 낸다 (2026-11-17 Boss Room 말풍선 케이스 2건 보류)
 * key · keyDown · keyUp · pad — 윈도우 PC 게임의 키보드 · 패드 (공통/3-공유계약 「윈도우 PC 게임」). power(GetAxis 값)는 내지 않는다.
 * pad 는 읽기만 한다 — 패드를 바꾸는 길은 러너가 넘긴 PLATFORM_PAD 하나뿐이다(도메인/게임 §3.10 결정 27)
 * mouseMove · scroll — 가짜 마우스를 오브젝트 위로 옮기기 · 휠. 마우스를 올려야 뜨는 말풍선 · 휠 확대 · 오른쪽 클릭(옮긴 뒤 key('Mouse1'))을 PC 케이스가 쓴다. 주소만 받는다(결정 4)
 * restart — 케이스 도중 게임 껐다 켜기. PC 는 VISION, 폰은 Appium 이라 케이스 몸통이 driver 없이 같은 한 줄로 쓴다 (공통/3-공유계약 「게임 테스트 타입」 2026-11-22)
 */
export type GameDriver = Pick<Game, 'find' | 'findAll' | 'click' | 'drag' | 'type' | 'text' | 'get' | 'components' | 'members' | 'waitFor' | 'layout' | 'errors' | 'touchUp' | 'keyUp'> & {
  touchDown(target: string, options?: Parameters<Game['touchDown']>[1]): Promise<number>;
  key(name: string, options?: { duration?: number }): Promise<void>;
  keyDown(keys: string): Promise<void>;
  mouseMove(target: string, options?: { duration?: number }): Promise<void>;
  scroll(dy: number, options?: { at?: string; duration?: number }): Promise<void>;
  restart(): Promise<void>;
  pad(): Promise<{ type: PadKind | 'off'; buttons?: Record<string, string> }>;
  waitForValue(target: string, prop: string, value: unknown, options?: Pick<WaitOptions, 'timeoutMs'>): Promise<void>;
};
/**
 * 입력을거둔다 — 케이스가 touchUp · keyUp 전에 끝나도(실패 · 제한 시간) 정리 단계가 눌러 둔 손가락 · 키 · 옮긴 가짜 마우스를 거둔다.
 * pad · keyDown · mouseMove · scroll 은 kit 이 덮어 인자를 덜 받는다 — 타입에 Game 의 원래 꼴이 남아 있어 덮은 쪽이 남는 인자를 받으면 던진다
 */
// 다시켜기전오류를꺼낸다 — restart 앞 게임이 남긴 오류(다시 켤 때마다 한 묶음). 실패 증적이 꺼내 합친다 — 새 게임은 오류 번호가 1 부터라 그대로는 사라진다
export type KitGame = Game & Pick<GameDriver, 'waitForValue' | 'pad' | 'restart'> & { 입력을거둔다(): Promise<void>; 다시켜기전오류를꺼낸다(): 게임오류[][] };
export type 게임오류 = Awaited<ReturnType<Game['errors']>>['errors'][number];

export const PAD_KINDS = ['ps5', 'ps4', 'switch', 'xbox'] as const;
export type PadKind = (typeof PAD_KINDS)[number];

export const isGame = (env: Env): boolean => env.PLATFORM_ENGINE === 'GAME';

// 앱을 켠 뒤 게임이 포트를 열기까지 — 큰 게임은 첫 장면까지 수십 초 걸린다
export const 켜짐 = { timeoutMs: 120_000, intervalMs: 1_000 };

// fetch 는 주소 안 계정을 거절한다. 계정은 머리로 옮기고, 게임 명령 주소는 Appium 주소에서 /wd/hub 를 뗀 곳이다 (Devicefarm 안내서 12절).
// 인증 켠 팜은 토큰(PLATFORM_APPIUM_TOKEN)을 Bearer 로 받는다 — 둘 다 있으면 토큰이 앞선다 (도메인/러너 §5.2 「디바이스 팜 접속 방식」)
export function 팜원점(appiumUrl: string, token: string | undefined): { base: string; headers: Record<string, string> } {
  const url = new URL(appiumUrl);
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (url.username !== '') {
    const 계정 = `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;
    headers.Authorization = `Basic ${Buffer.from(계정).toString('base64')}`;
  }
  url.username = '';
  url.password = '';
  return { base: url.toString().replace(/\/+$/, '').replace(/\/wd\/hub$/, ''), headers };
}

/** 길은 러너가 정해 PLATFORM_GAME_LINK 로 넘긴다 — 팜 폰을 잡아 번호를 실은 정식 실행은 farm, 내 컴퓨터 테스트 실행은 usb */
export async function gameLink(env: Env): Promise<Link> {
  const { farmLink, usbLink } = await import('control-cli');
  if (env.PLATFORM_GAME_LINK === 'farm') {
    const serial = env.PLATFORM_DEVICE_UDID;
    const appium = env.PLATFORM_APPIUM_URL;
    if (!serial || !appium) throw new Error('Device VISION 게임 명령을 보내려면 PLATFORM_APPIUM_URL 과 PLATFORM_DEVICE_UDID 가 필요하다');
    const { base, headers } = 팜원점(appium, env.PLATFORM_APPIUM_TOKEN);
    return farmLink(base, headers, serial);
  }
  if (env.PLATFORM_GAME_LINK === 'usb') return usbLink(env.PLATFORM_DEVICE_UDID || undefined);
  throw new Error(`게임에 닿는 길을 모른다: PLATFORM_GAME_LINK=${env.PLATFORM_GAME_LINK ?? ''}`);
}

const 글 = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * 앱을 켠 뒤 게임이 답할 때까지 ping 을 되풀이한다. 팜이 4xx 로 거절하면(잡은 사람 아님 · 다시 켜는 중) 기다려도 안 바뀌어 바로 던진다 — 잠깐 막힌 408 · 429 는 기다린다.
 * 끄고켜기 — game.restart() 가 부를 껐다 켜기. 여는 쪽(PC · 폰)이 넘기고, 켜진 뒤 기다리기 · 패드는 여기서 한다
 */
export async function openGame(
  env: Env,
  link?: Link,
  쉬기: (ms: number) => Promise<void> = (ms) => new Promise((깨운다) => setTimeout(깨운다, ms)),
  끄고켜기?: () => Promise<void>,
): Promise<KitGame> {
  const { Game, WAIT } = await import('control-cli');
  // 꼴이 틀리면 게임에 붙기 전에 던진다 — 러너가 늘 맞는 꼴을 넘긴다
  const 팝업들 = 돌발팝업읽기(env);
  // 길이 던진 오류(답을 못 받음)를 표시한다 — 게임이 실패로 답한 것과 달리 게임은 이미 했을 수 있어 돌발 팝업 닫기가 다시 하지 않는다
  const 끊김 = new WeakSet<object>();
  const 길 = link ?? (await gameLink(env));
  const game = new Game(async (cmd) => {
    try {
      return await 길(cmd);
    } catch (err) {
      if (typeof err === 'object' && err !== null) 끊김.add(err);
      throw err;
    }
  });
  // 문구는 waitFor 의 글자 기다림과 같은 꼴이라야 실패 유형이 「시간 초과」로 가른다 (reporting/failureType.ts)
  const waitForValue: GameDriver['waitForValue'] = async (target, prop, value, options = {}) => {
    const timeoutMs = options.timeoutMs ?? WAIT.timeoutMs;
    const 끝 = Date.now() + timeoutMs;
    for (;;) {
      // 오브젝트가 아직 안 떴으면 get 이 던진다 — 그것도 「아직 아님」이라 한도까지 다시 본다. 마지막 까닭은 문구에 남겨 실패 유형이 가른다
      let 마지막: string;
      try {
        const 지금 = await game.get(target, prop);
        if (isDeepStrictEqual(지금, value)) return;
        마지막 = JSON.stringify(지금);
      } catch (err) {
        마지막 = 글(err);
      }
      if (Date.now() >= 끝) {
        throw new Error(`${target}.${prop} 이 ${timeoutMs / 1000}초 안에 「${JSON.stringify(value)}」이 되지 않았습니다 (마지막: ${마지막})`);
      }
      await 쉬기(WAIT.intervalMs);
    }
  };
  // 눌러 둔 손가락 번호 · 키 — E2E 는 단계 사이에 앱을 다시 켜지 않아, 떼지 않고 끝난 입력이 다음 단계까지 눌린 채 남는다
  const 눌린 = new Set<number>();
  const 눌린키 = new Set<string>();
  // 누르기 답을 못 받았다(끊김 · 제한 시간) — 게임에서는 눌렸을 수 있어 번호를 몰라도 거둔다
  let 모름 = false;
  // 가짜 마우스를 켰다 — 끄는 길은 입력 거두기(input-reset)뿐이다. 안 끄면 E2E 다음 단계의 진짜 · 가짜 입력이 옛 자리에서 시작한다
  let 마우스 = false;
  const 다시켜기전오류: 게임오류[][] = [];
  const 누르기 = game.touchDown.bind(game);
  const 떼기 = game.touchUp.bind(game);
  const 키누르기 = game.keyDown.bind(game);
  const 키떼기 = game.keyUp.bind(game);
  const 마우스옮기기 = game.mouseMove.bind(game);
  const 바퀴 = game.scroll.bind(game);
  const 패드 = game.pad.bind(game);
  // 게임이 ping 에 답할 때까지 기다리고 실행 창에서 고른 패드를 정한다 — 처음 열 때와 케이스 도중 다시 켠 뒤 (공통/3-공유계약 「윈도우 PC 게임」)
  const 켜질때까지 = async (): Promise<void> => {
    const 끝 = Date.now() + 켜짐.timeoutMs;
    for (;;) {
      try {
        await game.ping();
        break;
      } catch (err) {
        // 원문을 남겨야 실패 유형이 「환경 오류」로 가른다 (reporting/failureType.ts)
        if (/HTTP 4(?!08|29)\d\d/.test(글(err)) || Date.now() >= 끝) throw new Error(`게임이 ${켜짐.timeoutMs / 1000}초 안에 답하지 않았습니다 — ${글(err)}`);
        await 쉬기(켜짐.intervalMs);
      }
    }
    const 패드값 = env.PLATFORM_PAD ?? '';
    if (패드값 !== '') {
      if (!(PAD_KINDS as readonly string[]).includes(패드값)) throw new Error(`모르는 패드다: PLATFORM_PAD=${패드값}`);
      await 패드(패드값 as PadKind);
    }
  };
  const 드라이버: KitGame = Object.assign(game, {
    waitForValue,
    touchDown: async (target: string, options?: Parameters<Game['touchDown']>[1]): Promise<number> => {
      // 타입만으로는 캐스트한 좌표가 지나간다 — 케이스는 좌표를 쓰지 않는다 (도메인/게임 결정 4)
      if (typeof target !== 'string') throw new 인자오류('touchDown 은 오브젝트 주소만 받는다 — 좌표로 누르지 않는다');
      모름 = true;
      const 번호 = await 누르기(target, options);
      모름 = false;
      눌린.add(번호);
      return 번호;
    },
    touchUp: async (번호: number): Promise<void> => {
      await 떼기(번호);
      눌린.delete(번호);
    },
    // 몸통은 power 를 못 넘긴다 — 타입을 피해 넘긴 값을 조용히 버리지 않고 던진다
    keyDown: async (keys: string, ...더: unknown[]): Promise<void> => {
      if (더.length > 0) throw new Error('keyDown 은 키만 받는다 — power 는 쓰지 않는다');
      모름 = true;
      await 키누르기(keys);
      모름 = false;
      눌린키.add(keys);
    },
    keyUp: async (keys: string): Promise<void> => {
      await 키떼기(keys);
      눌린키.delete(keys);
    },
    mouseMove: async (target: string, ...더: unknown[]): Promise<void> => {
      if (typeof target !== 'string') throw new 인자오류('mouseMove 는 오브젝트 주소만 받는다 — 좌표로 옮기지 않는다');
      const 옵션 = (더[0] ?? {}) as Record<string, unknown>;
      if (더.length > 1 || Object.keys(옵션).some((k) => k !== 'duration')) throw new 인자오류('mouseMove 는 주소와 duration 만 받는다');
      마우스 = true;
      await 마우스옮기기(target, 옵션 as { duration?: number });
    },
    scroll: async (dy: number, ...더: unknown[]): Promise<void> => {
      const 옵션 = (더[0] ?? {}) as Record<string, unknown>;
      if (typeof dy !== 'number' || !Number.isFinite(dy)) throw new 인자오류(`scroll 의 칸 수는 수다: ${String(dy)}`);
      if (더.length > 1 || Object.keys(옵션).some((k) => k !== 'at' && k !== 'duration')) throw new 인자오류('scroll 은 칸 수와 at · duration 만 받는다');
      if (옵션.at !== undefined && typeof 옵션.at !== 'string') throw new 인자오류('scroll 의 at 은 오브젝트 주소만 받는다 — 좌표로 옮기지 않는다');
      // 가짜 마우스는 자리를 준 휠만 켠다(SDK FakeMouse) — 자리 없는 휠은 거둘 것이 없다
      if (옵션.at !== undefined) 마우스 = true;
      await 바퀴(dy, 옵션 as { at?: string; duration?: number });
    },
    restart: async (): Promise<void> => {
      if (끄고켜기 === undefined) throw new Error('이 연결은 게임을 다시 켤 길이 없다 — PC · 폰 항목에서만 쓴다');
      // 끄면 그 게임의 오류 기록도 사라진다 — 못 읽어도 다시 켜기는 한다(증적은 「다시 켜졌다」 머리 줄로 남는다)
      try {
        다시켜기전오류.push((await game.errors(0)).errors ?? []);
      } catch (err) {
        다시켜기전오류.push([]);
        console.error(`[kit] 다시 켜기 전 게임 오류를 읽지 못했다: ${글(err)}`);
      }
      await 끄고켜기();
      // 게임을 다시 켜면 눌린 입력 · 가짜 마우스도 같이 사라진다 — 정리 단계가 없는 손가락을 떼지 않게 비운다
      눌린.clear();
      눌린키.clear();
      모름 = false;
      마우스 = false;
      await 켜질때까지();
    },
    pad: async (...인자: unknown[]) => {
      // 패드는 케이스 선언이 정한다 — pad('xbox') 를 조용히 읽기로 바꾸면 그 뒤 Pad.<이름> 이 다른 패드 글자로 간다
      if (인자.length > 0) throw new Error('game.pad() 는 읽기만 한다 — 패드는 케이스 선언이 정한다');
      const { pad } = await 패드();
      // kit 은 generic 을 고르지 않는다(PLATFORM_PAD 는 넷 중 하나) — 그 밖의 값은 SDK 가 준 그대로 싣는다
      return { type: pad.type as PadKind | 'off', ...(pad.buttons && { buttons: pad.buttons }) };
    },
    다시켜기전오류를꺼낸다: (): 게임오류[][] => 다시켜기전오류.splice(0),
    입력을거둔다: async (): Promise<void> => {
      if (눌린.size === 0 && 눌린키.size === 0 && !모름 && !마우스) return;
      try {
        // 진짜로 뗀 것처럼 하나씩 뗀다 — 입력 거두기(input-reset)는 누름을 「취소」해 게임의 떼기 처리가 안 돌 수 있다. 번호를 모르거나 떼기가 실패한 것 · 가짜 마우스만 거둔다
        let 거둘것 = 모름 || 마우스;
        for (const 번호 of [...눌린]) {
          try {
            await 떼기(번호);
            눌린.delete(번호);
          } catch {
            거둘것 = true;
          }
        }
        for (const 키 of [...눌린키]) {
          try {
            await 키떼기(키);
            눌린키.delete(키);
          } catch {
            거둘것 = true;
          }
        }
        if (거둘것) await game.resetInput();
        눌린.clear();
        눌린키.clear();
        모름 = false;
        마우스 = false;
      } catch (err) {
        // 이미 난 판정을 덮지 않는다. 못 거둔 것은 남겨 두어 다음 정리(E2E 다음 단계 끝)가 다시 해 본다
        console.error(`[kit] 눌러 둔 손가락 · 키를 떼지 못했다: ${글(err)}`);
      }
    },
  });
  await 켜질때까지();
  돌발팝업을건다(드라이버, 팝업들, (err) => typeof err === 'object' && err !== null && 끊김.has(err));
  함수를적게건다(드라이버);
  return 드라이버;
}
