import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-055',
  name: '「아이디」 칸에 「qa_user2」를 적고 「검색」을 누르면 주소에 검색어가 붙고 목록에 qa_user2 만 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    찾을아이디: z.string().min(1).describe('검색할 아이디 — 로컬 계정 아이디 하나').default('qa_user2'),
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

  await test.step('「아이디」 칸에 「qa_user2」를 적고 「검색」을 누른다', async () => {
    await 목록.검색하기(목록.아이디칸, params.찾을아이디);
    const 주소 = await verify('주소에 검색어가 붙는다', await 목록.주소값('username'), params.찾을아이디);
    const 결과목록 = await verify('목록에 그 아이디만 보인다', (await 목록.행아이디들.allInnerTexts()).join(', '), `@${params.찾을아이디}`);
    await verify('「아이디」 칸에 「qa_user2」를 적고 「검색」을 누르면 주소에 검색어가 붙고 목록에 qa_user2 만 보인다', 주소 && 결과목록, true);
  });
});
