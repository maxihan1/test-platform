import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 가방줄, 상점줄, 서버개수가될때까지, 서버골드가될때까지 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-607',
  name: '「구매」를 빠르게 두 번 누르면 체력 물약이 2개만 늘고 골드도 60 만 준다',
  platforms: ['android'],
  precondition: ['일반 회원이 골드 2,000 으로 로비에 있다'],
  techniques: ['오류 추정'],
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
  await test.step('일반 회원의 골드를 2,000 으로 맞춘다', async () => {
    await 로비로(game, driver, 나);
    await verify('상단 바에 「Lv.1」이 보인다', (await hud.레벨글()).startsWith('Lv.1 '), true, { blocker: true });
    await 골드맞추기(game, 2000);
    await verify('상단 바 골드가 「2,000 G」다', await hud.골드글(), '2,000 G', { blocker: true });
  });
  await test.step('상점에서 체력 물약 「구매」를 빠르게 두 번 누른다', async () => {
    const 상점 = await 상점창.열기(game);
    const 줄 = await 상점줄(상점, '체력 물약');
    await Promise.all([상점.구매누르기(줄), 상점.구매누르기(줄)]);
    await hud.골드가될때까지('1,940 G', 20_000);
    const 화면골드 = await verify('상단 바 골드가 「1,940 G」다', await hud.골드글(), '1,940 G');
    const 서버골드값 = await verify('운영툴 캐릭터 골드가 1,940 이다', await 서버골드가될때까지(admin, 나, 1940), 1940);
    const 서버물약 = await verify('운영툴 캐릭터 아이템에서 체력 물약이 5개다', await 서버개수가될때까지(admin, 나, '체력 물약', 5), 5);
    const 가방 = await 가방창.열기(game);
    const 화면물약 = await verify('가방 창에 「체력 물약 x5」가 보인다', await 가방.줄이름(await 가방줄(가방, '체력 물약')), '체력 물약 x5');
    await verify('「구매」를 빠르게 두 번 누르면 체력 물약이 2개만 늘고 골드도 60 만 준다', 화면골드 && 서버골드값 && 서버물약 && 화면물약, true);
  });
});
