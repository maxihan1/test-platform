import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 화면자리 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-303',
  name: '로비 왼쪽 위에 화면 제목 「영웅을 선택하세요!」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['zone:Lobby'],
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

    await test.step('로비 화면 제목을 확인한다', async () => {
      const 글 = await verify('화면 제목 「영웅을 선택하세요!」가 보인다', await 로비.글(로비화면.제목), '영웅을 선택하세요!');
      const 자리 = await 화면자리(game, 로비화면.제목);
      const 왼쪽 = await verify('화면 제목이 화면 왼쪽에 있다', 자리.가로 < 0.5, true);
      const 위 = await verify('화면 제목이 화면 위쪽에 있다', 자리.세로 < 0.5, true);
      await verify('로비 왼쪽 위에 화면 제목 「영웅을 선택하세요!」가 보인다', 글 && 왼쪽 && 위, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
