import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-348',
  name: '상점 창을 열면 상점에 「행운의 반지」 「골드 획득 +20%」 「300 G」, 「현자의 목걸이」 「경험치 획득 +20%」 「300 G」, 「체력 물약」 「체력 50% 회복 · 던전에서 사용」 「30 G」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['item:lucky_ring', 'item:sage_necklace', 'item:health_potion'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    장신구물약줄들: z
      .string()
      .describe('상점 장신구 · 물약 줄(이름 / 설명 / 가격)')
      .default('행운의 반지 / 골드 획득 +20% / 300 G | 현자의 목걸이 / 경험치 획득 +20% / 300 G | 체력 물약 / 체력 50% 회복 · 던전에서 사용 / 30 G'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('상점 창의 장신구 · 물약 줄을 확인한다', async () => {
    const 상점 = await 상점창.열기(game);
    const 줄들: string[] = [];
    for (const 이름 of ['행운의 반지', '현자의 목걸이', '체력 물약']) 줄들.push(await 상점.줄글(이름));
    await verify(
      '상점 창을 열면 상점에 「행운의 반지」 「골드 획득 +20%」 「300 G」, 「현자의 목걸이」 「경험치 획득 +20%」 「300 G」, 「체력 물약」 「체력 50% 회복 · 던전에서 사용」 「30 G」가 보인다',
      줄들.join(' | '),
      expected.장신구물약줄들,
    );
  });
});
