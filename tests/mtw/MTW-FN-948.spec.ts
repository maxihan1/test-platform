import { defineCase, test, verify } from '@platform/kit';

import { 초기상태바꾸기, type 풀기 } from './helpers/mock.helper.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 로그인전화면 } from './pages/landing.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-948',
  name: '유행을 끈 설정으로 로그인 전 화면을 열면 오른쪽 메뉴에 「유행 중」이 보이지 않는다',
  precondition: ['서버 설정의 유행 사용 값은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 전 = new 로그인전화면(page);
  const 풀기목록: 풀기[] = [];

  try {
    await test.step('유행을 끈 설정으로 로그인 전 화면을 연다', async () => {
      풀기목록.push(await 초기상태바꾸기(page, { trends_enabled: false }));
      await 한국어로(page);
      await 전.열기();
      await verify('로그인 전 오른쪽 메뉴에 「실시간 피드」가 보인다', await 전.실시간피드.isVisible(), true, { blocker: true });
      await verify('유행을 끈 설정으로 로그인 전 화면을 열면 오른쪽 메뉴에 「유행 중」이 보이지 않는다', await 전.유행중.isVisible(), false);
    });
  } finally {
    for (const 풀기함수 of 풀기목록) await 풀기함수();
  }
});
