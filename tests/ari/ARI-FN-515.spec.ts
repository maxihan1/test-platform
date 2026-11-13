import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시각 } from './helpers/api.helper.js';
import { 점검바꾸고되돌리기 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-515',
  name: '끝을 시작보다 앞으로 점검 설정을 변경하면 400 INVALID 다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
  }),
});

test(spec, async ({ admin, expected }) => {
  await test.step('끝을 시작보다 앞으로 점검 설정을 변경한다', async () => {
    const { 응답, 몸 } = await 점검바꾸고되돌리기(admin, { enabled: true, message: '[QA] ARI-FN-515 점검 시험', startsAt: 시각(120), endsAt: 시각(60), allowedAccountIds: [] });
    const 코드 = await verify('응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 종류 = await verify('응답 code 가 INVALID 다', 몸.code ?? '', 'INVALID');
    await verify('끝을 시작보다 앞으로 점검 설정을 변경하면 400 INVALID 다', 코드 && 종류, true);
  });
});
