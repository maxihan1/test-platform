// Android 앱 · 게임 케이스의 Appium 연결(과 게임 SDK 연결) · 윈도우 PC 게임을 열고 닫는 Playwright fixture (도메인/러너 §5.2 「앱 실행」 · 「윈도우 PC 게임 항목」 · 도메인/게임 §3.10 「게임 연결」)

import { test as base } from '@playwright/test';

import { closeApp, type AppDriver, type AppOpenOptions } from './app.js';
import { 게임증적을남긴다, type KitGame } from './game.js';
import { 폰장면걸기, type 장면 } from './live.js';
import { 폰을연다 } from './phone.js';
import { PC를끈다, PC를연다 } from './pc.js';
import { DEVICE_ATTACHMENT } from './protocol.js';

// 윈도우 PC 항목에는 Appium 연결이 없다 — VISION 의 /wd/hub 는 PC 에 400 이다
export type AppSide = { driver: AppDriver; game?: KitGame } | { game: KitGame };
// pc — 그 항목의 프로젝트가 windows* 다. 본문이 프로젝트 이름을 보고 고른다(test.ts)
type 여는값 = AppOpenOptions & { pc?: true };

// 케이스마다 만든다 — 앞 판처럼 defineTest 가 부를 때 extend 한다
export const 앱테스트 = () =>
  base.extend<{ appSession: { open(options?: 여는값): Promise<AppSide>; 끝정리를건다(끝: () => Promise<void>): void; 마감을건다(마감: () => void): void } }>({
    appSession: async ({}, use, testInfo) => {
      // 여는 중인 약속을 쥐어야 한다. 새 폰은 첫 연결에 도우미 앱을 깔아 오래 걸려, 열리는 도중 제한 시간이 오면 Appium 이 뒤늦게 세션을 만든다
      let opening: Promise<AppSide> | undefined;
      // 폰 장면 — 연 직후 걸고 닫기 전에 끈다. 러너가 장면 파일을 준 실행(테스트 모드 · 정식 실행)에만 걸린다
      let 폰장면: 장면 | undefined;
      // 기기 정보는 연 직후 한 번 남긴다 — 리포터가 결과 줄 device 로 싣는다 (도메인/리포팅 §8.4 · APP-F1-05)
      const 열고남긴다 = async ({ pc, ...options }: 여는값 = {}): Promise<AppSide> => {
        const { device, ...side } = pc ? await PC를연다(process.env) : await 폰을연다(process.env, options);
        // 여기서 던지면 열린 연결을 아무도 못 닫는다(opening 이 실패로 끝난다). 남기지 못한 것만 알린다
        if (device !== undefined) {
          try {
            await testInfo.attach(DEVICE_ATTACHMENT, { body: JSON.stringify(device), contentType: 'application/json' });
          } catch (err) {
            console.error(`[kit] 기기 정보를 남기지 못했다: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        if ('driver' in side) 폰장면 = await 폰장면걸기(side.driver);
        return side;
      };
      // test.cleanup 의 끝 정리 — 실패 증적 뒤 · 연결을 닫기 전에 돈다 (공통/3-공유계약 「게임 시나리오 도구」)
      let 끝: (() => Promise<void>) | undefined;
      // 프로시저가 한도에 끊긴 케이스의 판정을 가르는 자리 — 연결을 열기 전이나 여는 도중에 끊겨도 돌아야 해 끝 정리와 따로 둔다 (procedure.ts)
      let 마감: (() => void) | undefined;
      await use({ open: (options) => (opening ??= 열고남긴다(options)), 끝정리를건다: (f) => { 끝 = f; }, 마감을건다: (f) => { 마감 = f; } });
      // 마감이 던져도 아래 연결 닫기까지 가야 한다 — 폰에 세션이 남으면 다음 실행이 그 폰을 못 잡는다
      try {
        마감?.();
      } catch (err) {
        console.error(`[kit] 케이스 판정을 마감하지 못했다: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (opening === undefined) return;
      let side: AppSide;
      try {
        side = await opening;
      } catch (err) {
        // 여는 것이 실패했으면 닫을 세션이 없다. 보통은 본문이 그 오류를 받아 시험 실패로 남았지만,
        // 열리는 도중 제한 시간이 끝났으면 본문은 이미 떠났다 — 그때만 이유를 알린다
        if (testInfo.status === 'timedOut') {
          console.error(`[kit] Appium 연결을 열지 못했다: ${err instanceof Error ? err.message : String(err)}`);
        }
        return;
      }
      // 닫은 연결에 찍기를 보내지 않게 연결보다 먼저 끈다
      await 폰장면?.끄기();
      // 통과 못 한 게임 항목 — 실패 순간 오브젝트 목록 · 게임 오류 기록. 연결을 닫기 전에 남긴다 (도메인/게임 §3.10 「실행 결과」).
      // 정기 실행은 통과 항목도 Exception 을 남긴다 — 안정화 지표가 센다 (도메인/안정화 §3.15 결정 3)
      if (side.game !== undefined) {
        const 통과 = testInfo.status === testInfo.expectedStatus;
        const 안정화 = process.env.PLATFORM_STABILITY === '1' ? { 통과 } : undefined;
        if (!통과 || 안정화 !== undefined) {
          await 게임증적을남긴다(side.game, process.env.PLATFORM_RUN_ID ?? '0', process.env.PLATFORM_HISTORY_ID ?? '0', 0, 안정화);
        }
        // 케이스가 눌러 둔 손가락(touchDown) · 키(keyDown)를 떼지 않고 끝났으면 거둔다 — 실패 순간의 오브젝트 목록(누른 동안 뜬 말풍선)이 남게 증적 뒤에
        await side.game.입력을거둔다();
      }
      // 정리 절차는 실패해도 NA 로 남고 던지지 않는다 — 남기기(attach)가 터진 것만 알린다
      await 끝?.().catch((err: unknown) => console.error(`[kit] 끝 정리를 남기지 못했다: ${err instanceof Error ? err.message : String(err)}`));
      // 본문 안 finally 는 제한 시간에 걸리면 안 돈다. 정리 단계는 그 뒤에도 돈다
      if (!('driver' in side)) {
        await PC를끈다(process.env);
        return;
      }
      try {
        await closeApp(side.driver);
      } catch (err) {
        // 닫기 실패로 이미 난 판정을 덮으면 안 된다. 대신 폰에 세션이 남았을 수 있다는 것은 알린다
        console.error(`[kit] Appium 연결을 닫지 못했다: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });
