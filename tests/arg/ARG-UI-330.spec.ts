import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-330',
  name: '친구 · 파티 창에 제목 「친구 · 파티」, 안내 글 「캐릭터 이름」인 칸, 「친구 신청」 · 「파티 초대」, 「파티 없음」, 「친구 0명」, 「닫기」가 보인다',
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로비로 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('친구 · 파티 창을 연다', async () => {
      const 창 = await 친구파티창.열기(game);
      const 제목 = await verify('제목이 「친구 · 파티」이다', await 창.글(친구파티창.제목), '친구 · 파티');
      const 안내 = await verify('이름 칸 안내 글이 「캐릭터 이름」이다', await 창.글(친구파티창.이름칸안내), '캐릭터 이름');
      const 신청 = await verify('「친구 신청」 버튼이 보인다', await 창.글(친구파티창.친구신청글), '친구 신청');
      const 초대 = await verify('「파티 초대」 버튼이 보인다', await 창.글(친구파티창.파티초대글), '파티 초대');
      const 줄들 = await 창.줄글들();
      const 파티 = await verify('「파티 없음」이 보인다', 줄들.includes('파티 없음'), true);
      const 친구 = await verify('「친구 0명」이 보인다', 줄들.includes('친구 0명'), true);
      const 닫기 = await verify('「닫기」 버튼이 보인다', await 창.글(친구파티창.닫기글), '닫기');
      await verify('친구 · 파티 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', await 창.배치문제들(), []);
      await verify('친구 · 파티 창에 제목 「친구 · 파티」, 안내 글 「캐릭터 이름」인 칸, 「친구 신청」 · 「파티 초대」, 「파티 없음」, 「친구 0명」, 「닫기」가 보인다', 제목 && 안내 && 신청 && 초대 && 파티 && 친구 && 닫기, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
