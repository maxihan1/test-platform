import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 본문JSON, 제재걸기, 제재풀기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-186',
  name: '없는 계정 번호에 제재를 걸면 404 다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(404),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ admin, expected }) => {
  await test.step('없는 계정 번호에 CHAT_MUTE 제재를 건다', async () => {
    const 응답 = await 제재걸기(admin, 2_147_480_000, { type: 'CHAT_MUTE', reason: 고유이름('ARI-FN-186 없는 계정') });
    try {
      await verify('없는 계정 번호에 제재를 걸면 404 다', 응답.status(), expected.응답코드);
    } finally {
      if (응답.ok()) await 제재풀기(admin, (await 본문JSON<{ id: number }>(응답)).id, '[QA] 시험 정리');
    }
  });
});
