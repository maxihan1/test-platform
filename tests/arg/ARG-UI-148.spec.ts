import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편함비우기 } from './helpers/economy.helper.js';
import { 우편함창 } from './pages/mail.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-148',
  name: '우편함이 비었으면 「받은 우편이 없습니다」가 보인다',
  held: '보류 — 일반 회원 우편함에 받지도 지우지도 못하는 「알 수 없는 아이템」 우편 2통(ARG-FN-202 · ARG-FN-210 이 넣은 것)이 남아 우편 수 · 빈 우편함을 만들 수 없다',
  platforms: ['android'],
  precondition: ['우편함을 비운 일반 회원으로 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 우편함을 비운다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 우편함비우기(game);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('우편함 창을 연다', async () => {
      await 우편함창.열기(game);
      const 보임 = await game.waitFor(우편함창.빈우편함, { timeoutMs: 10_000 }).then(() => true, () => false);
      await verify('우편함이 비었으면 「받은 우편이 없습니다」가 보인다', 보임, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
