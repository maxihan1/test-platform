import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방에채우기 } from './helpers/shop-state.helper.js';
import { 가진개수, 개수맞추기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-322',
  name: '「체력 물약」 줄에는 「사용」과 「판매 7G」, 「녹슨 단검」 줄에는 「장착」과 「판매 20G」가 보인다',
  platforms: ['android'],
  precondition: ['가방에 「체력 물약」과 「녹슨 단검」이 있고 로비에 있다'],
  elements: ['item:health_potion', 'item:rusty_dagger'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    물약버튼: z.string().describe('「체력 물약」 줄 버튼 글자').default('사용 · 판매 7G'),
    단검버튼: z.string().describe('「녹슨 단검」 줄 버튼 글자').default('장착 · 판매 20G'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  const 앞물약 = await 가진개수(game, '체력 물약');
  const 앞단검 = await 가진개수(game, '녹슨 단검');
  try {
    await test.step('가방에 「체력 물약」과 「녹슨 단검」이 있게 채운다', async () => {
      await 가방에채우기(game, '체력 물약', 1);
      await 가방에채우기(game, '녹슨 단검', 1);
      const 가방 = await 가방창.열기(game);
      await verify('가방 목록에 「체력 물약」 줄이 보인다', (await 가방.줄개수('체력 물약')) >= 1, true, { blocker: true });
      await verify('가방 목록에 「녹슨 단검」 줄이 보인다', (await 가방.줄개수('녹슨 단검')) >= 1, true, { blocker: true });
    });

    await test.step('가방 목록의 버튼을 확인한다', async () => {
      const 가방 = await 가방창.열기(game);
      const 물약 = await verify('「체력 물약」 줄에 「사용」과 「판매 7G」가 보인다', await 가방.줄버튼요약('체력 물약', ['사용', '판매']), expected.물약버튼);
      const 단검 = await verify('「녹슨 단검」 줄에 「장착」과 「판매 20G」가 보인다', await 가방.줄버튼요약('녹슨 단검', ['장착', '판매']), expected.단검버튼);
      await verify('「체력 물약」 줄에는 「사용」과 「판매 7G」, 「녹슨 단검」 줄에는 「장착」과 「판매 20G」가 보인다', 물약 && 단검, true);
    });
  } finally {
    await 개수맞추기(game, '체력 물약', 앞물약);
    await 개수맞추기(game, '녹슨 단검', 앞단검);
  }
});
