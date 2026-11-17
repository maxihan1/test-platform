import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글이뜰때까지 } from './helpers/connect.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mail.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-148',
  name: '우편함 창에 「받은 우편이 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 우편함이 비어 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('우편함 창을 연다', async () => {
      await 우편함창.열기(game);
      await verify('우편함 창에 「받은 우편이 없습니다」가 보인다', await 글이뜰때까지(game, '받은 우편이 없습니다', 10_000), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
