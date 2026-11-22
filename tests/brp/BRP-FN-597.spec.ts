import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 골드를맞추고길드창열기, 소셜정리, 안뜨는지지켜보기 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-597',
  name: '길드 창에서 「만들기 · 500G」를 빠르게 두 번 누르면 길드가 하나만 생기고 골드는 500 만 준다',
  platforms: ['windows'],
  precondition: ['일반 회원이 길드 없이 골드 5,000 을 가지고 로비에 있다'],
  techniques: ['오류 추정'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    길드이름: z.string().min(2).max(12).describe('만들 길드 이름 — 앞뒤 공백 없는 2~12자').default('QA길드'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 길드이름 = params.길드이름;
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }]));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('길드 창을 열고 골드가 5,000 인 것을 확인한다', async () => {
    const 창 = await 골드를맞추고길드창열기(game, 5000);
    await verify('골드가 5,000 이다', await new 공통HUD(game).골드(), 5000, { blocker: true });
    await verify('길드가 없다', (await 창.안내글읽기()).includes('아직 길드가 없습니다'), true, { blocker: true });
  });

  await test.step('길드 이름을 넣고 「만들기 · 500G」를 빠르게 두 번 누른다', async () => {
    const 창 = await 길드창.열기(game);
    await 창.빠르게두번만들기(길드이름);
    const 돈 = new 공통HUD(game);
    const 길드생김 = await verify('길드가 생긴다', (await 창.길드머리기다리기('길드원 1명')) !== null, true);
    const 한번만줌 = await verify('골드가 4,500 이 된다', await 돈.골드가될때까지(4500), true);
    const 그대로 = await verify('골드가 4,500 그대로다', await 안뜨는지지켜보기(async () => (await 돈.골드()) !== 4500, 3_000), true);
    await verify('길드 창에서 「만들기 · 500G」를 빠르게 두 번 누르면 길드가 하나만 생기고 골드는 500 만 준다', 길드생김 && 한번만줌 && 그대로, true);
  });
});
