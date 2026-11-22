import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드맞이하기, 길드세우기, 소셜정리 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-375',
  name: '세 봇을 차례로 길드에 초대해 수락하게 하면 길드원을 셋 더 받아도 막히지 않아 길드 창 위쪽이 「길드원 4명」이다',
  platforms: ['windows'],
  precondition: ['일반 회원이 길드장인 길드가 있고 두 번째 · 세 번째 · 네 번째 플레이어 봇이 접속해 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p4Id: z.string().describe('네 번째 플레이어 아이디').optional().meta({ secret: true, account: '네 번째 플레이어' }),
    p4Password: z.string().describe('네 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '네 번째 플레이어' }),
    길드이름: z.string().min(2).max(12).describe('만들 길드 이름 — 앞뒤 공백 없는 2~12자').default('QA길드'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 둘아이디 = params.p2Id ?? '';
  const 둘비밀번호 = params.p2Password ?? '';
  const 셋아이디 = params.p3Id ?? '';
  const 셋비밀번호 = params.p3Password ?? '';
  const 넷아이디 = params.p4Id ?? '';
  const 넷비밀번호 = params.p4Password ?? '';
  const 길드이름 = params.길드이름;
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }, { 아이디: 둘아이디, 비밀번호: 둘비밀번호 }, { 아이디: 셋아이디, 비밀번호: 셋비밀번호 }, { 아이디: 넷아이디, 비밀번호: 넷비밀번호 }]));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('두 번째 플레이어 · 세 번째 플레이어 · 네 번째 플레이어 봇이 접속한 것을 확인한다', async () => {
    await 봇켜기(admin, 둘아이디, 둘비밀번호);
    await 봇켜기(admin, 셋아이디, 셋비밀번호);
    await 봇켜기(admin, 넷아이디, 넷비밀번호);
    const 접속봇 = (await 접속상태(admin)).bots;
    await verify('두 번째 플레이어 봇이 접속해 있다', 접속봇.includes(둘아이디), true, { blocker: true });
    await verify('세 번째 플레이어 봇이 접속해 있다', 접속봇.includes(셋아이디), true, { blocker: true });
    await verify('네 번째 플레이어 봇이 접속해 있다', 접속봇.includes(넷아이디), true, { blocker: true });
  });

  await test.step('일반 회원이 길드장인 길드가 있는 것을 확인한다', async () => {
    const 창 = await 길드세우기(game, 길드이름);
    await verify('일반 회원이 길드장인 길드가 있다', 창 !== null, true, { blocker: true });
    await 창?.닫기();
  });

  await test.step('세 봇을 차례로 길드에 초대해 수락하게 한다', async () => {
    const 창 = await 길드창.열기(game);
    await 길드맞이하기(admin, 창, 둘아이디, 내아이디, 2);
    await 길드맞이하기(admin, 창, 셋아이디, 내아이디, 3);
    await 길드맞이하기(admin, 창, 넷아이디, 내아이디, 4);
    await verify('세 봇을 차례로 길드에 초대해 수락하게 하면 길드원을 셋 더 받아도 막히지 않아 길드 창 위쪽이 「길드원 4명」이다', (await 창.길드머리기다리기('길드원 4명')) !== null, true);
  });
});
