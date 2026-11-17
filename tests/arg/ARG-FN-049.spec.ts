import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편넣기, 우편메뉴글될때까지 } from './helpers/economy.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-049',
  name: '우편이 1통 온 채 로그인하면 로비에 들어오자마자 메뉴가 「우편 1」로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 우편함이 비어 있고 첨부 있는 우편 1통을 보내 두었다'],
  elements: ['item:health_potion'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 첨부 있는 우편 1통을 보낸다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-049', [{ 이름: '체력 물약', 개수: 1 }]);
    });
    await test.step('일반 회원으로 로그인한다', async () => {
      const 로비 = await 로비로(game, 아이디, 비밀번호);
      await verify('로비에 「준비!」 버튼이 보인다', await 로비.보이나(로비화면.준비), true, { blocker: true });
      await 우편메뉴글될때까지(game, '우편 1', 10_000);
      await verify('우편이 1통 온 채 로그인하면 로비에 들어오자마자 메뉴가 「우편 1」로 보인다', await 로비.hud.우편메뉴글(), '우편 1');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
