import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 경로, 보이는글 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-400',
  name: '로그인 응답이 서버 오류면 「잠시 후 다시 시도해 주세요」가 보인다',
  precondition: ['비회원이다', '로그인 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
  techniques: ['오류 추정'],
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('로그인 화면을 연다', async () => {
    await 방해막기(page);
    await 로그인.열기();
    await 로그인.제목.waitFor();
    await verify('로그인 화면이 열려 있다', 경로(page), 로그인화면.주소, { blocker: true });
  });

  const 서버오류 = { status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL' }) };
  await page.context().route('**/api/auth/login', (route) => route.fulfill(서버오류));
  try {
    await test.step('로그인 응답을 서버 오류로 바꾸고 로그인 화면에서 「로그인」을 누른다', async () => {
      await 로그인.아이디와비밀번호적기('example1', 'Example1!');
      await 로그인.로그인.click();
      await 로그인.오류.filter({ hasText: /\S/ }).waitFor();
      await verify('로그인 응답이 서버 오류면 「잠시 후 다시 시도해 주세요」가 보인다', await 보이는글(로그인.오류), '잠시 후 다시 시도해 주세요');
    });
  } finally {
    await page.context().unroute('**/api/auth/login');
  }
});
