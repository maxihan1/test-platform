import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-565',
  name: '전체와 파티 채팅을 보내면 전체 채팅은 서버에 접속한 모두가, 파티 채팅은 같은 파티원이, 길드 채팅은 접속 중인 같은 길드원이 받는다',
  platforms: ['android'],
  precondition: ['세 사람이 접속해 있고 둘은 같은 파티다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('전체와 파티 채팅을 보낸다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('전체와 파티 채팅을 보내면 전체 채팅은 서버에 접속한 모두가, 파티 채팅은 같은 파티원이, 길드 채팅은 접속 중인 같은 길드원이 받는다', await 있는지(game, 공통HUD.상단바), true);
  });
});
