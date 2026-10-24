import { defineCase, test, verify } from '@platform/kit';

import { 서버자리옮겨질때까지, 앱다시켜기 } from './helpers/admin.helper.js';
import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { GM콘솔 } from './pages/gm-console.page.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-495',
  name: 'GM 콘솔로 순간이동한 뒤 게임을 다시 켜고 들어가도 초록 들판에 있다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  techniques: ['상태 전이'],
  elements: ['zone:Town', 'zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ game, driver, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn495');
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      await 게임입장(game, 누구!);
    });
    await test.step('게임 안 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다', await new 월드화면(game).구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('GM 콘솔로 순간이동한 뒤 게임을 껐다 켜고 다시 들어간다', async () => {
      const 나 = 누구!;
      const 처음 = (await 캐릭터읽기(admin, 나)).position;
      const 콘솔 = await GM콘솔.열기(game);
      await 콘솔.순간이동누르기('TeleportBeginner');
      await new 월드화면(game).구역글뜰때까지('초록 들판');
      await 서버자리옮겨질때까지(admin, 나, 처음);
      await 앱다시켜기(driver, game);
      const 월드 = await 게임입장(game, 나);
      await verify('GM 콘솔로 순간이동한 뒤 게임을 다시 켜고 들어가도 초록 들판에 있다', await 월드.구역글(), '초록 들판');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
