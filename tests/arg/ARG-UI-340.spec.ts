import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 승리결과화면으로 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 결과화면 } from './pages/result.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-340',
  name: '결과 화면에 「잠시 뒤 로비로 돌아갑니다」와 「메인 메뉴로」가 보인다',
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

    await test.step('결과 화면을 확인한다', async () => {
      const 돌아감 = await verify('결과 화면에 「잠시 뒤 로비로 돌아갑니다」가 보인다', await 화면.글(결과화면.돌아감글), '잠시 뒤 로비로 돌아갑니다');
      const 메뉴 = await verify('결과 화면에 「메인 메뉴로」가 보인다', await 화면.글(결과화면.메인메뉴로글), '메인 메뉴로');
      await verify('결과 화면에 「잠시 뒤 로비로 돌아갑니다」와 「메인 메뉴로」가 보인다', 돌아감 && 메뉴, true);
      const 배치 = await game.layout(결과화면.캔버스);
      await verify('결과 화면의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
