import { defineCase, test, verify } from '@platform/kit';

import { 서버자리옮겨질때까지 } from './helpers/admin.helper.js';
import { type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { GM콘솔 } from './pages/gm-console.page.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-493',
  name: 'GM 콘솔로 초록 들판에 순간이동하면 서버의 캐릭터 구역이 「Beginner」로 저장된다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  elements: ['zone:Town', 'zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn493');
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      await 게임입장(game, 누구!);
    });
    await test.step('게임 안 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다', await new 월드화면(game).구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('GM 콘솔에서 「초록 들판」으로 순간이동한다', async () => {
      const 나 = 누구!;
      const 월드 = new 월드화면(game);
      const 처음 = (await 캐릭터읽기(admin, 나)).position;
      const 콘솔 = await GM콘솔.열기(game);
      await 콘솔.순간이동누르기('TeleportBeginner');
      await 월드.구역글뜰때까지('초록 들판');
      await 서버자리옮겨질때까지(admin, 나, 처음);
      await verify('GM 콘솔로 초록 들판에 순간이동하면 서버의 캐릭터 구역이 「Beginner」로 저장된다', (await 캐릭터읽기(admin, 나)).zone, 'Beginner');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
