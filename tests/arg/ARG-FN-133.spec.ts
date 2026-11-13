import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가진개수, 개수맞추기, 사기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-133',
  name: '물약을 두 개 이상 가진 채 가방 창을 열면 「체력 물약」 줄이 하나이고 이름에 「x<개수>」가 붙어 있다',
  platforms: ['android'],
  precondition: ['골드가 60 이상이고 로비에 있다'],
  elements: ['item:health_potion', 'flow:골드-상점구매'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    줄수: z.number().describe('「체력 물약」 줄 수').default(1),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('구매 전 골드가 60 이상이다', (await 대기실.hud.골드()) >= 60, true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '체력 물약');
  try {
    await test.step('상점에서 「체력 물약」을 두 번 사고 가방 창을 연다', async () => {
      await 사기(game, '체력 물약', 2);
      const 가방 = await 가방창.열기(game);
      const 한줄 = await verify('가방 목록에 「체력 물약」 줄이 하나 보인다', await 가방.줄개수('체력 물약'), expected.줄수);
      const 표기 = await verify('「체력 물약」 이름 뒤에 「x」와 개수가 붙어 있다', (await 가방.이름들()).some((글) => /^체력 물약 x\d+$/.test(글)), true);
      await verify('물약을 두 개 이상 가진 채 가방 창을 열면 「체력 물약」 줄이 하나이고 이름에 「x<개수>」가 붙어 있다', 한줄 && 표기, true);
    });
  } finally {
    await 개수맞추기(game, '체력 물약', 앞개수);
  }
});
