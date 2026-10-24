import { defineCase, test, verify } from '@platform/kit';

import { 드랍확률되돌리기, 드랍확률바꾸기, 설정읽기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-559',
  name: '어드민으로 드랍 확률을 바꾸면 어드민 설정의 botLootChanceChaotic 이 바뀐다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  elements: ['drop:bot_loot_chaotic'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  try {
    await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
      await verify('어드민 키가 있다', (await admin.get('/admin/item-templates')).ok(), true, { blocker: true });
    });
    await test.step('어드민으로 악명 봇 전리품 확률을 바꾼다', async () => {
      await 드랍확률바꾸기(admin, { botLootChanceChaotic: 0.4 });
      await verify('어드민으로 드랍 확률을 바꾸면 어드민 설정의 botLootChanceChaotic 이 바뀐다', (await 설정읽기(admin)).drop.botLootChanceChaotic, 0.4);
    });
  } finally {
    await 드랍확률되돌리기(admin);
  }
});
