import { defineCase, test, verify } from '@platform/kit';
import { 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 접속안내창 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-029',
  name: '로비에서 연결이 끊기면 「연결 끊김」 창에 「서버와 연결이 끊어졌습니다」가 보인다',
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
      await test.step('로비에서 와이파이를 끊는다', async () => {
        const 창 = await 접속안내창.제목이될때까지(game, '연결 끊김', 60_000);
        const 제목 = await verify('「연결 끊김」 창이 보인다', (await 창?.제목글()) === '연결 끊김', true);
        const 안내 = await verify('창에 「서버와 연결이 끊어졌습니다」 문구가 보인다', (await 창?.본문에뜰때까지('서버와 연결이 끊어졌습니다', 60_000)) ?? false, true);
        await verify('로비에서 연결이 끊기면 「연결 끊김」 창에 「서버와 연결이 끊어졌습니다」가 보인다', 제목 && 안내, true);
      });
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
