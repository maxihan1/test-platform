import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-589',
  name: '같은 신청을 두 번 보내면 신청 기록은 하나만 남고 받는 쪽 창은 다시 뜬다',
  platforms: ['android'],
  precondition: ['다른 캐릭터가 접속해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('같은 이름으로 「친구 신청」을 두 번 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('같은 신청을 두 번 보내면 신청 기록은 하나만 남고 받는 쪽 창은 다시 뜬다', await 있는지(game, 공통HUD.상단바), true);
  });
});
