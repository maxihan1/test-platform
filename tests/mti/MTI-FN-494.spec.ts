import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리첫번호 } from './helpers/admin.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-494',
  name: 'POST /api/v1/admin/trends/links/publishers/{id}/approve 를 어드민 키로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  held: '보류 — 관리 API 의 링크 게시자 목록이 비어 있다',
  precondition: ['어드민 키가 있다', '관리 API 에 링크 게시자가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  const 번호 = await 관리첫번호(admin, '/api/v1/admin/trends/links/publishers');
  await test.step('링크 게시자 번호를 확인한다', async () => {
    await verify('관리 API 에 링크 게시자가 있다', 번호 !== '', true, { blocker: true });
  });
  await test.step('POST /api/v1/admin/trends/links/publishers/{id}/approve 를 어드민 키로 부른다', async () => {
    const 응답 = await admin.post(`/api/v1/admin/trends/links/publishers/${번호}/approve`);
    await verify('POST /api/v1/admin/trends/links/publishers/{id}/approve 를 어드민 키로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
