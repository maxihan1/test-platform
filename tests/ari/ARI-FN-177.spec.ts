import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 걸린제재모두풀기, 계정번호찾기, 고유이름 } from './helpers/api.helper.js';
import { 채팅금지걸기 } from './helpers/sanction.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-177',
  name: '「두 번째 플레이어」에 CHAT_MUTE 제재를 걸면 type · reason · endsAt 이 넣은 값인 제재 한 건이 돌아온다',
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
  await test.step('「두 번째 플레이어」에 끝 시각을 넣어 CHAT_MUTE 제재를 건다', async () => {
    try {
      const 사유 = 고유이름('ARI-FN-177 채팅 금지');
      const 끝 = new Date(Math.floor(Date.now() / 60_000) * 60_000 + 60 * 60_000).toISOString();
      const 응답 = await 채팅금지걸기(admin, 계정번호, { reason: 사유, endsAt: 끝 });
      const 몸 = (await 응답.json().catch(() => ({}))) as { type?: string; reason?: string; endsAt?: string | null };
      const 코드 = await verify('제재 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 종류 = await verify('응답 type 이 CHAT_MUTE 다', 몸.type ?? '', 'CHAT_MUTE');
      const 문구 = await verify('응답 reason 이 넣은 사유와 같다', 몸.reason ?? '', 사유);
      const 끝맺음 = await verify('응답 endsAt 이 넣은 끝 시각과 같다', Date.parse(몸.endsAt ?? ''), Date.parse(끝));
      await verify('「두 번째 플레이어」에 CHAT_MUTE 제재를 걸면 type · reason · endsAt 이 넣은 값인 제재 한 건이 돌아온다', 코드 && 종류 && 문구 && 끝맺음, true);
    } finally {
      await 걸린제재모두풀기(admin, 계정번호, 'CHAT_MUTE');
    }
  });
});
