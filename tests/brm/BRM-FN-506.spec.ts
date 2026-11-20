import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-506',
  name: '「준비!」로 확정하면 같은 카드를 고르던 봇의 선택이 풀린다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇과 일반 회원이 같은 첫 자리를 골라 두었다'],
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
  await test.step('두 번째 플레이어 봇과 일반 회원이 같은 첫 자리를 골라 둔다', async () => {
    await 로비로(game, driver, 나);
    봇 = await 봇켜기(admin, 두번째);
    const 로비 = await 로비화면.열기(game);
    await 봇시키기(admin, 봇, 'seat:0');
    await 로비.자리누르기(0);
    await verify('봇의 이름이 첫 자리에 보인다', await 로비.자리이름이될때까지(0, 봇), true, { blocker: true });
  });
  await test.step('일반 회원이 「준비!」를 누른다', async () => {
    const 로비 = await 로비화면.열기(game);
    await 로비.준비누르기();
    await 로비.준비버튼글이될때까지('준비 취소');
    await verify('「준비!」로 확정하면 같은 카드를 고르던 봇의 선택이 풀린다', await 로비.자리에이름없어질때까지(0, 봇), true);
  });
});
