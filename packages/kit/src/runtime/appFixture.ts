// Android 앱 · 게임 케이스의 Appium 연결(과 게임 SDK 연결)을 열고 닫는 Playwright fixture (도메인/러너 §5.2 「앱 실행」 · 도메인/게임 §3.10 「게임 연결」)

import { test as base } from '@playwright/test';

import { closeApp, type AppDriver } from './app.js';
import { 게임증적을남긴다, type KitGame } from './game.js';
import { 폰을연다 } from './phone.js';
import { DEVICE_ATTACHMENT } from './protocol.js';

export type AppSide = { driver: AppDriver; game?: KitGame };

// 케이스마다 만든다 — 앞 판처럼 defineTest 가 부를 때 extend 한다
export const 앱테스트 = () =>
  base.extend<{ appSession: { open(): Promise<AppSide> } }>({
    appSession: async ({}, use, testInfo) => {
      // 여는 중인 약속을 쥐어야 한다. 새 폰은 첫 연결에 도우미 앱을 깔아 오래 걸려, 열리는 도중 제한 시간이 오면 Appium 이 뒤늦게 세션을 만든다
      let opening: Promise<AppSide> | undefined;
      // 기기 정보는 연 직후 한 번 남긴다 — 리포터가 결과 줄 device 로 싣는다 (도메인/리포팅 §8.4 · APP-F1-05)
      const 열고남긴다 = async (): Promise<AppSide> => {
        const { device, ...side } = await 폰을연다(process.env);
        // 여기서 던지면 열린 연결을 아무도 못 닫는다(opening 이 실패로 끝난다). 남기지 못한 것만 알린다
        if (device !== undefined) {
          try {
            await testInfo.attach(DEVICE_ATTACHMENT, { body: JSON.stringify(device), contentType: 'application/json' });
          } catch (err) {
            console.error(`[kit] 기기 정보를 남기지 못했다: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        return side;
      };
      await use({ open: () => (opening ??= 열고남긴다()) });
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
      // 통과 못 한 게임 항목 — 실패 순간 오브젝트 목록 · 게임 오류 기록. 연결을 닫기 전에 남긴다 (도메인/게임 §3.10 「실행 결과」)
      if (side.game !== undefined && testInfo.status !== testInfo.expectedStatus) {
        await 게임증적을남긴다(side.game, process.env.PLATFORM_RUN_ID ?? '0', process.env.PLATFORM_HISTORY_ID ?? '0');
      }
      // 본문 안 finally 는 제한 시간에 걸리면 안 돈다. 정리 단계는 그 뒤에도 돈다
      try {
        await closeApp(side.driver);
      } catch (err) {
        // 닫기 실패로 이미 난 판정을 덮으면 안 된다. 대신 폰에 세션이 남았을 수 있다는 것은 알린다
        console.error(`[kit] Appium 연결을 닫지 못했다: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  });
