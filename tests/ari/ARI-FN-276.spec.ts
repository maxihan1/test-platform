import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공지삭제 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-276',
  name: '없는 계정 번호로 계정 상세를 부르면 404 와 code NOT_FOUND 다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(404),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ admin, expected }) => {
  await test.step('없는 계정 번호로 GET /opsapi/users/{id} 를 부른다', async () => {
    const 응답 = await admin.get('/opsapi/users/2147480000');
    const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string };
    const 코드 = await verify('없는 계정 번호 상세 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 종류 = await verify('없는 계정 번호 상세 응답 code 가 NOT_FOUND 다', 몸.code ?? '', 'NOT_FOUND');
    await verify('없는 계정 번호로 계정 상세를 부르면 404 와 code NOT_FOUND 다', 코드 && 종류, true);
  });
  await test.step('없는 공지 번호를 DELETE /opsapi/notices/{id} 로 삭제한다', async () => {
    const 응답 = await 공지삭제(admin, 2_147_480_000);
    const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string };
    const 코드 = await verify('없는 공지 삭제 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 종류 = await verify('없는 공지 삭제 응답 code 가 NOT_FOUND 다', 몸.code ?? '', 'NOT_FOUND');
    await verify('없는 공지 번호를 삭제할 때 404 와 code NOT_FOUND 다', 코드 && 종류, true);
  });
});
