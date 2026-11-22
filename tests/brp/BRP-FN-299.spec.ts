import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇줄기다리기, 봇줄수, 소셜정리, 파티맺기 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 친구파티창 } from './pages/friends.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-299',
  name: '파티 채팅을 보내고 두 봇 기록을 읽으면 「파티」 채팅은 같은 파티원만 받고 파티 밖 사람은 받지 않는다',
  platforms: ['windows'],
  precondition: ['일반 회원과 두 번째 플레이어가 파티이고 세 번째 플레이어는 파티 밖으로 접속해 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    채팅글: z.string().min(1).max(30).describe('보낼 채팅 글 — 공백이 아닌 30자 이하').default('QA 채팅 시험'),
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
  const 채팅글 = params.채팅글;
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }, { 아이디: 둘아이디, 비밀번호: 둘비밀번호 }, { 아이디: 셋아이디, 비밀번호: 셋비밀번호 }]));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('두 번째 플레이어 · 세 번째 플레이어 봇이 접속한 것을 확인한다', async () => {
    await 봇켜기(admin, 둘아이디, 둘비밀번호);
    await 봇켜기(admin, 셋아이디, 셋비밀번호);
    const 접속봇 = (await 접속상태(admin)).bots;
    await verify('두 번째 플레이어 봇이 접속해 있다', 접속봇.includes(둘아이디), true, { blocker: true });
    await verify('세 번째 플레이어 봇이 접속해 있다', 접속봇.includes(셋아이디), true, { blocker: true });
  });

  await test.step('일반 회원이 파티장으로 두 번째 플레이어와 파티가 된 것을 확인한다', async () => {
    const 창 = await 친구파티창.열기(game);
    await verify('두 번째 플레이어가 파티에 들어와 있다', await 파티맺기(admin, 창, 둘아이디, 내아이디, 2), true, { blocker: true });
    await 창.닫기();
  });

  await test.step('파티 채팅을 보내고 두 봇 기록을 읽는다', async () => {
    const 창 = await 채팅창.열기(game);
    await 창.탭고르기('파티');
    await 창.보내기(채팅글);
    const 둘받음 = await verify('두 번째 플레이어 봇 기록에 보낸 글이 있다', await 봇줄기다리기(admin, 둘아이디, 'chat', 채팅글), true);
    const 셋못받음 = await verify('파티 밖 세 번째 플레이어 봇 기록에 보낸 글이 없다', await 봇줄수(admin, 셋아이디, 'chat', 채팅글), 0);
    await verify('파티 채팅을 보내고 두 봇 기록을 읽으면 「파티」 채팅은 같은 파티원만 받고 파티 밖 사람은 받지 않는다', 둘받음 && 셋못받음, true);
  });
});
