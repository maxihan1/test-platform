import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림자리 } from './helpers/shop-state.helper.js';
import { 사라지는지 } from './helpers/find.helper.js';
import { 가진개수, 개수맞추기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-269',
  name: '물건을 사면 알림이 화면 위쪽 가운데에 뜨고 3초 넘게 보인 뒤 10초 안에 사라진다',
  platforms: ['android'],
  precondition: ['골드가 30 이상이고 로비에 있다'],
  elements: ['item:health_potion', 'flow:골드-상점구매'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    알림글: z.string().describe('구매 알림 문구').default('체력 물약 1개 구매'),
    보이는초: z.number().describe('알림이 넘게 보여야 하는 시간(초)').default(3),
    사라지는초: z.number().describe('알림이 사라져야 하는 한도(초)').default(10),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('구매 전 골드가 30 이상이다', (await 대기실.hud.골드()) >= 30, true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '체력 물약');
  try {
    await test.step('상점에서 「체력 물약」을 사고 알림을 지켜본다', async () => {
      const 상점 = await 상점창.열기(game);
      await 상점.구매누르기('체력 물약');
      const 떴다 = await 상점.hud.알림.뜨는지(expected.알림글);
      const 뜬시각 = Date.now();
      const 자리 = await 알림자리(game, 상점.hud.알림.주소(expected.알림글));
      const 사라졌다 = await 사라지는지(game, 상점.hud.알림.주소(expected.알림글), expected.사라지는초 * 1000);
      const 걸린시간 = Date.now() - 뜬시각;
      const 위쪽 = await verify('알림이 화면 위쪽에 뜬다', 떴다 && 자리.위쪽, true);
      const 가운데 = await verify('알림이 화면 가운데에 뜬다', 떴다 && 자리.가운데, true);
      const 오래 = await verify('알림이 3초 넘게 보인다', 걸린시간 > expected.보이는초 * 1000, true);
      const 사라짐 = await verify('알림이 10초 안에 사라진다', 사라졌다, true);
      await verify('물건을 사면 알림이 화면 위쪽 가운데에 뜨고 3초 넘게 보인 뒤 10초 안에 사라진다', 위쪽 && 가운데 && 오래 && 사라짐, true);
    });
  } finally {
    await 개수맞추기(game, '체력 물약', 앞개수);
  }
});
