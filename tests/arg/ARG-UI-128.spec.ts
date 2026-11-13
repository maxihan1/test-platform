import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-128',
  name: '상점 창에 「녹슨 단검」 · 「강철 롱소드」 · 「룬 새김 도끼」 · 「가죽 갑옷」 · 「사슬 갑옷」 · 「행운의 반지」 · 「현자의 목걸이」 · 「체력 물약」 8종이 이 차례로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: [
    'item:rusty_dagger',
    'item:steel_longsword',
    'item:rune_axe',
    'item:leather_armor',
    'item:chain_armor',
    'item:lucky_ring',
    'item:sage_necklace',
    'item:health_potion',
  ],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    상품들: z
      .string()
      .describe('상점 상품 이름 차례')
      .default('녹슨 단검 · 강철 롱소드 · 룬 새김 도끼 · 가죽 갑옷 · 사슬 갑옷 · 행운의 반지 · 현자의 목걸이 · 체력 물약'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('상점 창을 열어 상품 목록을 확인한다', async () => {
    const 상점 = await 상점창.열기(game);
    await verify(
      '상점 창에 「녹슨 단검」 · 「강철 롱소드」 · 「룬 새김 도끼」 · 「가죽 갑옷」 · 「사슬 갑옷」 · 「행운의 반지」 · 「현자의 목걸이」 · 「체력 물약」 8종이 이 차례로 보인다',
      (await 상점.이름들()).join(' · '),
      expected.상품들,
    );
  });
});
