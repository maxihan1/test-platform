import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 저장될때까지, 점검끄기, 점검켜기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 접속안내창 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-057',
  name: '골드를 바꾼 뒤 점검으로 내보내지면 바뀐 골드가 먼저 서버에 저장된다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 계정으로 로그인해 로비에 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 둘째 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  const 안내 = '자동 시험 점검 안내';
  try {
    await test.step('두 번째 플레이어 계정을 처음 상태로 되돌리고 로그인해 로비로 간다', async () => {
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 로비로(game, 둘째, 둘째비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('골드를 바꾼 뒤 점검을 켜 내보내지게 한다', async () => {
      await GM(game, '/gm gold 500');
      await 점검켜기(admin, 안내);
      await 접속안내창.제목이될때까지(game, '서버 점검 중', 90_000);
      const 서버 = await 저장될때까지(admin, 둘째, (값) => 값.골드 === 500, 5_000);
      await verify('골드를 바꾼 뒤 점검으로 내보내지면 바뀐 골드가 먼저 서버에 저장된다', 서버.골드, 500);
    });
  } finally {
    await 점검끄기(admin);
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
