import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { URL열기줄 } from './helpers/nav.helper.js';
import { 문구가보이나 } from './helpers/compose-flow.helper.js';

import { 검색화면 } from './pages/search.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-353',
  name: '해석할 수 없는 주소로 「마스토돈에서 URL 열기」를 누르면 토스트 「이 링크는 앱에서 지원하지 않습니다.」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    주소: z.string().min(1).describe('검색에 적을 주소 — 앱이 해석하지 못하는 https 주소').default('https://mastodon.maxihan.com/qa-no-such-page'),
  }),
  expected: z.object({
    토스트: z.string().describe('토스트 글').default('이 링크는 앱에서 지원하지 않습니다.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);

  await test.step('일반 회원으로 로그인해 검색 입력 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('검색 입력 화면이 열린다', await 검색.열기(), true, { blocker: true });
  });

  await test.step('해석할 수 없는 주소로 「마스토돈에서 URL 열기」를 누른다', async () => {
    await 검색.적기(params.주소);
    await verify('「마스토돈에서 URL 열기」 줄이 보인다', await 뜰때까지(driver, URL열기줄, 15_000), true, { blocker: true });
    await driver.$(URL열기줄).click();
    await verify('해석할 수 없는 주소로 「마스토돈에서 URL 열기」를 누르면 토스트 「이 링크는 앱에서 지원하지 않습니다.」가 보인다', await 문구가보이나(driver, expected.토스트, 15_000), true);
  });
});
