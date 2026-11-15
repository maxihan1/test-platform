import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { URL열기줄 } from './helpers/nav.helper.js';

import { 검색화면 } from './pages/search.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-346',
  name: '검색에 공백이 든 https:// 글을 적으면 「마스토돈에서 URL 열기」 줄이 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    글: z.string().min(1).describe('검색에 적을 글 — https 로 시작하고 공백이 든 글').default('https://mastodon.maxihan.com/@hana_photo 사진'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);

  await test.step('일반 회원으로 로그인해 검색 입력 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('검색 입력 화면이 열린다', await 검색.열기(), true, { blocker: true });
  });

  await test.step('검색에 공백이 든 「https://mastodon.maxihan.com/@hana_photo 사진」을 적는다', async () => {
    await 검색.적기(params.글);
    await verify('검색 결과 줄이 보인다', await 뜰때까지(driver, 검색.결과행제목, 15_000), true, { blocker: true });
    await verify('검색에 공백이 든 https:// 글을 적으면 「마스토돈에서 URL 열기」 줄이 보이지 않는다', await 보이나(driver, URL열기줄), false);
  });
});
