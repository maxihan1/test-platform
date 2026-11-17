import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 승리결과화면으로 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 결과화면 } from './pages/result.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-342',
  name: '전용 서버의 결과 화면에는 「다시 하기」가 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원이 승리해 결과 화면에 있다'],
  elements: ['move:장소 던전→로비'],
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
    let 화면 = 결과화면.지금(game);
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 보스를 처치해 승리 결과 화면을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      화면 = await 승리결과화면으로(game, 아이디, 비밀번호);
    });
    await test.step('결과 화면이 열려 있는지 확인한다', async () => {
      await verify('결과 화면에 「메인 메뉴로」 버튼이 보인다', await 화면.보이나(결과화면.메인메뉴로), true, { blocker: true });
    });

    await test.step('결과 화면 버튼을 확인한다', async () => {
      await verify('전용 서버의 결과 화면에는 「다시 하기」가 보이지 않는다', await 화면.보이나(결과화면.다시하기), false);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
