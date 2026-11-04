import { defineCase, test, verify } from '@platform/kit';

import { 가방읽기, 오류코드읽기, 팔기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-210',
  name: '장착 중인 아이템을 팔면 「ITEM_EQUIPPED」로 막힌다',
  apiDoc: 2,
  precondition: ['짧은 검을 장착한 전사가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 검번호 = 0;

  await test.step('일회용 계정으로 전사를 만든다', async () => {
    나 = await 플레이어만들기(request, 'Warrior');
  });

  await test.step('짧은 검을 장착한 전사를 확인한다', async () => {
    const 지금 = await 가방읽기(request, 나);
    const 검 = 지금.items.find((i) => i.templateId === 'sword_short' && i.equippedSlot !== null);
    검번호 = 검?.id ?? 0;
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('장착한 짧은 검이 가방에 있다', 검번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('장착한 짧은 검을 판다', async () => {
    const 응답 = await 팔기(request, 나, 검번호, 1);
    await verify('장착 중인 아이템을 팔면 「ITEM_EQUIPPED」로 막힌다', await 오류코드읽기(응답), 'ITEM_EQUIPPED');
  });
});
