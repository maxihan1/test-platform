import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 둘이서던전으로 } from './helpers/battle.helper.js';
import { GM, 계정되돌리기, 봇끄기, 접속끊기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 결과화면 } from './pages/result.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-092',
  name: '남은 사람이 모두 쓰러진 상태가 되도록 누가 접속을 끊으면 결과 화면에 「다시 도전」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 함께 던전에 있다'],
  elements: ['zone:Dungeon', 'move:생존 살아 있음→쓰러짐'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 둘째 = { 아이디: params.secondId ?? '', 비밀번호: params.secondPassword ?? '' };
  try {
    await test.step('두 계정을 처음 상태로 되돌리고 봇과 함께 던전에 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 계정되돌리기(admin, 둘째.아이디, 둘째.비밀번호, 'base');
      await 둘이서던전으로(game, admin, { 아이디, 비밀번호 }, 둘째, 0);
    });
    await test.step('던전에 들어왔는지 확인한다', async () => {
      await verify('던전에 「공격」 버튼이 보인다', await 던전화면.지금(game).보이나(던전화면.공격), true, { blocker: true });
    });

    await test.step('내가 쓰러진 뒤 봇의 접속을 끊는다', async () => {
      await GM(game, '/gm faint');
      await 접속끊기(admin, 둘째.아이디);
      const 떴다 = await game.waitFor(결과화면.패배글, { timeoutMs: 20_000 }).then(
        () => true,
        () => false,
      );
      await verify('남은 사람이 모두 쓰러진 상태가 되도록 누가 접속을 끊으면 결과 화면에 「다시 도전」이 보인다', 떴다, true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째.아이디, 둘째.비밀번호, 'base');
  }
});
