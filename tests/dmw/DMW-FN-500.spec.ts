import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원만들기 } from './helpers/account.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-500',
  name: '로그인 응답이 서버 오류면 화면이 깨지지 않고 오류 안내가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '로그인 응답은 가짜 응답(모킹)이다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 로그인 = new 로그인화면(page);
  const 회원 = await 일회용회원만들기(request);
  await 안내창막기(page);

  await page.context().route('**/api/auth/login', async (경로) => {
    await 경로.fulfill({ status: 500, json: { code: 'INTERNAL', message: '잠시 후 다시 시도해 주세요' } });
  });
  try {
    await test.step('로그인 응답을 서버 오류로 둔 채 로그인한다', async () => {
      await 로그인.열기();
      await verify('비회원이다', await 로그인.머리.로그인.isVisible(), true, { blocker: true });
      await verify('로그인 화면이 보인다', await 로그인.큰제목.isVisible(), true, { blocker: true });
      await 로그인.실패하는시도(회원.loginId, 회원.password);
      const 깨지지않음 = await verify('로그인 화면이 깨지지 않고 그대로 보인다', await 로그인.큰제목.isVisible(), true);
      const 안내 = await verify('오류 안내가 보인다', (await 로그인.오류.innerText()).length > 0, true);
      await verify('로그인 응답이 서버 오류면 화면이 깨지지 않고 오류 안내가 보인다', 깨지지않음 && 안내, true);
    });
  } finally {
    await page.context().unroute('**/api/auth/login');
  }
});
