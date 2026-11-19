// 게임 케이스가 게임 안 SDK 에 붙는 부품 — 디바이스 팜 게임 명령 주소 · USB adb forward 두 길 (도메인/게임 §3.10 「게임 연결」)

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { isDeepStrictEqual } from 'node:util';

import type { Game, Link, WaitOptions } from 'control-cli';

import { runDir, saveShot } from './artifacts.js';
import { 돌발팝업읽기, 돌발팝업을건다 } from './gamePopups.js';
import { FARM_EVIDENCE_DIR, GAME_ERRORS_FILE, GAME_TREE_FILE } from './protocol.js';

type Env = Record<string, string | undefined>;

/**
 * 몸통의 game. 꼴은 control-cli 의 Game 에서 고른 메서드(find · click · drag · type · text · get · waitFor · layout · errors · touchDown · touchUp)에 kit 의 waitForValue 를 더한 것이다 (정본은 공통/3-공유계약 「게임 테스트 타입」).
 * 고른 것만 낸다 — control-cli 0.7 부터 좌표를 받는 명령(findAt · swipe · 좌표 터치 · call)이 생겼는데 케이스는 좌표를 쓰지 않는다(도메인/게임 결정 4). 0.8 로 올려도 케이스가 쓰는 꼴은 그대로다
 * waitForValue — 「값이 될 때까지」. SDK 에 기다리기 명령이 없어 get 을 waitFor 와 같은 간격 · 한도로 되풀이한다 (도메인/게임 §3.10 「케이스 꼴」 기다림)
 * touchDown · touchUp — 「손가락을 올려 둔 동안만 보이는 것」(말풍선). 길게 누르기(longPress)는 눌렀다 뗀 뒤에 답해 그 사이 뜬 것을 못 본다.
 * control-cli 의 touchDown 은 좌표도 받아서 Pick 으로 내지 않고 주소만 받는 꼴로 좁혀 낸다 (2026-11-17 Boss Room 말풍선 케이스 2건 보류)
 * key · keyDown · keyUp · pad — 윈도우 PC 게임의 키보드 · 패드 (공통/3-공유계약 「윈도우 PC 게임」). power(GetAxis 값)는 내지 않는다.
 * pad 는 읽기만 한다 — 패드를 바꾸는 길은 러너가 넘긴 PLATFORM_PAD 하나뿐이다(도메인/게임 §3.10 결정 27)
 */
export type GameDriver = Pick<Game, 'find' | 'click' | 'drag' | 'type' | 'text' | 'get' | 'waitFor' | 'layout' | 'errors' | 'touchUp' | 'keyUp'> & {
  touchDown(target: string, options?: Parameters<Game['touchDown']>[1]): Promise<number>;
  key(name: string, options?: { duration?: number }): Promise<void>;
  keyDown(keys: string): Promise<void>;
  pad(): Promise<{ type: PadKind | 'off'; buttons?: Record<string, string> }>;
  waitForValue(target: string, prop: string, value: unknown, options?: Pick<WaitOptions, 'timeoutMs'>): Promise<void>;
};
/**
 * 입력을거둔다 — 케이스가 touchUp · keyUp 전에 끝나도(실패 · 제한 시간) 정리 단계가 눌러 둔 손가락 · 키를 거둔다.
 * pad · keyDown 은 kit 이 덮어 인자를 덜 받는다 — 타입에 Game 의 원래 꼴이 남아 있어 덮은 쪽이 남는 인자를 받으면 던진다
 */
export type KitGame = Game & Pick<GameDriver, 'waitForValue' | 'pad'> & { 입력을거둔다(): Promise<void> };

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

