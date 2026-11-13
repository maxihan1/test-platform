import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 친구창 } from './pages/friends.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-594',
  name: '이미 친구인 캐릭터에게 친구 신청을 하면 「이미 친구입니다」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['접속하지 않은 친구 「qa_player2」가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    친구이름: z.string().min(1).describe('친구 신청할 이름 — 접속하지 않은 친구의 캐릭터 이름').default('qa_player2'),
  }),
  expected: z.object({
    알림글: z.string().describe('이미 친구일 때 알림 문구').default('이미 친구입니다'),
    오프라인글: z.string().describe('접속하지 않은 친구 줄 글자').default('오프라인'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  let 창: 친구창;

  await test.step('일반 회원으로 로비에 들어가 친구 목록을 확인한다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    창 = await 친구창.열기(game);
    await 창.줄뜨는지(params.친구이름);
    const 줄 = (await 창.친구줄(params.친구이름)) ?? '';
    await verify('친구 목록의 그 친구 줄에 「오프라인」이 보인다', 줄.includes(expected.오프라인글), true, { blocker: true });
  });

  await test.step('친구 · 파티 창 이름 칸에 친구 이름을 넣고 「친구 신청」을 누른다', async () => {
    await 창.이름넣기(params.친구이름);
    await 창.친구신청누르기();
    await verify('이미 친구인 캐릭터에게 친구 신청을 하면 「이미 친구입니다」 알림이 뜬다', await 창.hud.알림.뜨는지(expected.알림글), true);
  });
});
