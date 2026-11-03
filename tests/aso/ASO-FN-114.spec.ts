import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-FN-114',
  name: '맞는 키로 「키 저장」을 누르면 「키를 저장했습니다 (이 탭에서만).」 알림이 보인다',
  precondition: ['키를 넣지 않았다'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    알림문구: z.string().describe('맞는 키를 저장했을 때 알림 문구').default('키를 저장했습니다 (이 탭에서만).'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 백오피스화면(page);

  await test.step('백오피스를 키 없이 연다', async () => {
    await 화면.열기();
    await verify('「X-Admin-Key」 칸이 비어 있다', (await 화면.키칸.inputValue()) === '', true, { blocker: true });
  });

  await test.step('맞는 키를 적고 「키 저장」을 누른다', async () => {
    await 화면.키칸.fill(params.password ?? '');
    await 화면.키저장버튼.click();
    await 화면.성공알림.waitFor();
    await verify('맞는 키로 「키 저장」을 누르면 「키를 저장했습니다 (이 탭에서만).」 알림이 보인다', await 화면.성공알림.innerText(), expected.알림문구);
  });
});
