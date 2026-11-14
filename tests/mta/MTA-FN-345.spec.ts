import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-345',
  name: '검색에 https://로 시작하고 공백 없는 글을 넣으면 「마스토돈에서 URL 열기」 줄이 위에 붙는다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    검색할주소: z.string().describe('검색창에 적을 주소 — https:// 로 시작하고 공백이 없는 글').default('https://mastodon.maxihan.com/@hana_photo'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('검색에 https://mastodon.maxihan.com/@hana_photo 를 적는다', async () => {
    await 검색.열기();
    await 검색.적기(params.검색할주소);
    await verify('검색에 https://로 시작하고 공백 없는 글을 넣으면 「마스토돈에서 URL 열기」 줄이 위에 붙는다', await 문구가보이나(driver, '마스토돈에서 URL 열기'), true);
  }, { capture: true });
});
