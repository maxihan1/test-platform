import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 거절창기다리기 } from './helpers/screen-check.helper.js';
import { 계정번호, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-026',
  name: '정지된 계정으로 로그인하면 「이용 정지 계정」 창에 「운영 정책에 따라 이용이 정지된 계정입니다」가 보인다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어 계정이 정지돼 있다'],
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

  const 사유 = '[QA] 정지 사유';
  await test.step('두 번째 플레이어 계정을 정지한다', async () => {
    제재번호 = await 제재걸기(admin, await 계정번호(admin, 둘째아이디), 'SUSPEND', 사유);
    await verify('정지가 걸렸다', 제재번호 > 0, true, { blocker: true });
  });

  await test.step('두 번째 플레이어 계정으로 「게임 시작」을 누른다', async () => {
    const 창 = await 거절창기다리기(game, 둘째아이디, 둘째비밀번호, '이용 정지 계정');
    await verify('이용 정지 안내 창이 뜬다', 창 !== null, true, { blocker: true });
    const 본문 = 창?.본문 ?? '';
    const 제목맞음 = await verify('안내 창 제목이 「이용 정지 계정」이다', 창?.제목, '이용 정지 계정');
    const 문구맞음 = await verify('안내 창 본문에 「운영 정책에 따라 이용이 정지된 계정입니다」가 들어 있다', 본문.includes('운영 정책에 따라 이용이 정지된 계정입니다'), true);
    await verify('정지된 계정으로 로그인하면 「이용 정지 계정」 창에 「운영 정책에 따라 이용이 정지된 계정입니다」가 보인다', 제목맞음 && 문구맞음, true);
    const 사유줄 = 본문.split('\n').find((줄) => 줄.includes('사유:'));
    const 줄있음 = await verify('본문에 「사유:」 줄이 있다', 사유줄 !== undefined, true);
    const 사유맞음 = await verify('「사유:」 줄에 정지할 때 적은 사유가 들어 있다', (사유줄 ?? '').includes(사유), true);
    await verify('정지 안내 창 본문 다음 줄에 「사유:」와 정지할 때 적은 사유가 보인다', 줄있음 && 사유맞음, true);
  });
});
