import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가진개수, 개수맞추기, 사기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-226',
  name: '퀘스트 창을 다시 열면 오늘 보상을 받은 「상점에서 물건 구매」 줄에는 「받음」이 보이고 「보상 받기」를 누를 수 없다',
  platforms: ['android'],
  precondition: ['골드가 30 이상이고 로비에 있다'],
  elements: ['item:health_potion', 'quest:shop_buy', 'flow:골드-상점구매'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    퀘스트: z.string().describe('보상을 받을 퀘스트 이름').default('상점에서 물건 구매'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('구매 전 골드가 30 이상이다', (await 대기실.hud.골드()) >= 30, true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '체력 물약');
  try {
    await test.step('물건을 사서 「상점에서 물건 구매」를 채우고 보상을 받을 수 있으면 받은 뒤 퀘스트 창을 다시 연다', async () => {
      await 사기(game, '체력 물약', 1);
      const 처음창 = await 퀘스트창.열기(game);
      if ((await 처음창.보상받기버튼(expected.퀘스트)).누름) await 처음창.보상받기누르기(expected.퀘스트);
      await 처음창.받음표시가뜨는지(expected.퀘스트);
      await 처음창.닫기누르기();
    });

    await test.step('퀘스트 창을 다시 열어 「상점에서 물건 구매」 줄을 확인한다', async () => {
      const 퀘스트 = await 퀘스트창.열기(game);
      const 받음 = await verify('「상점에서 물건 구매」 줄에 「받음」이 보인다', await 퀘스트.받음표시가뜨는지(expected.퀘스트), true);
      const 눌러지지않음 = await verify('「상점에서 물건 구매」 줄의 「보상 받기」를 누를 수 없다', (await 퀘스트.보상받기버튼(expected.퀘스트)).누름, false);
      await verify('퀘스트 창을 다시 열면 오늘 보상을 받은 「상점에서 물건 구매」 줄에는 「받음」이 보이고 「보상 받기」를 누를 수 없다', 받음 && 눌러지지않음, true);
    });
  } finally {
    await 개수맞추기(game, '체력 물약', 앞개수);
  }
});
