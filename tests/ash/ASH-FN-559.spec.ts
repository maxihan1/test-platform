import { defineCase, test, verify } from '@platform/kit';

import { 드랍확률되돌리기, 드랍확률바꾸기, 어드민설정 } from './helpers/game-state.helper.js';
import { 어드민열림 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-559',
  name: '어드민 드랍 설정을 바꾸면 어드민 설정에 바꾼 확률이 보인다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  elements: ['drop:bot_loot'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 기본확률 = 0;
  try {
    await test.step('드랍 설정을 기본값으로 되돌린다', async () => {
      await 드랍확률되돌리기(admin);
    });

    await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
      await verify('어드민 키로 어드민 계정 목록을 부르면 200 이다', await 어드민열림(admin), 200, { blocker: true });
      기본확률 = (await 어드민설정(admin)).drop.botLootChance;
    });

    await test.step('어드민 드랍 설정의 봇 전리품 확률을 바꾼다', async () => {
      const 바꿀값 = 기본확률 === 0.25 ? 0.75 : 0.25;
      await 드랍확률바꾸기(admin, { botLootChance: 바꿀값 });
      const 읽음 = (await 어드민설정(admin)).drop.botLootChance;
      await verify('어드민 드랍 설정을 바꾸면 어드민 설정에 바꾼 확률이 보인다', 읽음, 바꿀값);
    });
  } finally {
    await 드랍확률되돌리기(admin);
  }
});
