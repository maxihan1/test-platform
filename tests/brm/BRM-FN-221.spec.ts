import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 상점줄, 알림떠있나 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-221',
  name: '골드 79 로 녹슨 단검을 사려 하면 「녹슨 단검 1개 구매」 알림이 뜨지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원이 골드 79 로 로비에 있다', '일반 회원이 골드 80 으로 로비에 있다'],
  techniques: ['경계값 분석'],
  elements: ['item:녹슨 단검', 'shop:녹슨 단검', 'flow:골드-상점 구매'],
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
  await test.step('일반 회원의 골드를 79 로 맞춘다', async () => {
    await 골드맞추기(game, 79);
    await verify('상단 바 골드가 「79 G」다', await hud.골드글(), '79 G', { blocker: true });
  });
  await test.step('상점에서 녹슨 단검 줄의 「구매」를 누른다', async () => {
    const 상점 = await 상점창.열기(game);
    await 상점.구매누르기(await 상점줄(상점, '녹슨 단검'));
    await hud.알림뜸('골드가 부족합니다');
    await verify('골드 79 로 녹슨 단검을 사려 하면 「녹슨 단검 1개 구매」 알림이 뜨지 않는다', await 알림떠있나(game, '녹슨 단검 1개 구매'), false);
  });
  await test.step('일반 회원의 골드를 80 으로 맞춘다', async () => {
    await 골드맞추기(game, 80);
    await verify('상단 바 골드가 「80 G」다', await hud.골드글(), '80 G', { blocker: true });
  });
  await test.step('골드 80 으로 상점에서 녹슨 단검 줄의 「구매」를 누른다', async () => {
    const 상점 = await 상점창.열기(game);
    await 상점.구매누르기(await 상점줄(상점, '녹슨 단검'));
    await verify('「녹슨 단검 1개 구매」 알림이 뜬다', await hud.알림뜸('녹슨 단검 1개 구매'), true);
  });
});
