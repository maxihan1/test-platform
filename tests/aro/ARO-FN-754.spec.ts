import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-754',
  name: 'API 서버가 응답하지 않으면 로그인 화면 오류 줄에 「게임 API 서버에 연결하지 못했습니다 ()」가 보인다',
  techniques: ['동등 분할'],
  precondition: ['로그인 응답은 502 UPSTREAM 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  try {
    await test.step('로그인 화면을 열고 로그인 응답을 가짜 응답으로 바꾼다', async () => {
      await page.context().route('**/api/login', async (route) => {
        await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ code: 'UPSTREAM', message: '게임 API 서버에 연결하지 못했습니다 ()' }) });
      });
      await verify('로그인 화면이 열려 있다', await 로그인.열렸나(), true, { blocker: true });
    });

    await test.step('아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
      await 로그인.로그인('zz_no_user_' + String(Date.now()), '시험용 비밀번호');
      await verify('API 서버가 응답하지 않으면 로그인 화면 오류 줄에 「게임 API 서버에 연결하지 못했습니다 ()」가 보인다', await 로그인.오류뜰때까지(), '게임 API 서버에 연결하지 못했습니다 ()');
    });
  } finally {
    await page.context().unroute('**/api/login');
  }
});
