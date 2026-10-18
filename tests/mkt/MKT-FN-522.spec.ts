import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-522',
  name: '로그인 응답이 서버 오류면 로그인 화면이 그대로이고 오류 안내가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['로그인 응답은 가짜 500 응답(모킹)이다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 로그인주소 = '**/api/auth/login';

  try {
    await test.step('로그인 응답을 가짜 500 응답으로 바꾸고 로그인 화면을 연다', async () => {
      await page.context().route(로그인주소, (경로) =>
        경로.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL', message: '서버 오류가 발생했습니다' }) }),
      );
      await 방해창막기(page);
      await 로그인.열기();
    });

    await test.step('로그인 화면이 열렸는지 확인한다', async () => {
      await verify('로그인 화면 제목 「로그인」이 보인다', await 로그인.제목.isVisible(), true, { blocker: true });
    });

    await test.step('로그인 화면에서 로그인한다', async () => {
      await 로그인.틀린로그인하기('입력확인용', '입력확인용');
      await verify('로그인 응답이 서버 오류면 로그인 화면이 그대로이고 오류 안내가 보인다', [new URL(page.url()).pathname, (await 로그인.오류안내.innerText()).trim() !== ''], ['/login', true]);
    });
  } finally {
    await page.context().unroute(로그인주소);
  }
});
