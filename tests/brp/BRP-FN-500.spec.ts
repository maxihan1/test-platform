import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-500',
  name: '같은 카드를 고르던 중 내가 「준비!」를 누르면 그 카드가 내 것으로 확정되고 봇의 선택이 풀린다',
  platforms: ['windows'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 같은 0번 카드를 고르고 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  const 봇아이디 = params.p2Id ?? '';
  const 봇비밀번호 = params.p2Password ?? '';
  let 봇 = '';
  await test.cleanup('봇을 끄고 두 계정을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 봇아이디, 봇비밀번호, 'base');
  });

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });
  await test.step('두 번째 플레이어 봇이 0번 카드를 고른 것을 확인한다', async () => {
    봇 = await 봇켜기(admin, 봇아이디, 봇비밀번호);
    await 봇시키기(admin, 봇, 'seat:0');
    const 로비 = await 로비화면.열림(game);
    const 이름 = await 로비.자리이름글될때까지(0, (글) => 글.includes(봇));
    await verify('0번 카드에 두 번째 플레이어 이름이 보인다', 이름.includes(봇), true, { blocker: true });
  });

  await test.step('일반 회원도 0번 카드를 고른 것을 확인한다', async () => {
    const 로비 = await 로비화면.열림(game);
    await 로비.자리누르기(0);
    const 이름 = await 로비.자리이름글될때까지(0, (글) => 글.includes(아이디));
    await verify('0번 카드에 일반 회원 이름이 보인다', 이름.includes(아이디), true, { blocker: true });
  });

  await test.step('일반 회원이 「준비!」를 누른다', async () => {
    const 로비 = await 로비화면.열림(game);
    await 로비.준비누르기();
    const 확정 = await verify('0번 카드에 확정 표시가 뜬다', await 로비.자리확정표시될때까지(0), true);
    const 이름 = await 로비.자리이름글될때까지(0, (글) => !글.includes(봇));
    const 내것 = await verify('0번 카드에 일반 회원 이름이 남는다', 이름.includes(아이디), true);
    const 풀림 = await verify('0번 카드에서 두 번째 플레이어 이름이 빠진다', 이름.includes(봇), false);
    await verify('같은 카드를 고르던 중 내가 「준비!」를 누르면 그 카드가 내 것으로 확정되고 봇의 선택이 풀린다', 확정 && 내것 && 풀림, true);
  });
});
