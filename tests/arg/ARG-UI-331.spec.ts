import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-331',
  name: '길드가 없을 때 길드 창에 「아직 길드가 없습니다」, 「길드를 만들거나 길드장의 초대를 받아 보세요」, 안내 글 「길드 이름 (2~12자)」인 칸, 「만들기 · 500G」가 보인다',
  platforms: ['android'],
  precondition: ['길드가 없는 일반 회원으로 로비에 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로비로 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('길드 창을 연다', async () => {
      const 창 = await 길드창.열기(game);
      const 안내 = await 창.글(길드창.안내);
      const 없음 = await verify('「아직 길드가 없습니다」가 보인다', 안내.includes('아직 길드가 없습니다'), true);
      const 권유 = await verify('「길드를 만들거나 길드장의 초대를 받아 보세요」가 보인다', 안내.includes('길드를 만들거나 길드장의 초대를 받아 보세요'), true);
      const 칸 = await verify('이름 칸 안내 글이 「길드 이름 (2~12자)」이다', await 창.글(길드창.이름칸안내), '길드 이름 (2~12자)');
      const 버튼 = await verify('「만들기 · 500G」 버튼이 보인다', await 창.글(길드창.만들기글), '만들기 · 500G');
      await verify('길드 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', await 창.배치문제들(), []);
      await verify('길드가 없을 때 길드 창에 「아직 길드가 없습니다」, 「길드를 만들거나 길드장의 초대를 받아 보세요」, 안내 글 「길드 이름 (2~12자)」인 칸, 「만들기 · 500G」가 보인다', 없음 && 권유 && 칸 && 버튼, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
