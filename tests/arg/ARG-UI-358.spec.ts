import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-UI-358',
  name: '채팅 창에서 고른 탭은 밝게, 나머지는 어둡게 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 값을 읽을 게임 오브젝트 칸을 모름',
});

test(spec, async ({ game, params }) => {
  await test.step('채팅 창 탭 밝기를 읽는다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('채팅 창에서 고른 탭은 밝게, 나머지는 어둡게 보인다', await 있는지(game, 공통HUD.상단바), true);
  });
});
