import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창 } from './components/popup.component.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정번호, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-421',
  name: '접속 중인 계정을 정지하면 30초 안팎(45초 안)에 내보내지고 「이용 정지 계정」 창에 「사유:」와 그 사유가 보인다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어로 로그인해 로비에 있다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    한도초: z.number().describe('정지 안내 창이 뜨는 한도(초)').default(45),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
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

  await test.step('운영 API 로 두 번째 플레이어를 정지하고 서버가 내보낼 때까지 기다린다', async () => {
    const 사유 = '[QA] 접속 중 정지 사유';
    const 시작 = Date.now();
    제재번호 = await 제재걸기(admin, await 계정번호(admin, 아이디), 'SUSPEND', 사유);
    const 창 = new 안내창(game);
    const 떴다 = await verify('정지 안내 창이 뜬다', await 창.뜰때까지(60_000), true, { blocker: true });
    const 걸린초 = (Date.now() - 시작) / 1000;
    const 제목 = await verify('안내 창 제목이 「이용 정지 계정」이다', 떴다 ? await 창.제목() : '', '이용 정지 계정');
    const 본문 = 떴다 ? await 창.본문() : '';
    const 머리 = await verify('안내 창 본문에 「사유:」가 들어 있다', 본문.includes('사유:'), true);
    const 사유맞음 = await verify('안내 창 본문에 정지할 때 적은 사유가 들어 있다', 본문.includes(사유), true);
    const 시간 = await verify('한도 안에 내보내진다', 걸린초 <= expected.한도초, true);
    await verify('접속 중인 계정을 정지하면 30초 안팎(45초 안)에 내보내지고 「이용 정지 계정」 창에 「사유:」와 그 사유가 보인다', 제목 && 머리 && 사유맞음 && 시간, true);
  });
});
