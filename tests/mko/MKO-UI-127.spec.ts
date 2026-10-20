import { defineCase, test, verify } from '@platform/kit';

import { 로그인, 시험회원가입, 탈퇴, type 시험회원 } from './helpers/account.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 운영툴화면 } from './pages/ops.page.js';

export const spec = defineCase({
  tcId: 'MKO-UI-127',
  name: '「권한이 없습니다」 화면에서 「홈으로」를 누르면 쇼핑몰 홈으로 간다',
  platforms: ['desktop'],
  precondition: ['일반 회원으로 로그인해 주소 「/ops」를 열었다', '일반 회원 계정은 이번 실행에서 새로 가입한 계정이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 운영툴 = new 운영툴화면(page);
  const 홈 = new 홈화면(page);
  let 회원: 시험회원 | null = null;

  try {
    await test.step('시험용 일반 회원으로 가입하고 로그인한다', async () => {
      회원 = await 시험회원가입(request);
      await 로그인(page, 회원);
    });

    await test.step('「권한이 없습니다」 화면이 열렸는지 확인한다', async () => {
      await 운영툴.열기();
      await verify('「권한이 없습니다」 머리글이 보인다', await 운영툴.권한없음머리글.isVisible(), true, { blocker: true });
    });

    await test.step('「홈으로」를 누른다', async () => {
      await 운영툴.홈으로.click();
      await 홈.머리글.waitFor();
      await verify('「권한이 없습니다」 화면에서 「홈으로」를 누르면 쇼핑몰 홈으로 간다', new URL(page.url()).pathname, 홈화면.주소);
    });
  } finally {
    if (회원 !== null) await 탈퇴(page, 회원);
  }
});
