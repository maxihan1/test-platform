import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mail.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-327',
  name: '우편함 창에 제목 「우편함」, 왼쪽 아래 「모두 받기」, 「닫기」가 보인다',
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('우편함 창을 연다', async () => {
      const 창 = await 우편함창.열기(game);
      const 제목 = await verify('창 제목이 「우편함」이다', await 창.글(우편함창.제목), '우편함');
      const 모두 = await verify('「모두 받기」가 보인다', await 창.모두받기글(), '모두 받기');
      const 닫기 = await verify('「닫기」가 보인다', await 창.닫기글(), '닫기');
      await verify('우편함 창에 제목 「우편함」, 왼쪽 아래 「모두 받기」, 「닫기」가 보인다', 제목 && 모두 && 닫기, true);
      const 배치 = await game.layout(우편함창.창);
      await verify('우편함 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
