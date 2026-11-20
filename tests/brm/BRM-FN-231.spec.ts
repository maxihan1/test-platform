import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 상점줄 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-231',
  name: '상점 창에서 녹슨 단검 줄의 「구매」를 보면 골드 79 일 때도 녹슨 단검 줄의 「구매」 버튼이 눌리는 상태다',
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
  await test.step('상점 창에서 녹슨 단검 줄의 「구매」를 본다', async () => {
    const 상점 = await 상점창.열기(game);
    await verify('상점 창에서 녹슨 단검 줄의 「구매」를 보면 골드 79 일 때도 녹슨 단검 줄의 「구매」 버튼이 눌리는 상태다', await 상점.구매버튼눌림(await 상점줄(상점, '녹슨 단검')), true);
  });
  await test.step('일반 회원의 골드를 80 으로 맞춘다', async () => {
    await 골드맞추기(game, 80);
    await verify('상단 바 골드가 「80 G」다', await hud.골드글(), '80 G', { blocker: true });
  });
  await test.step('골드 80 으로 상점 창에서 녹슨 단검 줄의 「구매」를 본다', async () => {
    const 상점 = await 상점창.열기(game);
    await verify('골드 80 일 때 녹슨 단검 줄의 「구매」 버튼이 눌리는 상태다', await 상점.구매버튼눌림(await 상점줄(상점, '녹슨 단검')), true);
  });
});
