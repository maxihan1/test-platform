import { defineCase, test, verify } from '@platform/kit';
import { 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 접속안내창 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-031',
  name: '다시 연결을 시도하면 「시도 1/2」에서 「시도 2/2」까지 5초 넘게 걸린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 로비로 간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await 폰상태에서(driver, { 네트워크: '끊김' }, async () => {
      await test.step('로비에서 와이파이를 끊고 두 시도 사이 시간을 잰다', async () => {
        const 창 = await 접속안내창.제목이될때까지(game, '연결 끊김', 60_000);
        const 첫째 = (await 창?.본문에뜰때까지('시도 1/2', 60_000)) ?? false;
        const 처음 = Date.now();
        const 둘째 = (await 창?.본문에뜰때까지('시도 2/2', 60_000)) ?? false;
        const 걸린시간 = Date.now() - 처음;
        await verify('다시 연결을 시도하면 「시도 1/2」에서 「시도 2/2」까지 5초 넘게 걸린다', 첫째 && 둘째 && 걸린시간 > 5_000, true);
      });
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
