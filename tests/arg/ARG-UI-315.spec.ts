import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 전체채팅두줄보내기 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-315',
  name: '채팅 띠에 최근 채팅 2줄이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 로비에서 전체 채팅 두 줄을 보냈다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 로비에서 전체 채팅 두 줄을 보낸다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 전체채팅두줄보내기(game, '첫 번째 채팅', '두 번째 채팅');
    });
    const 로비 = 로비화면.지금(game);
    await test.step('로비에 있는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비.보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('채팅 띠를 확인한다', async () => {
      await game.waitFor(공통HUD.채팅띠글, { text: '두 번째 채팅', timeoutMs: 10_000 }).catch(() => undefined);
      const 띠글 = await 로비.hud.채팅띠읽기();
      const 줄들 = 띠글.split('\n').filter((줄) => 줄.trim() !== '');
      const 두줄 = await verify('채팅 띠에 두 줄이 보인다', 줄들.length, 2);
      const 최근 = await verify('채팅 띠에 방금 보낸 「첫 번째 채팅」과 「두 번째 채팅」이 보인다', 줄들[0]?.includes('첫 번째 채팅') === true && 줄들[1]?.includes('두 번째 채팅') === true, true);
      await verify('채팅 띠에 최근 채팅 2줄이 보인다', 두줄 && 최근, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
