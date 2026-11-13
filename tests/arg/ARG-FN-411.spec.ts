import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방에채우기 } from './helpers/shop-state.helper.js';
import { 가진개수, 개수맞추기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-411',
  name: '묶음 줄의 「판매」를 한 번 누르면 물약이 1개만 준다',
  platforms: ['android'],
  precondition: ['가방에 「체력 물약」이 두 개 이상 있고 로비에 있다'],
  elements: ['item:health_potion', 'flow:골드-판매'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    줄어든개수: z.number().describe('줄어드는 물약 수').default(1),
    판매알림글: z.string().describe('판매 알림 문구에 든 글자').default('체력 물약 판매'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '체력 물약');
  try {
    await test.step('가방에 「체력 물약」이 두 개 이상 있게 채운다', async () => {
      await 가방에채우기(game, '체력 물약', 2);
      const 가방 = await 가방창.열기(game);
      await verify('가방에 「체력 물약」 묶음이 보인다', (await 가방.묶음수('체력 물약')) >= 2, true, { blocker: true });
    });

    await test.step('가방 창에서 「체력 물약」 묶음 줄의 「판매 7G」를 한 번 누른다', async () => {
      const 가방 = await 가방창.열기(game);
      const 앞 = await 가방.묶음수('체력 물약');
      await 가방.판매하기('체력 물약');
      await 가방.hud.알림.뜨는지(expected.판매알림글);
      await verify('묶음 줄의 「판매」를 한 번 누르면 물약이 1개만 준다', 앞 - (await 가방.묶음수('체력 물약')), expected.줄어든개수);
    });
  } finally {
    await 개수맞추기(game, '체력 물약', 앞개수);
  }
});
