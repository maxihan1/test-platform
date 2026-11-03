import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-FN-113',
  name: '틀린 키로 「키 저장」을 누르면 「UNAUTHORIZED: X-Admin-Key 헤더가 올바르지 않습니다.」 오류 알림이 보인다',
  precondition: ['키를 넣지 않았다'],
  techniques: ['동등 분할'],
  params: z.object({
    틀린키: z.string().min(1).describe('틀린 키 — 대상 서버 키가 아닌 아무 글자').default('aso-wrong-key-0000'),
  }),
  expected: z.object({
    오류문구: z.string().describe('틀린 키를 저장했을 때 오류 알림 문구').default('UNAUTHORIZED: X-Admin-Key 헤더가 올바르지 않습니다.'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 백오피스화면(page);

  await test.step('백오피스를 키 없이 연다', async () => {
    await 화면.열기();
    await verify('「X-Admin-Key」 칸이 비어 있다', (await 화면.키칸.inputValue()) === '', true, { blocker: true });
  });

  await test.step('틀린 키를 적고 「키 저장」을 누른다', async () => {
    await 화면.키저장(params.틀린키);
    await 화면.오류알림.waitFor();
    await verify('틀린 키로 「키 저장」을 누르면 「UNAUTHORIZED: X-Admin-Key 헤더가 올바르지 않습니다.」 오류 알림이 보인다', await 화면.오류알림.innerText(), expected.오류문구);
  });
});
