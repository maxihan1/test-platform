import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-347',
  name: '상점 창을 열면 상점에 「가죽 갑옷」 「받는 피해 -8%」 「100 G」, 「사슬 갑옷」 「받는 피해 -15%」 「400 G」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['item:leather_armor', 'item:chain_armor'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    갑옷줄들: z
      .string()
      .describe('상점 갑옷 줄(이름 / 설명 / 가격)')
      .default('가죽 갑옷 / 받는 피해 -8% / 100 G | 사슬 갑옷 / 받는 피해 -15% / 400 G'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('상점 창의 갑옷 줄을 확인한다', async () => {
    const 상점 = await 상점창.열기(game);
    const 줄들: string[] = [];
    for (const 이름 of ['가죽 갑옷', '사슬 갑옷']) 줄들.push(await 상점.줄글(이름));
    await verify('상점 창을 열면 상점에 「가죽 갑옷」 「받는 피해 -8%」 「100 G」, 「사슬 갑옷」 「받는 피해 -15%」 「400 G」가 보인다', 줄들.join(' | '), expected.갑옷줄들);
  });
});
