import type { Route } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 보이는글, 세션아이디 } from './helpers/common-tools.helper.js';
import { 가짜응답으로온상태 } from './helpers/member-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-065',
  name: '로그인 응답이 서버 오류면 「잠시 후 다시 시도해 주세요」가 보인다',
  precondition: ['로그인 응답은 서버 오류 500 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
  techniques: ['오류 추정'],
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 정보 = 새회원정보();
  const 오류응답 = (route: Route): Promise<void> => route.fulfill({ status: 500, json: { code: 'INTERNAL' } });

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await page.context().route('**/api/auth/login', 오류응답);
  try {
    await test.step('로그인 화면을 열고 로그인 응답이 서버 오류로 오는지 확인한다', async () => {
      await 방해막기(page);
      await 로그인.열기();
      await 로그인.제목.waitFor();
      await verify('로그인 응답이 서버 오류 500 으로 온다', await 가짜응답으로온상태(page, '/api/auth/login'), 500, { blocker: true });
    });

    await test.step('로그인 화면에서 아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
      await 로그인.로그인하기(정보.loginId, 정보.password);
      await 로그인.오류.waitFor();
      await verify('로그인 응답이 서버 오류면 「잠시 후 다시 시도해 주세요」가 보인다', await 보이는글(로그인.오류), '잠시 후 다시 시도해 주세요');
    });
  } finally {
    await page.context().unroute('**/api/auth/login', 오류응답);
  }
});
