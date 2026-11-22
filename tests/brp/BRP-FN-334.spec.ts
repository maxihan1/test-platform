import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 소셜정리, 알림글 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 친구파티창 } from './pages/friends.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-334',
  name: '그런 이름의 캐릭터가 없으면 친구 신청에 「그런 이름의 캐릭터가 없습니다」가 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    없는이름: z.string().min(1).describe('접속 중이 아닌 캐릭터 이름 — 없는 이름이면 같은 결과').default('qa없는이름'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 없는이름 = params.없는이름;
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }]));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('없는 이름을 넣고 「친구 신청」을 누른다', async () => {
    const 창 = await 친구파티창.열기(game);
    await 창.친구신청(없는이름);
    await verify('그런 이름의 캐릭터가 없으면 친구 신청에 「그런 이름의 캐릭터가 없습니다」가 뜬다', (await 알림글(game, '그런 이름의 캐릭터가 없습니다')) !== null, true);
  });
});
