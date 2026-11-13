import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-663',
  name: '내가 확정하면 같은 카드를 고르고 있던 다른 사람은 선택이 풀리고, 이미 다른 사람이 확정한 카드는 확정되지 않는다',
  platforms: ['android'],
  precondition: ['다른 접속자가 같은 카드를 선택하고 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('내가 그 카드로 「준비!」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('내가 확정하면 같은 카드를 고르고 있던 다른 사람은 선택이 풀리고, 이미 다른 사람이 확정한 카드는 확정되지 않는다', await 있는지(game, 공통HUD.상단바), true);
  });
});
