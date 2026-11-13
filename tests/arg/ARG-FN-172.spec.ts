import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-172',
  name: '골드보다 비싼 상품의 「구매」를 누르면 「골드가 부족합니다」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['골드가 상품 하나의 가격보다 적고 로비에 있다'],
  techniques: ['동등 분할'],
  elements: ['flow:골드-상점구매'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    알림글: z.string().describe('골드 부족 알림 문구').default('골드가 부족합니다'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  let 상품 = '';
  let 앞골드 = 0;
  await test.step('상점 창을 열어 보유 골드보다 비싼 상품을 찾는다', async () => {
    const 상점 = await 상점창.열기(game);
    앞골드 = await 상점.hud.골드();
    const 비싼상품 = await 상점.골드보다비싼상품(앞골드);
    await verify('상점 목록에 보유 골드보다 비싼 상품이 보인다', 비싼상품 !== null, true, { blocker: true });
    상품 = 비싼상품 ?? '';
  });

  await test.step('상점에서 보유 골드보다 비싼 상품의 「구매」를 누른다', async () => {
    const 상점 = await 상점창.열기(game);
    await 상점.구매누르기(상품);
    await verify('골드보다 비싼 상품의 「구매」를 누르면 「골드가 부족합니다」 알림이 뜬다', await 상점.hud.알림.뜨는지(expected.알림글), true);
    await verify('골드가 그대로다', await 상점.hud.골드(), 앞골드);
  });
});
