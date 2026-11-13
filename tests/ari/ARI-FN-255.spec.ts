import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시각 } from './helpers/api.helper.js';
import { 시각같음, 점검바꾸고되돌리기 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-255',
  name: '점검 설정을 변경하면 넣은 enabled · message · startsAt 의 점검 설정이 돌아온다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  await test.step('시작을 1시간 뒤로 PUT /opsapi/maintenance 로 점검 설정을 변경한다', async () => {
    const 문구 = '[QA] ARI-FN-255 점검 시험';
    const 시작 = 시각(60);
    const { 응답, 몸 } = await 점검바꾸고되돌리기(admin, { enabled: true, message: 문구, startsAt: 시작, endsAt: null, allowedAccountIds: [] });
    const 코드 = await verify('응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 켜짐 = await verify('응답 enabled 가 넣은 값과 같다', 몸.enabled, true);
    const 문구같음 = await verify('응답 message 가 넣은 문구와 같다', 몸.message, 문구);
    const 시작같음 = await verify('응답 startsAt 이 넣은 시작과 같다', 시각같음(몸.startsAt, 시작), true);
    await verify('점검 설정을 변경하면 넣은 enabled · message · startsAt 의 점검 설정이 돌아온다', 코드 && 켜짐 && 문구같음 && 시작같음, true);
  });
});
