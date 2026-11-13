import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호찾기, 고유이름, 시각, 제재걸기, 제재풀기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-505',
  name: 'endsAt 을 지금보다 앞 시각으로 제재를 걸면 400 INVALID 다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
  }),
});

test(spec, async ({ admin, params, expected }) => {
  let 계정번호 = 0;
  await test.step('「두 번째 플레이어」 계정 번호를 찾는다', async () => {
    계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
  });
  await test.step('endsAt 을 1분 전으로 「두 번째 플레이어」에 제재를 건다', async () => {
    const 응답 = await 제재걸기(admin, 계정번호, { type: 'CHAT_MUTE', reason: 고유이름('ARI-FN-505 지난 끝 시각'), endsAt: 시각(-1) });
    try {
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string };
      const 코드 = await verify('지난 endsAt 제재 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 종류 = await verify('지난 endsAt 제재 응답 code 가 INVALID 다', 몸.code ?? '', 'INVALID');
      await verify('endsAt 을 지금보다 앞 시각으로 제재를 걸면 400 INVALID 다', 코드 && 종류, true);
    } finally {
      if (응답.ok()) await 제재풀기(admin, ((await 응답.json().catch(() => ({}))) as { id?: number }).id ?? 0, '[QA] 시험 정리');
    }
  });
});
