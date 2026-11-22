import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 거절창기다리기 } from './helpers/screen-check.helper.js';
import { 계정번호, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-027',
  name: '끝나는 시각이 있는 정지 계정으로 로그인하면 정지 안내 창에 「종료 예정:」과 「(UTC)」가 든 줄이 보인다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어 계정이 끝나는 시각이 있는 정지에 걸려 있다'],
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
  await test.cleanup('두 번째 플레이어 정지 풀기', async () => {
    if (제재번호 !== null) await 제재풀기(admin, 제재번호);
  });

  await test.step('두 번째 플레이어 계정을 끝나는 시각을 넣어 정지한다', async () => {
    const 끝 = new Date(Date.now() + 3_600_000).toISOString();
    제재번호 = await 제재걸기(admin, await 계정번호(admin, 둘째아이디), 'SUSPEND', '[QA] 기간 정지', 끝);
    await verify('정지가 걸렸다', 제재번호 > 0, true, { blocker: true });
  });

  await test.step('두 번째 플레이어 계정으로 「게임 시작」을 누른다', async () => {
    const 창 = await 거절창기다리기(game, 둘째아이디, 둘째비밀번호, '이용 정지 계정');
    await verify('이용 정지 안내 창이 뜬다', 창 !== null, true, { blocker: true });
    const 줄 = (창?.본문 ?? '').split('\n').find((글) => 글.includes('종료 예정:'));
    const 예정줄 = await verify('본문에 「종료 예정:」 줄이 있다', 줄 !== undefined, true);
    const 표준시 = await verify('「종료 예정:」 줄에 「(UTC)」가 들어 있다', (줄 ?? '').includes('(UTC)'), true);
    await verify('끝나는 시각이 있는 정지 계정으로 로그인하면 정지 안내 창에 「종료 예정:」과 「(UTC)」가 든 줄이 보인다', 예정줄 && 표준시, true);
  });
});