/** 앱을 켠 뒤 게임이 답할 때까지 ping 을 되풀이한다. 팜이 4xx 로 거절하면(잡은 사람 아님 · 다시 켜는 중) 기다려도 안 바뀌어 바로 던진다 — 잠깐 막힌 408 · 429 는 기다린다 */
export async function openGame(
  env: Env,
  link?: Link,
  쉬기: (ms: number) => Promise<void> = (ms) => new Promise((깨운다) => setTimeout(깨운다, ms)),
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
  const 누르기 = game.touchDown.bind(game);
  const 떼기 = game.touchUp.bind(game);
  const 키누르기 = game.keyDown.bind(game);
  const 키떼기 = game.keyUp.bind(game);
  const 패드 = game.pad.bind(game);
  const 드라이버: KitGame = Object.assign(game, {
    waitForValue,
    touchDown: async (target: string, options?: Parameters<Game['touchDown']>[1]): Promise<number> => {
      // 타입만으로는 캐스트한 좌표가 지나간다 — 케이스는 좌표를 쓰지 않는다 (도메인/게임 결정 4)
      if (typeof target !== 'string') throw new Error('touchDown 은 오브젝트 주소만 받는다 — 좌표로 누르지 않는다');
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
    pad: async (...인자: unknown[]) => {
      // 패드는 케이스 선언이 정한다 — pad('xbox') 를 조용히 읽기로 바꾸면 그 뒤 Pad.<이름> 이 다른 패드 글자로 간다
      if (인자.length > 0) throw new Error('game.pad() 는 읽기만 한다 — 패드는 케이스 선언이 정한다');
      const { pad } = await 패드();
      // kit 은 generic 을 고르지 않는다(PLATFORM_PAD 는 넷 중 하나) — 그 밖의 값은 SDK 가 준 그대로 싣는다
      return { type: pad.type as PadKind | 'off', ...(pad.buttons && { buttons: pad.buttons }) };
    },
    입력을거둔다: async (): Promise<void> => {
      if (눌린.size === 0 && 눌린키.size === 0 && !모름) return;
      try {
        // 진짜로 뗀 것처럼 하나씩 뗀다 — 입력 거두기(input-reset)는 누름을 「취소」해 게임의 떼기 처리가 안 돌 수 있다. 번호를 모르거나 떼기가 실패한 것만 거둔다
        let 거둘것 = 모름;
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
      } catch (err) {
        // 이미 난 판정을 덮지 않는다. 못 거둔 것은 남겨 두어 다음 정리(E2E 다음 단계 끝)가 다시 해 본다
        console.error(`[kit] 눌러 둔 손가락 · 키를 떼지 못했다: ${글(err)}`);
      }
    },
  });
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
  // 실행 창에서 고른 패드 — 몸통 앞에 한 번 정한다. 폰 · 패드 없음은 빈 값이다 (공통/3-공유계약 「윈도우 PC 게임」)
  const 패드값 = env.PLATFORM_PAD ?? '';
  if (패드값 !== '') {
    if (!(PAD_KINDS as readonly string[]).includes(패드값)) throw new Error(`모르는 패드다: PLATFORM_PAD=${패드값}`);
    await 패드(패드값 as PadKind);
  }
  돌발팝업을건다(드라이버, 팝업들, (err) => typeof err === 'object' && err !== null && 끊김.has(err));
  return 드라이버;
}

/** 윈도우 PC 항목의 단계 · 실패 스크린샷 — Appium 이 없어 게임이 프레임 끝에서 찍은 화면을 쓴다 (공통/3-공유계약 「윈도우 PC 게임」) */
export function captureGame(game: Game, seq: number): Promise<string | undefined> {
  return saveShot(seq, async (path) => writeFile(path, await game.screenshot('png')));
}

/**
 * 통과 못 한 항목의 두 파일을 팜 증적 폴더에 둔다 — 화면 영상 · logcat 과 같은 「받기」 줄에 뜬다.
 * 오브젝트 목록은 케이스가 쓰는 주소(경로) 그대로라 「이름이 바뀌었나 · 창이 안 열렸나」를 바로 본다. 무엇이 실패해도 던지지 않는다 — 이미 난 판정을 덮지 않는다
 */
// since — E2E 시나리오는 단계 사이에 게임을 다시 켜지 않아, 그 단계가 시작할 때 받아 둔 last 를 넘겨 그 단계 몫만 남긴다 (도메인/시나리오 §3.7 결정 16)
// 안정화 — 정기 실행(PLATFORM_STABILITY=1)이면 통과 항목도 오류 파일을 남긴다. 통과면 오브젝트 목록은 빼고 Exception 만 남기고,
// 오류가 없어도 머리 줄만 있는 파일을 만든다 — 안정화 집계가 「못 읽음」과 「없음」을 가른다 (도메인/안정화 §3.15 결정 3 · 「집계」 분모)
export async function 게임증적을남긴다(game: Game, runId: string, historyId: string, since = 0, 안정화?: { 통과: boolean }): Promise<void> {
  // 내 컴퓨터 테스트 실행은 admin 이 이 폴더를 못 본다
  if (runId === '0') return;
  const { flatten } = await import('control-cli');
  const 폴더 = join(runDir(runId, historyId), FARM_EVIDENCE_DIR);
  const 남긴다 = async (이름: string, 만든다: () => Promise<string | null>): Promise<void> => {
    try {
      const 내용 = await 만든다();
      if (내용 === null) return;
      await mkdir(폴더, { recursive: true });
      await writeFile(join(폴더, 이름), 내용);
    } catch (err) {
      console.error(`[kit] 게임 증적 ${이름} 을 남기지 못했다: ${글(err)}`);
    }
  };
  if (안정화?.통과 !== true) await 남긴다(GAME_TREE_FILE, async () => {
    const t = await game.tree();
    const 줄들 = flatten(t.tree).map(
      (e) => `${e.path}${e.node.text === undefined ? '' : ` ${JSON.stringify(e.node.text)}`}${e.node.interactable === false ? ' 잠김' : ''}`,
    );
    return [`# 장면 ${t.scene} · 화면 ${t.screen[0]}×${t.screen[1]} · 켜진 오브젝트 ${줄들.length}개`, ...줄들, ''].join('\n');
  });
  // 항목마다 앱을 끄고 다시 켜서(app.ts 앱을켠다 — 게임 연결은 noReset) 0 부터 읽으면 이 케이스 동안의 것만 온다. 없으면 파일을 안 만든다(안정화는 머리 줄만)
  await 남긴다(GAME_ERRORS_FILE, async () => {
    const r = await game.errors(since);
    const 오류 = 안정화?.통과 === true ? r.errors.filter((e) => e.type === 'Exception') : r.errors;
    if (오류.length === 0 && 안정화 === undefined) return null;
    const 머리 = [
      안정화?.통과 === true ? `# 게임 Exception ${오류.length}개 — 통과 항목이라 Exception 만 남겼습니다` : `# 게임 오류 ${오류.length}개`,
      ...(r.dropped ? [`# 앞의 ${r.dropped}개는 게임이 들고 있는 수(200)를 넘겨 밀려났습니다`] : []),
      ...(r.restarted ? ['# 케이스 도중 게임이 다시 켜졌습니다'] : []),
    ];
    // 시각은 SDK 0.7 부터 오는 UTC occurredAt 을 앞세운다 — 안정화 집계가 단계를 맞춘다. 메시지는 한 줄로 접어 다음 줄부터가 스택이 되게 한다
    return [...머리, ...오류.map((e) => `\n#${e.seq} ${e.occurredAt ?? e.time} ${e.type}: ${e.message.replace(/\s*\n\s*/g, ' ')}\n${e.stack}`), ''].join('\n');
  });
}
