import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 골드를맞추고길드창열기, 소셜정리, 알림글 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { GM골드 } from './helpers/gm.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-392',
  name: '골드가 499 면 길드 만들기에 「길드를 만들려면 500 골드가 필요합니다」가 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원이 길드 없이 골드 499 를 가지고 있다', '일반 회원이 길드 없이 골드 500 을 가지고 있다'],
  techniques: ['경계값 분석'],
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

  await test.step('길드 창을 열고 골드가 499 인 것을 확인한다', async () => {
    const 창 = await 골드를맞추고길드창열기(game, 499);
    await verify('골드가 499 이다', await new 공통HUD(game).골드(), 499, { blocker: true });
    await verify('길드가 없다', (await 창.안내글읽기()).includes('아직 길드가 없습니다'), true, { blocker: true });
  });

  await test.step('길드 창에 이름을 넣고 「만들기 · 500G」를 누른다', async () => {
    const 창 = await 길드창.열기(game);
    await 창.만들기(길드이름);
    await verify('골드가 499 면 길드 만들기에 「길드를 만들려면 500 골드가 필요합니다」가 뜬다', (await 알림글(game, '길드를 만들려면 500 골드가 필요합니다')) !== null, true);
  });

  await test.step('골드를 500 으로 맞추고 길드 창에 이름을 넣고 「만들기 · 500G」를 누른다', async () => {
    const 창 = await 길드창.열기(game);
    await 창.닫기();
    await GM골드(game, 500);
    const 새창 = await 길드창.열기(game);
    await verify('골드가 500 이다', await new 공통HUD(game).골드(), 500, { blocker: true });
    await 새창.만들기(길드이름);
    await verify('골드가 500 일 때 길드가 만들어져 「길드 창설 완료:」 알림이 뜬다', (await 알림글(game, '길드 창설 완료:')) !== null, true);
  });
});
