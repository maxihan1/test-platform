import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 걸린제재모두풀기, 계정번호찾기, 고유이름, 제재풀기 } from './helpers/api.helper.js';
import { 채팅금지걸기 } from './helpers/sanction.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-191',
  name: '이미 푼 제재를 한 번 더 풀면 409 NOT_ACTIVE 다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(409),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ admin, params, expected }) => {
  let 계정번호 = 0;
  await test.step('「두 번째 플레이어」 계정 번호를 찾고 남은 CHAT_MUTE 를 푼다', async () => {
    계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
    await 걸린제재모두풀기(admin, 계정번호, 'CHAT_MUTE');
  });
  await test.step('이미 푼 제재를 한 번 더 푼다', async () => {
    try {
      const 걸기 = await 채팅금지걸기(admin, 계정번호, { reason: 고유이름('ARI-FN-191 채팅 금지') });
      await verify('「두 번째 플레이어」에 CHAT_MUTE 가 걸렸다', 걸기.status(), 200, { blocker: true });
      const 제재번호 = ((await 걸기.json().catch(() => ({}))) as { id?: number }).id ?? 0;
      const 첫해제 = await 제재풀기(admin, 제재번호, '[QA] 첫 해제');
      await verify('첫 해제 응답 코드가 200 이다', 첫해제.status(), 200, { blocker: true });
      const 응답 = await 제재풀기(admin, 제재번호, '[QA] 다시 해제');
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string };
      const 코드 = await verify('다시 해제 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 종류 = await verify('다시 해제 응답 code 가 NOT_ACTIVE 다', 몸.code ?? '', 'NOT_ACTIVE');
      await verify('이미 푼 제재를 한 번 더 풀면 409 NOT_ACTIVE 다', 코드 && 종류, true);
    } finally {
      await 걸린제재모두풀기(admin, 계정번호, 'CHAT_MUTE');
    }
  });
});
