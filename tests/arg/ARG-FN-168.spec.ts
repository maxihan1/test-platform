import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가진개수, 개수맞추기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-168',
  name: '「체력 물약」을 사면 「체력 물약 1개 구매」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['골드가 30 이상이고 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    알림글: z.string().describe('구매 알림 문구').default('체력 물약 1개 구매'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('구매 전 골드가 30 이상이다', (await 대기실.hud.골드()) >= 30, true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '체력 물약');
  let 떴다 = false;
  try {
    await test.step('상점에서 「체력 물약」의 「구매」를 누른다', async () => {
      const 상점 = await 상점창.열기(game);
      await 상점.구매누르기('체력 물약');
      떴다 = await 상점.hud.알림.뜨는지(expected.알림글);
      await verify('「체력 물약」을 사면 「체력 물약 1개 구매」 알림이 뜬다', 떴다, true);
    });
  } finally {
    await 개수맞추기(game, '체력 물약', 앞개수);
  }
});
