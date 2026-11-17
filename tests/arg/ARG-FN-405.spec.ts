import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 던전에들어갈때까지 } from './helpers/battle.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-405',
  name: '내가 그 카드로 확정하면 같은 카드를 고르고 있던 다른 사람은 선택이 풀린다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 로비에서 첫 카드를 골랐고 아직 준비하지 않았다', '두 번째 플레이어 봇이 로비에서 첫 카드로 이미 준비했다'],
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
  const 둘째아이디 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  let 봇 = '';
  try {
    await test.step('두 계정을 처음 상태로 되돌리고 봇이 첫 카드를 고른 뒤 일반 회원으로 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
      봇 = await 봇켜기(admin, { user: 둘째아이디, pass: 둘째비밀번호 });
      await 봇시키기(admin, 봇, 'seat:0');
      await 로비로(game, 아이디, 비밀번호);
    });
    const 로비 = 로비화면.지금(game);
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비.보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('같은 첫 카드를 골라 「준비!」를 누르고 봇 상태를 읽는다', async () => {
      await 로비.카드누르기(로비화면.카드차례.탱커);
      await 로비.준비누르기();
      await game.waitFor(로비화면.준비글, { text: '준비 취소', timeoutMs: 10_000 }).catch(() => undefined);
      await 봇시키기(admin, 봇, 'ready');
      const 던전으로갔다 = await 던전에들어갈때까지(game, 10_000);
      await verify('내가 그 카드로 확정하면 같은 카드를 고르고 있던 다른 사람은 선택이 풀린다', 던전으로갔다, false);
    });

    await test.step('「준비 취소」를 누르고 봇이 첫 카드로 준비하게 한 뒤 일반 회원이 로비에서 기다린다', async () => {
      await 로비.준비누르기();
      await game.waitFor(로비화면.준비글, { text: '준비!', timeoutMs: 10_000 }).catch(() => undefined);
      await 봇시키기(admin, 봇, 'seat:0');
      await 봇시키기(admin, 봇, 'ready');
    });

    await test.step('같은 첫 카드를 골라 「준비!」를 누른다', async () => {
      await game.click(로비화면.카드(로비화면.카드차례.탱커));
      await 로비.준비누르기();
      const 확정됐다 = await game.waitFor(로비화면.준비글, { text: '준비 취소', timeoutMs: 8_000 }).then(
        () => true,
        () => false,
      );
      await verify('이미 다른 사람이 확정한 카드는 내가 「준비!」를 눌러도 확정되지 않는다', 확정됐다, false);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
  }
});
