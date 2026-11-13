import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방에채우기 } from './helpers/shop-state.helper.js';
import { 가진개수, 개수맞추기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-177',
  name: '「녹슨 단검」을 팔면 골드가 20 는다',
  platforms: ['android'],
  precondition: ['가방에 「녹슨 단검」이 있고 로비에 있다'],
  elements: ['item:rusty_dagger', 'flow:골드-판매'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    늘어난골드: z.number().describe('늘어나는 골드').default(20),
    판매알림글: z.string().describe('판매 알림 문구에 든 글자').default('녹슨 단검 판매'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '녹슨 단검');
  try {
    await test.step('가방에 「녹슨 단검」이 있게 채운다', async () => {
      await 가방에채우기(game, '녹슨 단검', 1);
      const 가방 = await 가방창.열기(game);
      await verify('가방 목록에 「녹슨 단검」 줄이 보인다', (await 가방.줄개수('녹슨 단검')) >= 1, true, { blocker: true });
    });

    await test.step('가방 창에서 「녹슨 단검」의 「판매 20G」를 누른다', async () => {
      const 가방 = await 가방창.열기(game);
      const 앞골드 = await 가방.hud.골드();
      await 가방.판매하기('녹슨 단검');
      await 가방.hud.알림.뜨는지(expected.판매알림글);
      await verify('「녹슨 단검」을 팔면 골드가 20 는다', (await 가방.hud.골드()) - 앞골드, expected.늘어난골드);
    });
  } finally {
    await 개수맞추기(game, '녹슨 단검', 앞개수);
  }
});
