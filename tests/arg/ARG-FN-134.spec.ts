import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가진개수, 개수맞추기, 사기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-134',
  name: '「녹슨 단검」을 두 개 가지면 가방 목록에 「녹슨 단검」 줄이 두 줄이다',
  platforms: ['android'],
  precondition: ['골드가 80 이상이고 로비에 있다'],
  elements: ['item:rusty_dagger', 'flow:골드-상점구매'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    줄수: z.number().describe('「녹슨 단검」 줄 수').default(2),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('구매 전 골드가 80 이상이다', (await 대기실.hud.골드()) >= 80, true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '녹슨 단검');
  try {
    await test.step('가방에 「녹슨 단검」이 하나 있게 맞춘다', async () => {
      await 개수맞추기(game, '녹슨 단검', 1);
      const 가방 = await 가방창.열기(game);
      await verify('가방 목록에 「녹슨 단검」 줄이 하나 보인다', await 가방.줄개수('녹슨 단검'), 1, { blocker: true });
    });

    await test.step('상점에서 「녹슨 단검」을 사고 가방 창을 연다', async () => {
      await 사기(game, '녹슨 단검', 1);
      const 가방 = await 가방창.열기(game);
      await verify('「녹슨 단검」을 두 개 가지면 가방 목록에 「녹슨 단검」 줄이 두 줄이다', await 가방.줄개수('녹슨 단검'), expected.줄수);
    });
  } finally {
    await 개수맞추기(game, '녹슨 단검', 앞개수);
  }
});
