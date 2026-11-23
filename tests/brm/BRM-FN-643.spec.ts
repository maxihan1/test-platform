import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 자리고르기 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 접속한사람수 } from './helpers/ready-tools.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 시작안내 } from './pages/start-splash.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-643',
  name: '접속한 모두가 확정하면 던전으로 넘어가기 전까지 로비에 「Get Ready!」 · 「Game Is Starting!」 두 줄 안내가 뜬다',
  platforms: ['android'],
  precondition: ['탱커 자리를 고른 채 혼자 로비에 있다'],
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
  await test.step('혼자 로비에 들어와 탱커 자리를 고른다', async () => {
    await 로비로(game, driver, 나);
    await 자리고르기(game, 0);
    const 탱커 = await new 로비화면(game).현재직업이될때까지('탱커');
    await verify('고른 자리의 직업이 「탱커」다', 탱커, true, { blocker: true });
    await verify('로비에 접속한 사람이 나 하나다', await 접속한사람수(admin), 1, { blocker: true });
  });
  await test.step('로비에서 「준비!」를 누른다', async () => {
    const 줄들 = await 시작안내.준비누르고안내줄들(game);
    await verify('접속한 모두가 확정하면 던전으로 넘어가기 전까지 로비에 「Get Ready!」 · 「Game Is Starting!」 두 줄 안내가 뜬다', 줄들, 'Get Ready! · Game Is Starting!');
  });
});
