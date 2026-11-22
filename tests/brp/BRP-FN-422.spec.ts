import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창 } from './components/popup.component.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정번호, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-422',
  name: '접속 중에 정지로 내보내지면 정지 안내 창에 「종료 예정」 줄이 없다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어로 로그인해 로비에 있다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.p2Id ?? '';
  const 비밀번호 = params.p2Password ?? '';
  let 제재번호: number | null = null;
  await test.cleanup('두 번째 플레이어 정지 풀기', async () => {
    if (제재번호 !== null) await 제재풀기(admin, 제재번호);
  });

  await test.step('두 번째 플레이어로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('끝나는 시각을 넣어 두 번째 플레이어를 정지하고 서버가 내보낼 때까지 기다린다', async () => {
    const 사유 = '[QA] 종료 시각 있는 정지 사유';
    제재번호 = await 제재걸기(admin, await 계정번호(admin, 아이디), 'SUSPEND', 사유, new Date(Date.now() + 3_600_000).toISOString());
    const 창 = new 안내창(game);
    const 떴다 = await verify('정지 안내 창이 뜬다', await 창.뜰때까지(60_000), true, { blocker: true });
    await verify('접속 중에 정지로 내보내지면 정지 안내 창에 「종료 예정」 줄이 없다', (떴다 ? await 창.본문() : '').includes('종료 예정'), false);
  });
});
