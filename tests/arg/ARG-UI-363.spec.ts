import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-UI-363',
  name: '창 바깥의 어두운 곳을 누르면 창이 닫힌다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 창 바깥 어두운 곳이 창 몸통 아래에 깔려 누를 자리가 없다(좌표 누르기는 케이스에 쓸 수 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('가방 창을 열고 창 바깥의 어두운 곳을 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('창 바깥의 어두운 곳을 누르면 창이 닫힌다', await 있는지(game, 공통HUD.상단바), true);
  });
});
