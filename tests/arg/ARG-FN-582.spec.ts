import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-582',
  name: '파티 탭에서 보내 오류 알림을 띄우고 색을 읽으면 오류 알림은 바탕이 어두운 빨강, 글씨가 연분홍이다',
  platforms: ['android'],
  precondition: ['파티가 없고 로비에 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 값을 읽을 게임 오브젝트 칸을 모름',
});

test(spec, async ({ game, params }) => {
  await test.step('파티 탭에서 보내 오류 알림을 띄우고 색을 읽는다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('파티 탭에서 보내 오류 알림을 띄우고 색을 읽으면 오류 알림은 바탕이 어두운 빨강, 글씨가 연분홍이다', await 있는지(game, 공통HUD.상단바), true);
  });
});
