import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-755',
  name: '로그인이 문구 없이 실패하면 오류 줄에 「로그인하지 못했습니다」가 보인다',
  precondition: ['로그인 응답은 문구 없는 500 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  try {
    await test.step('로그인 화면을 열고 로그인 응답을 문구 없는 가짜 응답으로 바꾼다', async () => {
      await page.context().route('**/api/login', async (route) => {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL' }) });
      });
      await verify('로그인 화면이 열려 있다', await 로그인.열렸나(), true, { blocker: true });
    });

    await test.step('아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
      await 로그인.로그인('zz_no_user_' + String(Date.now()), '시험용 비밀번호');
      await verify('로그인이 문구 없이 실패하면 오류 줄에 「로그인하지 못했습니다」가 보인다', await 로그인.오류뜰때까지(), '로그인하지 못했습니다');
    });
  } finally {
    await page.context().unroute('**/api/login');
  }
});
