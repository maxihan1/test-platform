import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기, 봇켜기, 자리고른사람, 접속자 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-505',
  name: '봇과 일반 회원이 같은 첫 자리 카드를 고르면 아직 아무도 확정하지 않은 카드는 둘이 같이 골라 둘 수 있다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 봇으로 로비에 접속해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 두번째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 두번째);
  });
  let 봇 = '';
  await test.step('두 번째 플레이어가 봇으로 로비에 접속한다', async () => {
    await 로비로(game, driver, 나);
    봇 = await 봇켜기(admin, 두번째);
    const 접속 = await 접속자(admin);
    await verify('두 번째 플레이어 봇이 로비에 접속해 있다', 접속.players.some((x) => x.user === 봇), true, { blocker: true });
  });
  await test.step('봇과 일반 회원이 같은 첫 자리 카드를 고른다', async () => {
    const 로비 = await 로비화면.열기(game);
    await 봇시키기(admin, 봇, 'seat:0');
    await 로비.자리이름이될때까지(0, 봇);
    await 로비.자리누르기(0);
    const 고른 = await 자리고른사람(admin, 0, [봇, 나.아이디]);
    const 봇보임 = await verify('봇이 첫 자리를 골라 둔 상태다', 고른.includes(봇), true);
    const 내보임 = await verify('일반 회원도 첫 자리를 골라 둔 상태다', 고른.includes(나.아이디), true);
    await verify('봇과 일반 회원이 같은 첫 자리 카드를 고르면 아직 아무도 확정하지 않은 카드는 둘이 같이 골라 둘 수 있다', 봇보임 && 내보임, true);
  });
});
