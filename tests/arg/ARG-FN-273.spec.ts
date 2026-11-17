import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 실패걸기, 점검끄기, 점검켜기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 접속안내창 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-273',
  name: '점검으로 내보낼 때 안내 문구를 못 읽으면 「서버 점검 중입니다」가 보인다',
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

    await test.step('점검 문구 읽기를 실패시키고 점검을 켠다', async () => {
      await 실패걸기(admin, '/api/serverstatus');
      await 점검켜기(admin, 안내);
      const 창 = await 접속안내창.제목이될때까지(game, '서버 점검 중', 90_000);
      await verify('점검으로 내보낼 때 안내 문구를 못 읽으면 「서버 점검 중입니다」가 보인다', (await 창?.본문글()) ?? '', '서버 점검 중입니다');
    });
  } finally {
    await 점검끄기(admin);
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
