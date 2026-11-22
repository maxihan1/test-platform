import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-499',
  name: '봇이 0번 카드를 고른 채 일반 회원도 0번 카드를 누르면 아무도 확정하지 않은 카드는 둘이 동시에 골라 정보 상자에 그 직업이 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 로비에 있다'],
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

  await test.step('봇이 0번 카드를 고른 채 일반 회원도 0번 카드를 누른다', async () => {
    const 로비 = await 로비화면.열림(game);
    await 로비.자리누르기(0);
    await 로비.자리이름글될때까지(0, (글) => 글.includes(아이디));
    await verify('봇이 0번 카드를 고른 채 일반 회원도 0번 카드를 누르면 아무도 확정하지 않은 카드는 둘이 동시에 골라 정보 상자에 그 직업이 보인다', await 로비.정보상자직업글될때까지('탱커'), '탱커');
  });
});
