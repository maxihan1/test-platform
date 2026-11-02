// 게임 케이스가 게임 안 SDK 에 붙는 부품 — 디바이스 팜 게임 명령 주소 · USB adb forward 두 길 (도메인/게임 §3.10 「게임 연결」)

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { isDeepStrictEqual } from 'node:util';

import type { Game, Link, WaitOptions } from 'control-cli';

import { runDir } from './artifacts.js';
import { FARM_EVIDENCE_DIR, GAME_ERRORS_FILE, GAME_TREE_FILE } from './protocol.js';

type Env = Record<string, string | undefined>;

/**
 * 몸통의 game. 꼴의 정본은 control-cli 의 Game 에서 ping · tree · tap(좌표)을 뺀 것에 kit 의 waitForValue 하나를 더한 것이다 (공통/3-공유계약 「게임 테스트 타입」).
 * waitForValue — 「값이 될 때까지」. SDK 에 기다리기 명령이 없어 get 을 waitFor 와 같은 간격 · 한도로 되풀이한다 (도메인/게임 §3.10 「케이스 꼴」 기다림)
 */
export type GameDriver = Omit<Game, 'ping' | 'tree' | 'tap'> & {
  waitForValue(target: string, prop: string, value: unknown, options?: Pick<WaitOptions, 'timeoutMs'>): Promise<void>;
};
export type KitGame = Game & Pick<GameDriver, 'waitForValue'>;

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
  const game = new Game(link ?? (await gameLink(env)));
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
  const 드라이버: KitGame = Object.assign(game, { waitForValue });
  const 끝 = Date.now() + 켜짐.timeoutMs;
  for (;;) {
    try {
      await game.ping();
      return 드라이버;
    } catch (err) {
      // 원문을 남겨야 실패 유형이 「환경 오류」로 가른다 (reporting/failureType.ts)
      if (/HTTP 4(?!08|29)\d\d/.test(글(err)) || Date.now() >= 끝) throw new Error(`게임이 ${켜짐.timeoutMs / 1000}초 안에 답하지 않았습니다 — ${글(err)}`);
      await 쉬기(켜짐.intervalMs);
    }
  }
}

/**
 * 통과 못 한 항목의 두 파일을 팜 증적 폴더에 둔다 — 화면 영상 · logcat 과 같은 「받기」 줄에 뜬다.
 * 오브젝트 목록은 케이스가 쓰는 주소(경로) 그대로라 「이름이 바뀌었나 · 창이 안 열렸나」를 바로 본다. 무엇이 실패해도 던지지 않는다 — 이미 난 판정을 덮지 않는다
 */
// since — E2E 시나리오는 단계 사이에 게임을 다시 켜지 않아, 그 단계가 시작할 때 받아 둔 last 를 넘겨 그 단계 몫만 남긴다 (도메인/시나리오 §3.7 결정 16)
export async function 게임증적을남긴다(game: Game, runId: string, historyId: string, since = 0): Promise<void> {
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
  await 남긴다(GAME_TREE_FILE, async () => {
    const t = await game.tree();
    const 줄들 = flatten(t.tree).map(
      (e) => `${e.path}${e.node.text === undefined ? '' : ` ${JSON.stringify(e.node.text)}`}${e.node.interactable === false ? ' 잠김' : ''}`,
    );
    return [`# 장면 ${t.scene} · 화면 ${t.screen[0]}×${t.screen[1]} · 켜진 오브젝트 ${줄들.length}개`, ...줄들, ''].join('\n');
  });
  // 항목마다 앱을 다시 켜서(appCapabilities) 0 부터 읽으면 이 케이스 동안의 것만 온다. 없으면 파일을 안 만든다
  await 남긴다(GAME_ERRORS_FILE, async () => {
    const r = await game.errors(since);
    if (r.errors.length === 0) return null;
    const 머리 = [
      `# 게임 오류 ${r.errors.length}개`,
      ...(r.dropped ? [`# 앞의 ${r.dropped}개는 게임이 들고 있는 수(200)를 넘겨 밀려났습니다`] : []),
      ...(r.restarted ? ['# 케이스 도중 게임이 다시 켜졌습니다'] : []),
    ];
    return [...머리, ...r.errors.map((e) => `\n#${e.seq} ${e.time} ${e.type}: ${e.message}\n${e.stack}`), ''].join('\n');
  });
}
