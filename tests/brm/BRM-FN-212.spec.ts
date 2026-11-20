import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 가방줄, 사기, 상점줄, 서버개수 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-212',
  name: '골드 29 로 30 골드짜리 체력 물약 「구매」를 누르면 체력 물약이 늘지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원이 골드 29 로 로비에 있다', '일반 회원이 골드 30 으로 로비에 있다'],
  techniques: ['경계값 분석'],
  elements: ['item:체력 물약', 'shop:체력 물약', 'flow:골드-상점 구매'],
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
  await test.step('일반 회원의 골드를 29 로 맞춘다', async () => {
    await 골드맞추기(game, 29);
    await verify('상단 바 골드가 「29 G」다', await hud.골드글(), '29 G', { blocker: true });
  });
  await test.step('상점에서 체력 물약 줄의 「구매」를 한 번 누른다', async () => {
    const 상점 = await 상점창.열기(game);
    await 상점.구매누르기(await 상점줄(상점, '체력 물약'));
    await hud.알림뜸('골드가 부족합니다');
    const 서버 = await verify('운영툴 캐릭터 아이템에서 체력 물약이 3개 그대로다', await 서버개수(admin, 나, '체력 물약'), 3);
    const 가방 = await 가방창.열기(game);
    const 화면 = await verify('가방 창에 「체력 물약 x3」이 그대로 보인다', await 가방.줄이름(await 가방줄(가방, '체력 물약')), '체력 물약 x3');
    await verify('골드 29 로 30 골드짜리 체력 물약 「구매」를 누르면 체력 물약이 늘지 않는다', 서버 && 화면, true);
  });
  await test.step('일반 회원의 골드를 30 으로 맞춘다', async () => {
    await 골드맞추기(game, 30);
    await verify('상단 바 골드가 「30 G」다', await hud.골드글(), '30 G', { blocker: true });
  });
  await test.step('골드 30 으로 상점에서 체력 물약 줄의 「구매」를 한 번 누른다', async () => {
    await 사기(game, '체력 물약');
    const 서버 = await verify('운영툴 캐릭터 아이템에서 체력 물약이 4개다', await 서버개수(admin, 나, '체력 물약'), 4);
    const 가방 = await 가방창.열기(game);
    const 화면 = await verify('가방 창에 「체력 물약 x4」가 보인다', await 가방.줄이름(await 가방줄(가방, '체력 물약')), '체력 물약 x4');
    await verify('체력 물약이 1개 는다', 서버 && 화면, true);
  });
});
