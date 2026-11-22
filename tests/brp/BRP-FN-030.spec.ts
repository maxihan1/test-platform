import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 거절창기다리기 } from './helpers/screen-check.helper.js';
import { 계정번호, 점검끄기, 점검바꾸기, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-030',
  name: '정지와 점검이 같이 걸린 계정으로 로그인하면 「서버 점검 중」이 아니라 「이용 정지 계정」 창이 뜬다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어 계정이 정지돼 있고 점검이 켜져 있다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 둘째아이디 = params.p2Id ?? '';
  const 둘째비밀번호 = params.p2Password ?? '';
  let 제재번호: number | null = null;
  await test.cleanup('두 번째 플레이어 정지 풀고 점검 끄기', async () => {
    if (제재번호 !== null) await 제재풀기(admin, 제재번호);
    await 점검끄기(admin);
  });

  await test.step('두 번째 플레이어 계정을 정지하고 허용 계정 없는 점검을 켠다', async () => {
    제재번호 = await 제재걸기(admin, await 계정번호(admin, 둘째아이디), 'SUSPEND', '[QA] 정지 사유');
    await 점검바꾸기(admin, { enabled: true, message: '[QA] 점검 안내 문구', allowedAccountIds: [] });
    await verify('정지가 걸렸다', 제재번호 > 0, true, { blocker: true });
  });

  await test.step('두 번째 플레이어 계정으로 「게임 시작」을 누른다', async () => {
    const 창 = await 거절창기다리기(game, 둘째아이디, 둘째비밀번호, '이용 정지 계정', 60_000);
    await verify('안내 창이 뜬다', 창 !== null, true, { blocker: true });
    const 정지창 = await verify('안내 창 제목이 「이용 정지 계정」이다', 창?.제목, '이용 정지 계정');
    const 점검아님 = await verify('안내 창 제목이 「서버 점검 중」이 아니다', 창?.제목 !== '서버 점검 중', true);
    await verify('정지와 점검이 같이 걸린 계정으로 로그인하면 「서버 점검 중」이 아니라 「이용 정지 계정」 창이 뜬다', 정지창 && 점검아님, true);
  });
});
