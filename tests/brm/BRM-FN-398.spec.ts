import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 골드가값이될때까지, 로비준비, 알림이모두사라질때까지 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-398',
  name: '골드 499 로 만들면 「길드를 만들려면 500 골드가 필요합니다」가 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 골드 499 로 길드 없이 로비에 있다', '일반 회원이 골드 500 으로 길드 없이 로비에 있다'],
  techniques: ['경계값 분석'],
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
  await test.step('일반 회원이 로비에 들어가 골드를 499 로 맞춘다', async () => {
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    const hud = new 공통HUD(game);
    await 골드맞추기(game, 499);
    await verify('일반 회원의 골드가 499 이다', await 골드가값이될때까지(hud, 499), true, { blocker: true });
  });
  await test.step('길드 이름을 넣고 「만들기 · 500G」를 누른다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.이름넣기('qa398부족');
    await 길드.만들기누르기();
    await verify('골드 499 로 만들면 「길드를 만들려면 500 골드가 필요합니다」가 뜬다', await 길드.hud.알림뜸('길드를 만들려면 500 골드가 필요합니다'), true);
  });
  await test.step('일반 회원이 골드를 500 으로 맞추고 길드 이름을 넣어 「만들기 · 500G」를 누른다', async () => {
    const hud = new 공통HUD(game);
    await 골드맞추기(game, 500);
    await verify('일반 회원의 골드가 500 이다', await 골드가값이될때까지(hud, 500), true, { blocker: true });
    await 알림이모두사라질때까지(game);
    const 길드 = await 길드창.열기(game);
    await 길드.이름넣기('qa398정확');
    await 길드.만들기누르기();
    await 길드.머리가될때까지('길드원 1명');
    const 안뜸 = await verify('골드 부족 알림이 뜨지 않는다', await 길드.hud.알림뜸('길드를 만들려면 500 골드가 필요합니다', 1_500), false);
    const 생김 = await verify('길드가 생긴다', (await 길드.머리줄())?.includes('「qa398정확」') ?? false, true);
    await verify('골드 500 으로는 오류 알림 없이 길드가 생긴다', 안뜸 && 생김, true);
  });
});
