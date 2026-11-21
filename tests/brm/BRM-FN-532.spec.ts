import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 글자색 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-532',
  name: '상점 창의 상품 줄을 차례로 읽으면 상점 상품 줄은 9종이고 줄마다 이름(등급 색) · 설명 · 「 G」 가격 · 「구매」가 상점 표 차례로 보인다',
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
  await test.step('상점 창의 상품 줄을 차례로 읽는다', async () => {
    const 상점 = await 상점창.열기(game);
    const 줄수 = await verify('상점 상품 줄이 9종이다', await 상점.줄수(), 9);
    const 이름 = await verify('상품 줄 이름이 상점 표 차례다', (await 상점.줄이름들()).slice(0, 9).join(' · '), '녹슨 단검 · 강철 롱소드 · 룬 새김 도끼 · 가죽 갑옷 · 사슬 갑옷 · 행운의 반지 · 현자의 목걸이 · 체력 물약 · 조약돌');
    const 색 = await verify('상품 줄 이름 색이 등급 색이다', (await 상점.줄이름색들()).slice(0, 9).map((글) => 글자색(글) ?? '없음').join(' '), '#E8E2D6 #5AB8FF #C77DFF #E8E2D6 #5AB8FF #5AB8FF #5AB8FF #E8E2D6 #E8E2D6');
    const 설명 = await verify('상품 줄 설명이 상점 표 차례다', (await 상점.줄설명들()).slice(0, 9).join(' · '), '공격력 +5% · 공격력 +12% · 공격력 +20% · 받는 피해 -8% · 받는 피해 -15% · 골드 획득 +20% · 경험치 획득 +20% · 체력 50% 회복 · 던전에서 사용 · 값싼 기념품');
    const 가격 = await verify('상품 줄 가격이 상점 표 차례다', (await 상점.줄가격들()).slice(0, 9).join(' · '), '80 G · 350 G · 900 G · 100 G · 400 G · 300 G · 300 G · 30 G · 3 G');
    const 구매 = await verify('상품 줄마다 「구매」 버튼이 있다', (await 상점.구매버튼수()) === (await 상점.줄수()), true);
    await verify('상점 창의 상품 줄을 차례로 읽으면 상점 상품 줄은 9종이고 줄마다 이름(등급 색) · 설명 · 「 G」 가격 · 「구매」가 상점 표 차례로 보인다', 줄수 && 이름 && 색 && 설명 && 가격 && 구매, true);
  });
});
