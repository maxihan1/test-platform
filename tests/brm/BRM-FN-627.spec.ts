import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 골드가값이될때까지, 로비준비 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-627',
  name: '「만들기 · 500G」를 빠르게 두 번 누르면 길드가 하나만 생기고 골드는 500 만 준다',
  platforms: ['android'],
  precondition: ['일반 회원이 골드 1,500 으로 길드 없이 로비에 있다'],
  techniques: ['오류 추정'],
  elements: ['flow:골드-길드 만들기'],
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
  await test.step('일반 회원이 로비에 들어가 골드를 1500 으로 맞춘다', async () => {
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    const hud = new 공통HUD(game);
    await 골드맞추기(game, 1500);
    await verify('일반 회원의 골드가 1,500 이다', await 골드가값이될때까지(hud, 1500), true, { blocker: true });
  });
  await test.step('길드 이름을 넣고 「만들기 · 500G」를 빠르게 두 번 누른다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.이름넣기('qa627');
    await 길드.만들기두번누르기();
    await 길드.머리가될때까지('길드원 1명');
    await 길드.hud.알림뜸('이미 길드', 3_000);
    const 하나 = await verify('길드가 하나만 생긴다', (await 길드.머리줄())?.includes('「qa627」') ?? false, true);
    const 줄어듦 = await verify('골드는 500 만 준다', 1500 - (await 길드.hud.골드값()), 500);
    await verify('「만들기 · 500G」를 빠르게 두 번 누르면 길드가 하나만 생기고 골드는 500 만 준다', 하나 && 줄어듦, true);
  });
});
