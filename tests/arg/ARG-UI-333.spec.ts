import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-333',
  name: '채팅 창에 제목 「채팅」, 「전체」 · 「파티」 · 「길드」 탭, 안내 글 「메시지 입력 (100자)」인 칸, 「보내기」, 「닫기」가 보이고 「전체」 탭이 골라져 있다',
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
    await test.step('채팅 창을 연다', async () => {
      const 창 = await 채팅창.열기(game);
      const 제목 = await verify('제목이 「채팅」이다', await 창.글(채팅창.제목), '채팅');
      const 탭들 = await verify('「전체」 · 「파티」 · 「길드」 탭이 보인다', (await 창.탭보이나('전체')) && (await 창.탭보이나('파티')) && (await 창.탭보이나('길드')), true);
      const 안내 = await verify('입력 칸 안내 글이 「메시지 입력 (100자)」이다', await 창.글(채팅창.입력칸안내), '메시지 입력 (100자)');
      const 보내기 = await verify('「보내기」 버튼이 보인다', await 창.글(채팅창.보내기글), '보내기');
      const 닫기 = await verify('「닫기」 버튼이 보인다', await 창.글(채팅창.닫기글), '닫기');
      const 전체밝기 = await 창.탭밝기('전체');
      const 선택 = await verify('「전체」 탭이 골라져 있다', 전체밝기 > (await 창.탭밝기('파티')) && 전체밝기 > (await 창.탭밝기('길드')), true);
      await verify('채팅 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', await 창.배치문제들(), []);
      await verify('채팅 창에 제목 「채팅」, 「전체」 · 「파티」 · 「길드」 탭, 안내 글 「메시지 입력 (100자)」인 칸, 「보내기」, 「닫기」가 보이고 「전체」 탭이 골라져 있다', 제목 && 탭들 && 안내 && 보내기 && 닫기 && 선택, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
