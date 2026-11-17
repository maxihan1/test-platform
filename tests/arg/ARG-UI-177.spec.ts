import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-177',
  name: '채팅 창에 「전체」 · 「파티」 · 「길드」 탭이 보이고 접속 알림이 「[알림]」 줄로 보인다',
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
      const 전체 = await verify('「전체」 탭이 보인다', await 창.탭보이나('전체'), true);
      const 파티 = await verify('「파티」 탭이 보인다', await 창.탭보이나('파티'), true);
      const 길드 = await verify('「길드」 탭이 보인다', await 창.탭보이나('길드'), true);
      const 알림줄 = await verify('접속 알림이 「[알림]」 줄로 보인다', (await 창.줄글들()).some((줄) => 줄.startsWith('[알림]')), true);
      await verify('채팅 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', await 창.배치문제들(), []);
      await verify('채팅 창에 「전체」 · 「파티」 · 「길드」 탭이 보이고 접속 알림이 「[알림]」 줄로 보인다', 전체 && 파티 && 길드 && 알림줄, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
