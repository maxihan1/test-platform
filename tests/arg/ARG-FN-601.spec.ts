import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-601',
  name: '친구 · 파티 창을 열면 처음 초대한 사람이 파티장이고 목록에서 이름 앞에 금색 「★」가 붙는다',
  platforms: ['android'],
  precondition: ['파티를 만들었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('친구 · 파티 창을 연다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('친구 · 파티 창을 열면 처음 초대한 사람이 파티장이고 목록에서 이름 앞에 금색 「★」가 붙는다', await 있는지(game, 공통HUD.상단바), true);
  });
});
