import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호찾기, 제재걸기, 제재풀기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-273',
  name: '입력 규칙을 어겨 제재를 걸면 400 과 code INVALID · 한국어 message 가 돌아온다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ admin, params, expected }) => {
  let 계정번호 = 0;
  await test.step('「두 번째 플레이어」 계정 번호를 찾는다', async () => {
    계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
  });
  await test.step('사유를 비워 「두 번째 플레이어」에 CHAT_MUTE 제재를 건다', async () => {
    const 응답 = await 제재걸기(admin, 계정번호, { type: 'CHAT_MUTE', reason: '' });
    try {
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string };
      const 코드 = await verify('빈 사유 제재 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 종류 = await verify('빈 사유 제재 응답 code 가 INVALID 다', 몸.code ?? '', 'INVALID');
      const 문구 = await verify('빈 사유 제재 응답 message 에 한글이 들어 있다', /[가-힣]/.test(몸.message ?? ''), true);
      await verify('입력 규칙을 어겨 제재를 걸면 400 과 code INVALID · 한국어 message 가 돌아온다', 코드 && 종류 && 문구, true);
    } finally {
      if (응답.ok()) await 제재풀기(admin, ((await 응답.json().catch(() => ({}))) as { id?: number }).id ?? 0, '[QA] 시험 정리');
    }
  });
});
