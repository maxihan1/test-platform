import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-306',
  name: '영웅을 고르기 전 로비 정보 상자에 「환영합니다, P<번호>!」와 「직업을 선택하세요」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 로비에 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    const 로비 = 로비화면.지금(game);
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비.보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('로비 정보 상자를 확인한다', async () => {
      const 환영 = await verify('정보 상자에 「환영합니다, P<번호>!」가 보인다', /^환영합니다, P\d+!$/.test(await 로비.글(로비화면.환영글)), true);
      const 안내 = await verify('정보 상자에 「직업을 선택하세요」가 보인다', await 로비.글(로비화면.직업안내), '직업을 선택하세요');
      await verify('영웅을 고르기 전 로비 정보 상자에 「환영합니다, P<번호>!」와 「직업을 선택하세요」가 보인다', 환영 && 안내, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
