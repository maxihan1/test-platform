import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 로그인화면 } from './pages/login.page.js';
import { 접속안내창 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-036',
  name: '접속 중인 계정이 정지되면 다시 연결하지 않고 안내 창을 띄운 뒤 로그인 화면으로 돌아간다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 계정으로 로그인해 로비에 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 둘째 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  const 사유 = '자동 시험 정지';
  let 제재 = 0;
  try {
    await test.step('두 번째 플레이어 계정을 처음 상태로 되돌리고 로그인해 로비로 간다', async () => {
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 로비로(game, 둘째, 둘째비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('접속한 계정을 정지시킨다', async () => {
      제재 = await 제재걸기(admin, 둘째, 'SUSPEND', 사유);
      const 창 = await 접속안내창.제목이될때까지(game, '이용 정지 계정', 90_000);
      const 안내 = await verify('「이용 정지 계정」 안내 창이 뜬다', (await 창?.제목글()) === '이용 정지 계정', true);
      const 연결안함 = await verify('다시 연결하는 중 문구가 보이지 않는다', !((await 창?.본문글()) ?? '').includes('다시 연결하는 중'), true);
      await 창?.확인누르기();
      const 돌아옴 = await verify(
        '로그인 화면으로 돌아간다',
        await game.waitFor(로그인화면.게임시작, { timeoutMs: 30_000 }).then(
          () => true,
          () => false,
        ),
        true,
      );
      await verify('접속 중인 계정이 정지되면 다시 연결하지 않고 안내 창을 띄운 뒤 로그인 화면으로 돌아간다', 안내 && 연결안함 && 돌아옴, true);
    });
  } finally {
    if (제재 > 0) await 제재풀기(admin, 제재);
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
