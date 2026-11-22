import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇길드만들기, 봇이초대하기, 소셜정리 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-378',
  name: '길드 초대를 받으면 「길드 초대」 창에 「님이 길드」와 「에 초대했습니다」가 그 길드 이름과 함께 보인다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어가 길드장인 길드가 있고 일반 회원은 길드가 없다'],
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

  await test.step('두 번째 플레이어 봇이 접속한 것을 확인한다', async () => {
    await 봇켜기(admin, 둘아이디, 둘비밀번호);
    const 접속봇 = (await 접속상태(admin)).bots;
    await verify('두 번째 플레이어 봇이 접속해 있다', 접속봇.includes(둘아이디), true, { blocker: true });
  });

  await test.step('두 번째 플레이어 봇이 길드장인 길드가 있는 것을 확인한다', async () => {
    await verify('두 번째 플레이어 봇이 길드를 만들었다', await 봇길드만들기(admin, 둘아이디, 길드이름), true, { blocker: true });
  });

  await test.step('두 번째 플레이어 봇이 일반 회원을 길드에 초대한다', async () => {
    await 봇이초대하기(admin, 'guild', 둘아이디, 내아이디);
    const 초대 = await 초대창.뜰때까지(game);
    await verify('초대 창이 뜬다', 초대 !== null, true, { blocker: true });
    const 글 = (await 초대?.글기다리기('에 초대했습니다')) ?? null;
    const 앞조각 = await verify('「님이 길드」가 보인다', 글 !== null && 글.includes('님이 길드'), true);
    const 뒷조각 = await verify('「에 초대했습니다」가 보인다', 글 !== null, true);
    const 이름보임 = await verify('초대 창 글에 길드 이름이 있다', 글 !== null && 글.includes(길드이름), true);
    await verify('길드 초대를 받으면 「길드 초대」 창에 「님이 길드」와 「에 초대했습니다」가 그 길드 이름과 함께 보인다', 앞조각 && 뒷조각 && 이름보임, true);
  });
});
