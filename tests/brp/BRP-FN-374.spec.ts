import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 골드를맞추고길드창열기, 소셜정리, 알림글 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-374',
  name: '길드를 만들면 「길드 창설 완료:」 알림에 그 길드 이름이 「」로 싸여 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 길드 없이 골드 5,000 을 가지고 로비에 있다'],
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

  await test.step('길드 창에 이름을 넣고 「만들기 · 500G」를 누른다', async () => {
    const 창 = await 길드창.열기(game);
    await 창.만들기(길드이름);
    const 알림 = await 알림글(game, '길드 창설 완료:');
    const 조각보임 = await verify('「길드 창설 완료:」 알림이 보인다', 알림 !== null, true);
    const 이름보임 = await verify('알림에 길드 이름이 「」로 싸여 있다', 알림 !== null && 알림.includes('「' + 길드이름 + '」'), true);
    await verify('길드를 만들면 「길드 창설 완료:」 알림에 그 길드 이름이 「」로 싸여 보인다', 조각보임 && 이름보임, true);
  });
});
