import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇시키기, 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 봇파티맺기, 소셜정리, 파티원줄 } from './helpers/social.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 친구파티창 } from './pages/friends.page.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-346',
  name: '파티장이 나가면 다음으로 들어온 일반 회원이 파티장이 돼 파티 목록에서 내 이름 앞에 「★」가 붙는다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어가 파티장이고 일반 회원 · 세 번째 플레이어가 차례로 들어온 파티다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
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
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }, { 아이디: 둘아이디, 비밀번호: 둘비밀번호 }, { 아이디: 셋아이디, 비밀번호: 셋비밀번호 }]));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });
  await test.step('두 번째 플레이어 봇이 접속한 것을 확인한다', async () => {
    await 봇켜기(admin, 둘아이디, 둘비밀번호);
    const 접속봇 = (await 접속상태(admin)).bots;
    await verify('두 번째 플레이어 봇이 접속해 있다', 접속봇.includes(둘아이디), true, { blocker: true });
  });
  await test.step('세 번째 플레이어 봇이 접속한 것을 확인한다', async () => {
    await 봇켜기(admin, 셋아이디, 셋비밀번호);
    const 접속봇 = (await 접속상태(admin)).bots;
    await verify('세 번째 플레이어 봇이 접속해 있다', 접속봇.includes(셋아이디), true, { blocker: true });
  });

  await test.step('두 번째 플레이어가 파티장이고 일반 회원 · 세 번째 플레이어가 차례로 들어온 파티인 것을 확인한다', async () => {
    await 봇시키기(admin, 둘아이디, `party_invite:${내아이디}`);
    const 초대 = await 초대창.뜰때까지(game);
    await verify('파티 초대 창이 뜬다', 초대 !== null, true, { blocker: true });
    await 초대?.수락누르기();
    await verify('세 번째 플레이어가 파티에 들어왔다', await 봇파티맺기(admin, 둘아이디, 셋아이디), true, { blocker: true });
    const 창 = await 친구파티창.열기(game);
    await verify('파티 목록이 3명이다', await 창.머리줄기다리기('파티 3/4'), true, { blocker: true });
    await 창.닫기();
  });

  await test.step('두 번째 플레이어 봇이 파티를 나간 뒤 친구 · 파티 창의 파티 목록을 읽는다', async () => {
    await 봇시키기(admin, 둘아이디, 'party_leave');
    const 창 = await 친구파티창.열기(game);
    await 창.머리줄기다리기('파티 2/4');
    const 줄 = 파티원줄(await 창.줄들(), 내아이디);
    const 글 = 줄 === null ? '' : 색글떼기(줄);
    await verify('파티장이 나가면 다음으로 들어온 일반 회원이 파티장이 돼 파티 목록에서 내 이름 앞에 「★」가 붙는다', 글.includes('★') && 글.indexOf('★') < 글.indexOf(내아이디), true);
  });
});
