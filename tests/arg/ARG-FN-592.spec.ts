import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 친구창 } from './pages/friends.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-592',
  name: '없는 이름으로 친구 신청을 하면 「그런 이름의 캐릭터가 없습니다」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    없는이름: z.string().min(1).describe('넣을 이름 — 없는 캐릭터 이름').default('qa_nobody'),
  }),
  expected: z.object({
    알림글: z.string().describe('없는 이름으로 친구 신청할 때 알림 문구').default('그런 이름의 캐릭터가 없습니다'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('친구 · 파티 창 이름 칸에 없는 이름을 넣고 「친구 신청」을 누른다', async () => {
    const 창 = await 친구창.열기(game);
    await 창.이름넣기(params.없는이름);
    await 창.친구신청누르기();
    await verify('없는 이름으로 친구 신청을 하면 「그런 이름의 캐릭터가 없습니다」 알림이 뜬다', await 창.hud.알림.뜨는지(expected.알림글), true);
  });
});
