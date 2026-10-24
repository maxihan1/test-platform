import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-652',
  name: '월드 화면에서 「귀환」을 누른 뒤 게임을 껐다 켜고 다시 들어가도 하늘빛 마을에 있다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 초록 들판에 있다'],
  techniques: ['오류 추정'],
  elements: ['zone:Town', 'respawn:마을'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin, driver }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판에 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn652');
      await 순간이동(admin, 누구, 'Beginner');
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「초록 들판」이 보인다', await 월드.구역글(), '초록 들판', { blocker: true });
    });
    await test.step('월드 화면에서 「귀환」을 누른 뒤 게임을 껐다 켜고 다시 들어간다', async () => {
      const 월드 = new 월드화면(game);
      await 월드.귀환누르기();
      await 월드.구역글뜰때까지('하늘빛 마을', 20_000);
      const 앱 = await driver.getCurrentPackage();
      await driver.terminateApp(앱);
      await driver.activateApp(앱);
      await game.waitForValue('/Boot/BootCanvas/LoginView/Title', 'Text.text', 'ASHVEIL', { timeoutMs: 120_000 });
      const 다시 = await 게임입장(game, 누구!);
      await verify('월드 화면에서 「귀환」을 누른 뒤 게임을 껐다 켜고 다시 들어가도 하늘빛 마을에 있다', await 다시.구역글(), '하늘빛 마을');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
