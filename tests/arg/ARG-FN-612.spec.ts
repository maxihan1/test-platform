import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 친구창 } from './pages/friends.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-612',
  name: '내 이름으로 파티 초대를 하면 「자신은 초대할 수 없습니다」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    알림글: z.string().describe('내 이름으로 파티 초대할 때 알림 문구').default('자신은 초대할 수 없습니다'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  let 이름 = '';

  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    이름 = await 대기실.hud.캐릭터이름();
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('친구 · 파티 창 이름 칸에 내 캐릭터 이름을 넣고 「파티 초대」를 누른다', async () => {
    const 창 = await 친구창.열기(game);
    await 창.이름넣기(이름);
    await 창.파티초대누르기();
    await verify('내 이름으로 파티 초대를 하면 「자신은 초대할 수 없습니다」 알림이 뜬다', await 창.hud.알림.뜨는지(expected.알림글), true);
  });
});
