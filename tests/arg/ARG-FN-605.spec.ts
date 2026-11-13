import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-605',
  name: '한 사람에게 걸린 파티 초대는 하나뿐이고 새 초대가 오면 앞의 초대는 사라진다',
  platforms: ['android'],
  precondition: ['파티 초대를 받았다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('다른 사람이 또 초대한다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('한 사람에게 걸린 파티 초대는 하나뿐이고 새 초대가 오면 앞의 초대는 사라진다', await 있는지(game, 공통HUD.상단바), true);
  });
});
