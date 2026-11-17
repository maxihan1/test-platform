import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점에서사기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-107',
  name: '가방 창에 「녹슨 단검」이 한 개마다 한 줄로 두 줄 보인다',
  platforms: ['android'],
  precondition: ['「녹슨 단검」 두 개를 가진 일반 회원으로 로비에 있다'],
  elements: ['item:rusty_dagger'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 「녹슨 단검」을 두 개 산다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 상점에서사기(game, ['녹슨 단검', '녹슨 단검']);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('가방 창을 연다', async () => {
      const 가방 = await 가방창.열기(game);
      const 단검줄들 = (await 가방.목록.첫칸들()).filter((글) => 글.startsWith('녹슨 단검'));
      await verify('가방 창에 「녹슨 단검」이 한 개마다 한 줄로 두 줄 보인다', 단검줄들.join(' / '), '녹슨 단검 / 녹슨 단검');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
