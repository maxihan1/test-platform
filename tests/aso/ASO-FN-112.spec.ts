import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-FN-112',
  name: '키를 넣지 않고 「검색」을 누르면 「UNAUTHORIZED: X-Admin-Key 헤더가 올바르지 않습니다.」 오류 알림이 보인다',
  precondition: ['키를 넣지 않았다'],
  techniques: ['동등 분할'],
  expected: z.object({
    오류문구: z.string().describe('키 없이 검색했을 때 오류 알림 문구').default('UNAUTHORIZED: X-Admin-Key 헤더가 올바르지 않습니다.'),
  }),
  params: null,
});

test(spec, async ({ page, expected }) => {
  const 화면 = new 백오피스화면(page);

  await test.step('백오피스를 키 없이 연다', async () => {
    await 화면.열기();
    await verify('「X-Admin-Key」 칸이 비어 있다', (await 화면.키칸.inputValue()) === '', true, { blocker: true });
  });

  await test.step('「검색」을 누른다', async () => {
    await 화면.키없이검색();
    await verify('키를 넣지 않고 「검색」을 누르면 「UNAUTHORIZED: X-Admin-Key 헤더가 올바르지 않습니다.」 오류 알림이 보인다', await 화면.오류알림.innerText(), expected.오류문구);
  });
});
