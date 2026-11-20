import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-210',
  name: '상점을 열면 상품이 「녹슨 단검」 · 「강철 롱소드」 · 「룬 새김 도끼」 · 「가죽 갑옷」 · 「사슬 갑옷」 · 「행운의 반지」 · 「현자의 목걸이」 · 「체력 물약」 8종이다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['shop:녹슨 단검', 'shop:강철 롱소드', 'shop:룬 새김 도끼', 'shop:가죽 갑옷', 'shop:사슬 갑옷', 'shop:행운의 반지', 'shop:현자의 목걸이', 'shop:체력 물약'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  const hud = new 공통HUD(game);
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('상단 바에 「Lv.1」이 보인다', (await hud.레벨글()).startsWith('Lv.1 '), true, { blocker: true });
  });
  await test.step('상점 창을 열어 상품 줄 이름을 읽는다', async () => {
    const 상점 = await 상점창.열기(game);
    await verify('상점을 열면 상품이 「녹슨 단검」 · 「강철 롱소드」 · 「룬 새김 도끼」 · 「가죽 갑옷」 · 「사슬 갑옷」 · 「행운의 반지」 · 「현자의 목걸이」 · 「체력 물약」 8종이다', (await 상점.줄이름들()).join(' · '), '녹슨 단검 · 강철 롱소드 · 룬 새김 도끼 · 가죽 갑옷 · 사슬 갑옷 · 행운의 반지 · 현자의 목걸이 · 체력 물약');
  });
});
