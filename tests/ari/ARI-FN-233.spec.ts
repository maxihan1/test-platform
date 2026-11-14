import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 지급하고번호, 지급정리, 지급회수 } from './helpers/api.helper.js';
import { 두번째캐릭터번호 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-233',
  name: '이미 회수한 지급을 한 번 더 회수하면 409 ALREADY_RECALLED 다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(409),
    오류코드: z.string().describe('실패 응답의 code').default('ALREADY_RECALLED'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ admin, params, expected }) => {
  let 캐릭터 = 0;
  await test.step('「두 번째 플레이어」 캐릭터 번호를 찾는다', async () => {
    캐릭터 = await 두번째캐릭터번호(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 캐릭터를 찾았다', 캐릭터 > 0, true, { blocker: true });
  });
  await test.step('이미 회수한 지급을 한 번 더 회수한다', async () => {
    const 지급번호 = await 지급하고번호(admin, 기본지급(캐릭터, 'ARI-FN-233'));
    let 회수됨 = false;
    try {
      await verify('시험용 지급이 만들어졌다', 지급번호 > 0, true, { blocker: true });
      const 첫회수 = await 지급회수(admin, 지급번호, '[QA] ARI-FN-233 첫 회수');
      회수됨 = 첫회수.ok();
      await verify('첫 회수 응답 코드가 200 이다', 첫회수.status(), 200, { blocker: true });
      const 응답 = await 지급회수(admin, 지급번호, '[QA] ARI-FN-233 다시 회수');
      const 코드 = await verify('다시 회수 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string };
      const 오류 = await verify('다시 회수 응답 code 가 기대 결과와 같다', 몸.code ?? '', expected.오류코드);
      await verify('이미 회수한 지급을 한 번 더 회수하면 409 ALREADY_RECALLED 다', 코드 && 오류, true);
    } finally {
      if (!회수됨) await 지급정리(admin, 지급번호);
    }
  });
});
