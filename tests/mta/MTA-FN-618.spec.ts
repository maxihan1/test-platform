import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 토스트 } from './components/toast.component.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-618',
  name: '「URL 열기」 주소를 해석할 수 없으면 토스트 「이 링크는 앱에서 지원하지 않습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    검색할주소: z.string().describe('검색창에 적을 주소 — 앱이 풀지 못하는 https:// 주소').default('https://example.com'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);
  const 토스트창 = new 토스트(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('검색에 https://example.com 을 적고 「마스토돈에서 URL 열기」를 누른다', async () => {
    await 검색.열기();
    await 검색.적기(params.검색할주소);
    await 검색.줄누르기('마스토돈에서 URL 열기');
    await verify('「URL 열기」 주소를 해석할 수 없으면 토스트 「이 링크는 앱에서 지원하지 않습니다.」가 보인다', await 토스트창.글(), '이 링크는 앱에서 지원하지 않습니다.');
  }, { capture: true });
});
