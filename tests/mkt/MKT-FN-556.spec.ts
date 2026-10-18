import { defineCase, test, verify } from '@platform/kit';
import { 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-556',
  name: 'FAQ 응답이 서버 오류면 고객센터 화면이 깨지지 않고 오류 안내가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['FAQ 응답은 가짜 500 응답(모킹)이다'],
  params: null,
  expected: null,
  techniques: ['오류 추정'],
});

test(spec, async ({ page }) => {
  const 고객센터 = new 고객센터화면(page);
  const FAQ주소 = /\/api\/faq$/;

  try {
    await test.step('FAQ 응답을 가짜 500 응답으로 바꾼다', async () => {
      await 방해창막기(page);
      await page.context().route(FAQ주소, (경로) =>
        경로.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL', message: '잠시 후 다시 시도해 주세요' }) }),
      );
    });

    await test.step('비회원 상태를 확인한다', async () => {
      await verify('세션에 회원이 없다', await 세션회원있는가(page.request), false, { blocker: true });
    });

    await test.step('고객센터 화면을 연다', async () => {
      await 고객센터.열기();
      await verify(
        'FAQ 응답이 서버 오류면 고객센터 화면이 깨지지 않고 오류 안내가 보인다',
        { 화면제목: await 고객센터.제목.isVisible(), 탭: (await 고객센터.탭이름들()).length, 오류안내: await 고객센터.오류안내.isVisible() },
        { 화면제목: true, 탭: 4, 오류안내: true },
      );
    });
  } finally {
    await page.context().unroute(FAQ주소);
  }
});
