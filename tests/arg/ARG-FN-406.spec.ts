import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇켜기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-406',
  name: '「준비 취소」를 누르면 확정이 풀려 다른 카드를 다시 고를 수 있다',
  platforms: ['android'],
  precondition: ['일반 회원이 로비에서 영웅을 골라 준비했다'],
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
  try {
    await test.step('두 계정을 처음 상태로 되돌리고 준비하지 않는 봇을 켠 뒤 일반 회원이 영웅을 골라 준비한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째아이디, pass: 둘째비밀번호 });
      const 로비 = await 로비로(game, 아이디, 비밀번호);
      await 로비.카드누르기(로비화면.카드차례.탱커);
      await 로비.준비누르기();
      await game.waitFor(로비화면.준비글, { text: '준비 취소', timeoutMs: 10_000 }).catch(() => undefined);
    });
    const 로비 = 로비화면.지금(game);
    await test.step('준비했는지 확인한다', async () => {
      await verify('버튼이 「준비 취소」로 바뀐다', await 로비.준비글읽기(), '준비 취소', { blocker: true });
    });

    await test.step('「준비 취소」를 누르고 다른 카드를 누른다', async () => {
      await 로비.준비누르기();
      await game.waitFor(로비화면.준비글, { text: '준비!', timeoutMs: 10_000 }).catch(() => undefined);
      const 풀림 = await verify('버튼이 「준비!」로 돌아온다', await 로비.준비글읽기(), '준비!');
      await 로비.카드누르기(로비화면.카드차례.궁수);
      await game.waitFor(로비화면.직업이름, { text: '궁수', timeoutMs: 10_000 }).catch(() => undefined);
      const 다시고름 = await verify('정보 상자에 다시 고른 직업 「궁수」가 보인다', await 로비.직업이름읽기(), '궁수');
      await verify('「준비 취소」를 누르면 확정이 풀려 다른 카드를 다시 고를 수 있다', 풀림 && 다시고름, true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
  }
});
