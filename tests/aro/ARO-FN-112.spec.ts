import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대시보드화면 } from './pages/dashboard.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-112',
  name: '맞는 아이디와 비밀번호로 로그인하면 대시보드로 간다',
  smoke: true,
  precondition: ['로그인하지 않았다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.열기();
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.로그인버튼.isVisible(), true, { blocker: true });
  });

  await test.step('맞는 아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
    await 로그인.로그인(params.loginId ?? '', params.loginPassword ?? '');
    const 도착 = await 대시보드.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await 대시보드.준비표시.waitFor({ timeout: 10_000 }).catch(() => undefined);
    await verify('맞는 아이디와 비밀번호로 로그인하면 대시보드로 간다', 도착 && new URL(page.url()).pathname === 대시보드화면.주소, true);
  });
});
