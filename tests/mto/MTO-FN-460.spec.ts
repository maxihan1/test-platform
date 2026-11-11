import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-460',
  name: '계정이 한 페이지보다 많을 때 전체 선택 체크박스를 켜면 「검색에 잡힌 N개의 항목을 모두 선택하기」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  held: '보류 — 한 페이지(40건)보다 많은 계정 목록',
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
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

  await test.step('「위치」를 「모두」로 두고 전체 선택 체크박스를 켠다', async () => {
    await 목록.필터고르기(목록.위치필터, 'origin', '');
    await 목록.전체선택.check();
    const 보임 = await 목록.전체선택안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('계정이 한 페이지보다 많을 때 전체 선택 체크박스를 켜면 「검색에 잡힌 N개의 항목을 모두 선택하기」가 보인다', 보임, true);
  });
});
