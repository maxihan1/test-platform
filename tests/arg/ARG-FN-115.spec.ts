import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 수치 } from './helpers/battle.helper.js';
import { GM, 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-115',
  name: '최고 레벨에서 경험치를 받으면 경험치는 쌓이고 레벨은 30 그대로다',
  platforms: ['android'],
  precondition: ['레벨 30 일반 회원으로 로비에 있다'],
  elements: ['level:30'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 레벨을 30 으로 바꾼다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm level 30');
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('GM 명령으로 경험치 1000 을 준다', async () => {
      await GM(game, '/gm exp 1000');
      const 상태 = await 상태읽기(game);
      const 쌓임 = await verify('경험치가 1000 쌓인다', 수치(상태, '경험치'), 1000);
      const 그대로 = await verify('레벨이 30 이다', 수치(상태, '레벨'), 30);
      await verify('최고 레벨에서 경험치를 받으면 경험치는 쌓이고 레벨은 30 그대로다', 쌓임 && 그대로, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
