import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 친구창 } from './pages/friends.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-597',
  name: '이름 칸이 빈 채 「친구 신청」을 누르면 알림이 뜨지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    알림수: z.number().describe('보이는 알림 개수').default(0),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('친구 · 파티 창 이름 칸을 비우고 「친구 신청」을 누른다', async () => {
    const 창 = await 친구창.열기(game);
    const 칸글 = await 창.이름넣기('');
    await verify('친구 · 파티 창 이름 칸이 비어 있다', 칸글, '', { blocker: true });
    await verify('친구 · 파티 창을 열었을 때 알림이 하나도 없다', await 창.hud.알림.개수(), expected.알림수, { blocker: true });
    await 창.친구신청누르기();
    await 창.hud.알림.뜨는지('님에게', 3_000);
    await verify('이름 칸이 빈 채 「친구 신청」을 누르면 알림이 뜨지 않는다', await 창.hud.알림.개수(), expected.알림수);
  });
});
