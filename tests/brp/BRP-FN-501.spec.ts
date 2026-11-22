import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇두기 } from './helpers/dungeon.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기, 접속상태 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-501',
  name: '일반 회원이 0번 카드를 누르고 「준비!」를 누르면 다른 사람이 확정한 카드를 골라 「준비!」를 눌러도 확정되지 않는다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어 봇이 0번 카드를 확정했다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  await test.cleanup('봇을 끄고 방을 로비로 돌리기', () => 로비로되돌리기(admin));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('두 번째 플레이어 봇이 0번 카드를 확정한 것을 확인한다', async () => {
    const 봇 = await 봇두기(admin, params.p2Id ?? '', params.p2Password ?? '', 0);
    await verify('두 번째 플레이어 봇이 접속해 있다', (await 접속상태(admin)).bots.includes(봇), true, { blocker: true });
  });

  await test.step('일반 회원이 0번 카드를 누르고 「준비!」를 누른다', async () => {
    const 로비 = await 로비화면.열림(game);
    await 로비.자리누르기(0);
    await 로비.준비누르기();
    const 확정됐다 = await 로비.준비글될때까지('준비 취소', 5_000);
    const 안됨 = await verify('「준비 취소」로 바뀌지 않는다', 확정됐다, false);
    const 그대로 = await verify('버튼 글이 「준비!」 그대로다', await 로비.준비글읽기(), '준비!');
    await verify('일반 회원이 0번 카드를 누르고 「준비!」를 누르면 다른 사람이 확정한 카드를 골라 「준비!」를 눌러도 확정되지 않는다', 안됨 && 그대로, true);
  });
});
