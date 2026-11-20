import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-507',
  name: '이미 다른 사람이 확정한 카드로 「준비!」를 누르면 확정되지 않아 「준비!」가 그대로다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 첫 자리를 확정했다'],
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
  await test.step('두 번째 플레이어 봇이 첫 자리를 확정한다', async () => {
    await 로비로(game, driver, 나);
    봇 = await 봇켜기(admin, 두번째);
    await 봇시키기(admin, 봇, 'seat:0');
    await 봇시키기(admin, 봇, 'ready');
    const 로비 = await 로비화면.열기(game);
    await verify('봇의 이름이 첫 자리에 보인다', await 로비.자리이름이될때까지(0, 봇), true, { blocker: true });
  });
  await test.step('일반 회원이 첫 자리를 고르고 「준비!」를 누른다', async () => {
    const 로비 = await 로비화면.열기(game);
    await 로비.자리누르기(0);
    await 로비.준비누르기();
    const 바뀜 = await verify('버튼이 「준비 취소」로 바뀌지 않는다', await 로비.준비버튼글이될때까지('준비 취소', 5_000), false);
    const 글 = await verify('버튼 글이 「준비!」다', await 로비.준비버튼글(), '준비!');
    await verify('이미 다른 사람이 확정한 카드로 「준비!」를 누르면 확정되지 않아 「준비!」가 그대로다', 바뀜 && 글, true);
  });
});
