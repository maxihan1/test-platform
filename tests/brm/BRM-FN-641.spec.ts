import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 자리고르기 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 손님봇들어올때까지 } from './helpers/ready-tools.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 준비체크표시 } from './pages/ready-check.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-641',
  name: '「준비!」를 누르면 내 영웅 자리에 체크 표시가 보인다',
  platforms: ['android'],
  precondition: ['탱커 자리를 고른 채 로비에 있고 확정하지 않는 손님 봇이 접속해 있다'],
  elements: ['state:장소=로비', 'state:직업=탱커', 'state:로비=준비 확정'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('로비에서 탱커 자리를 고르고 손님 봇을 접속시킨다', async () => {
    await 로비로(game, driver, 나);
    await 자리고르기(game, 0);
    const 탱커 = await new 로비화면(game).현재직업이될때까지('탱커');
    await verify('고른 자리의 직업이 「탱커」다', 탱커, true, { blocker: true });
    const 들어옴 = await 손님봇들어올때까지(admin, 'qa손님641');
    await verify('확정하지 않는 손님 봇이 접속해 있다', 들어옴, true, { blocker: true });
  });
  await test.step('로비에서 「준비!」를 누른다', async () => {
    const 뜸 = await 준비체크표시.준비누르고뜸(game, 0);
    await verify('「준비!」를 누르면 내 영웅 자리에 체크 표시가 보인다', 뜸, true);
  });
});
