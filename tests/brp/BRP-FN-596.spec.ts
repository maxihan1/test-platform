import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드세우기, 소셜정리 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-596',
  name: '길드 창의 초대할 캐릭터 이름 칸을 비우고 「초대」를 누르면 아무도 초대되지 않고 게임이 멈추지 않는다',
  platforms: ['windows'],
  precondition: ['일반 회원이 길드장인 길드가 있다'],
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

  await test.step('일반 회원이 길드장인 길드가 있는 것을 확인한다', async () => {
    const 창 = await 길드세우기(game, 길드이름);
    await verify('일반 회원이 길드장인 길드가 있다', 창 !== null, true, { blocker: true });
  });

  await test.step('초대할 캐릭터 이름 칸을 비우고 「초대」를 누른다', async () => {
    const 창 = await 길드창.열기(game);
    await 창.초대하기('');
    await verify('길드 창의 초대할 캐릭터 이름 칸을 비우고 「초대」를 누르면 아무도 초대되지 않고 게임이 멈추지 않는다', (await 창.길드머리기다리기('길드원 1명')) !== null, true);
  });
});
