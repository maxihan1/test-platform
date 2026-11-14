import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 점검바꾸고되돌리기 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-261',
  name: '없는 계정 번호를 허용 목록에 넣어 변경하면 200 이다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  await test.step('없는 계정 번호 999999 를 허용 목록에 넣어 점검 설정을 변경한다', async () => {
    const { 응답 } = await 점검바꾸고되돌리기(admin, { enabled: false, message: '[QA] ARI-FN-261 점검 시험', startsAt: null, endsAt: null, allowedAccountIds: [999999] });
    await verify('없는 계정 번호를 허용 목록에 넣어 변경하면 200 이다', 응답.status(), expected.응답코드);
  });
});
