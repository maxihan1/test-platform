import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드세우기, 소셜정리, 알림글 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 접속상태 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-396',
  name: '접속하지 않은 캐릭터를 길드에 초대하면 「접속 중인 캐릭터만 초대할 수 있습니다」가 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원이 길드장인 길드가 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    길드이름: z.string().min(2).max(12).describe('만들 길드 이름 — 앞뒤 공백 없는 2~12자').default('QA길드'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 둘아이디 = params.p2Id ?? '';
  const 둘비밀번호 = params.p2Password ?? '';
  const 길드이름 = params.길드이름;
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }, { 아이디: 둘아이디, 비밀번호: 둘비밀번호 }]));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('일반 회원이 길드장인 길드가 있는 것을 확인한다', async () => {
    const 창 = await 길드세우기(game, 길드이름);
    await verify('일반 회원이 길드장인 길드가 있다', 창 !== null, true, { blocker: true });
  });

  await test.step('두 번째 플레이어가 접속해 있지 않은 것을 확인한다', async () => {
    await verify('두 번째 플레이어 봇이 꺼져 있다', !(await 접속상태(admin)).bots.includes(둘아이디), true, { blocker: true });
  });

  await test.step('접속하지 않은 두 번째 플레이어 이름을 넣고 「초대」를 누른다', async () => {
    const 창 = await 길드창.열기(game);
    await 창.초대하기(둘아이디);
    await verify('접속하지 않은 캐릭터를 길드에 초대하면 「접속 중인 캐릭터만 초대할 수 있습니다」가 뜬다', (await 알림글(game, '접속 중인 캐릭터만 초대할 수 있습니다')) !== null, true);
  });
});
