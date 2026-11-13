import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 친구창 } from './pages/friends.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-240',
  name: '파티가 없으면 친구 · 파티 창에 「파티 없음」이 보인다',
  platforms: ['android'],
  precondition: ['파티가 없고 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('친구 · 파티 창을 연다', async () => {
    const 창 = await 친구창.열기(game);
    await verify('파티가 없으면 친구 · 파티 창에 「파티 없음」이 보인다', await 창.줄뜨는지('파티 없음'), true);
  });
});
