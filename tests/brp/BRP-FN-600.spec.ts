import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 소셜정리 } from './helpers/social.helper.js';
import { 친구파티창 } from './pages/friends.page.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-600',
  name: '받은 친구 신청이 있으면 친구 · 파티 창 맨 위 「받은 친구 신청」에 그 줄이 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 친구 · 파티 · 길드 없이 접속해 있다'],
  held: '보류 — 친구 신청 창을 수락 · 거절 없이 닫을 길이 없다',
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 둘아이디 = params.p2Id ?? '';
  const 둘비밀번호 = params.p2Password ?? '';
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }, { 아이디: 둘아이디, 비밀번호: 둘비밀번호 }]));

  await test.step('일반 회원으로 로그인하고 두 번째 플레이어 봇을 켠 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    await 봇켜기(admin, 둘아이디, 둘비밀번호);
  });

  await test.step('두 번째 플레이어 봇이 친구 신청을 보내고, 게임을 다시 켜 신청 창 없이 친구 · 파티 창을 연다', async () => {
    await 봇시키기(admin, 둘아이디, `friend_add:${내아이디}`);
    const 초대 = await 초대창.뜰때까지(game);
    await verify('친구 신청 창이 뜬다', 초대 !== null, true, { blocker: true });
    const 다시로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('게임을 다시 켜 로그인하니 로비 화면이 열린다', 다시로비 !== null, true, { blocker: true });
    await verify('다시 들어오니 친구 신청 창이 없다', (await 초대창.뜰때까지(game, 3_000)) === null, true, { blocker: true });
    const 창 = await 친구파티창.열기(game);
    await verify('받은 친구 신청이 있으면 친구 · 파티 창 맨 위 「받은 친구 신청」에 그 줄이 보인다', (await 창.머리줄기다리기('받은 친구 신청')) && (await 창.줄기다리기((줄들) => 줄들.some((줄) => 줄.includes(둘아이디)))) !== null, true);
  });

  await test.step('받은 신청 줄의 「수락」을 누른다', async () => {
    const 창 = await 친구파티창.열기(game);
    const 번호 = (await 창.줄들()).findIndex((줄) => 줄.includes(둘아이디));
    await 창.줄버튼누르기(번호, '수락');
    await verify('「받은 친구 신청」 줄에서 「수락」을 누른 뒤 친구 목록에 그 사람이 들어온다', (await 창.친구줄기다리기(둘아이디, 둘아이디)) !== null, true);
  });
});
