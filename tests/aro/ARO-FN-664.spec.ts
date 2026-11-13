import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기록화면 } from './pages/logs.page.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-664',
  name: '로그인한 뒤 「기록」을 열면 「로그인」 · LOGIN · qa_ops 줄이 보이고 내용이 비어 있다',
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
  const 기록 = new 기록화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.열기();
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.로그인버튼.isVisible(), true, { blocker: true });
  });

  await test.step('로그인한 뒤 「기록」을 연다', async () => {
    await 로그인.로그인(params.loginId ?? '', params.loginPassword ?? '');
    await 대시보드.제목.waitFor();
    await 기록.열기();
    await verify('「기록」 표에 줄이 보인다', (await 기록.줄들.count()) > 0, true, { blocker: true });
    const 줄 = 기록.셀로찾은줄('로그인', 'LOGIN', params.loginId ?? '');
    const 보인다 = await verify('「로그인」 · LOGIN · qa_ops 줄이 보인다', (await 줄.count()) > 0, true);
    const 칸 = await 기록.칸글(줄.first());
    const 비었다 = await verify('그 줄의 내용이 비어 있다', (칸[5] ?? '').trim(), '');
    await verify('로그인한 뒤 「기록」을 열면 「로그인」 · LOGIN · qa_ops 줄이 보이고 내용이 비어 있다', 보인다 && 비었다, true);
  });
});
