import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 본문JSON, 지급건찾기, 지급하고번호, 지급정리, 지급회수 } from './helpers/api.helper.js';
import { 두번째캐릭터번호 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-228',
  name: '하나도 안 가져간 지급을 회수하면 recalled 가 1 이고 우편 상태가 RECALLED 다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    통째회수수: z.number().describe('통째로 회수한 우편 수').default(1),
    우편상태: z.string().describe('회수한 뒤 우편 상태').default('RECALLED'),
  }),
});

test(spec, async ({ admin, params, expected }) => {
  let 캐릭터 = 0;
  await test.step('「두 번째 플레이어」 캐릭터 번호를 찾는다', async () => {
    캐릭터 = await 두번째캐릭터번호(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 캐릭터를 찾았다', 캐릭터 > 0, true, { blocker: true });
  });
  await test.step('하나도 안 가져간 지급을 회수한 뒤 그 지급 건을 찾는다', async () => {
    const 지급번호 = await 지급하고번호(admin, 기본지급(캐릭터, 'ARI-FN-228'));
    let 회수됨 = false;
    try {
      await verify('시험용 지급이 만들어졌다', 지급번호 > 0, true, { blocker: true });
      const 응답 = await 지급회수(admin, 지급번호, '[QA] ARI-FN-228 회수 시험');
      회수됨 = 응답.ok();
      await verify('회수 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드, { blocker: true });
      const 몸 = await 본문JSON<{ recalled?: number }>(응답).catch(() => ({}) as { recalled?: number });
      const 건 = await 지급건찾기(admin, 지급번호);
      await verify('GET /opsapi/grants 에서 그 지급 건을 찾았다', 건 !== null, true, { blocker: true });
      const 개수 = await verify('응답 recalled 가 기대 결과와 같다', 몸.recalled ?? -1, expected.통째회수수);
      const 상태 = await verify('우편 상태가 기대 결과와 같다', 건?.mails[0]?.status ?? '', expected.우편상태);
      await verify('하나도 안 가져간 지급을 회수하면 recalled 가 1 이고 우편 상태가 RECALLED 다', 개수 && 상태, true);
    } finally {
      if (!회수됨) await 지급정리(admin, 지급번호);
    }
  });
});
