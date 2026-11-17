import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 공통HUD } from './components/hud.component.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-093',
  name: '최고 레벨이면 상단 바 경험치 막대가 가득 찬 채 「최고 레벨」로 보인다',
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

    await test.step('상단 바 경험치 막대를 확인한다', async () => {
      const 보임 = await game.waitFor(공통HUD.경험치, { text: '최고 레벨', timeoutMs: 10_000 }).then(
        () => true,
        () => false,
      );
      await verify('최고 레벨이면 상단 바 경험치 막대가 가득 찬 채 「최고 레벨」로 보인다', 보임, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
