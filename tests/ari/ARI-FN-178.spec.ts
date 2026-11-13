import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 걸린제재모두풀기, 계정번호찾기, 고유이름 } from './helpers/api.helper.js';
import { 채팅금지걸기 } from './helpers/sanction.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-178',
  name: 'endsAt 을 생략하고 제재를 걸면 돌아온 제재의 endsAt 이 null 이다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, params, expected }) => {
  let 계정번호 = 0;
  await test.step('「두 번째 플레이어」 계정 번호를 찾고 남은 CHAT_MUTE 를 푼다', async () => {
    계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
    await 걸린제재모두풀기(admin, 계정번호, 'CHAT_MUTE');
  });
  await test.step('endsAt 없이 「두 번째 플레이어」에 CHAT_MUTE 제재를 건다', async () => {
    try {
      const 응답 = await 채팅금지걸기(admin, 계정번호, { reason: 고유이름('ARI-FN-178 채팅 금지') });
      const 몸 = (await 응답.json().catch(() => ({}))) as { endsAt?: string | null };
      const 코드 = await verify('제재 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 끝 = await verify('응답 endsAt 이 null 이다', 몸.endsAt === null, true);
      await verify('endsAt 을 생략하고 제재를 걸면 돌아온 제재의 endsAt 이 null 이다', 코드 && 끝, true);
    } finally {
      await 걸린제재모두풀기(admin, 계정번호, 'CHAT_MUTE');
    }
  });
});
