import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 점검끄기, 점검켜기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 접속안내창 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-272',
  name: '접속 중에 점검이 걸리면 30초 주기 안에 내보내지고 「서버 점검 중」 창에 점검 안내 문구가 보인다',
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

    await test.step('허용 계정 없이 점검을 켠다', async () => {
      await 점검켜기(admin, 안내);
      const 창 = await 접속안내창.제목이될때까지(game, '서버 점검 중', 45_000);
      const 제목 = await verify('30초 주기 안에 「서버 점검 중」 창이 뜬다', (await 창?.제목글()) === '서버 점검 중', true);
      const 문구 = await verify('창에 점검 안내 문구가 보인다', ((await 창?.본문글()) ?? '').includes(안내), true);
      await verify('접속 중에 점검이 걸리면 30초 주기 안에 내보내지고 「서버 점검 중」 창에 점검 안내 문구가 보인다', 제목 && 문구, true);
    });
  } finally {
    await 점검끄기(admin);
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
