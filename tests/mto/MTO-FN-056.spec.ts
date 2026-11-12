import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-056',
  name: '「이메일」 칸에 「%@maxihan.com」을 적고 검색하면 maxihan.com 계정이 1건 이상 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    이메일검색어: z.string().min(1).describe('검색할 이메일 — % 와일드카드를 쓴 maxihan.com 주소').default('%@maxihan.com'),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 계정목록화면(page);

  await test.step('Owner 계정으로 로그인하고 「계정」 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「이메일」 칸에 「%@maxihan.com」을 적고 「검색」을 누른다', async () => {
    await 목록.검색하기(목록.이메일칸, params.이메일검색어);
    await 목록.행들.first().waitFor();
    await verify('「이메일」 칸에 「%@maxihan.com」을 적고 검색하면 maxihan.com 계정이 1건 이상 보인다', (await 목록.행들.count()) >= 1, true);
  });
});
