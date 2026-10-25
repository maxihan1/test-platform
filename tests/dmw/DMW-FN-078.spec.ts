import { defineCase, test, verify } from '@platform/kit';

import { 시계멈추기 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-078',
  name: '관심 분야를 3개 고르면 3개가 다 체크된다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  await 안내창막기(page);
  await page.clock.install();

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('비회원이다', await 가입.머리.로그인.isVisible(), true, { blocker: true });
    await verify('회원가입 화면이 보인다', await 가입.큰제목.isVisible(), true, { blocker: true });
    await 시계멈추기(page);
  });

  await test.step('관심 분야 「패션」 · 「전자기기」 · 「도서」를 고른다', async () => {
    await 가입.관심분야('패션').check();
    await 가입.관심분야('전자기기').check();
    await 가입.관심분야('도서').check();
    await verify('관심 분야를 3개 고르면 3개가 다 체크된다', await 가입.관심분야고른수(), 3);
  });

  await test.step('관심 분야 3개를 고른 뒤 「식품」을 누른다', async () => {
    await 가입.관심분야('식품').click();
    await verify('관심 분야 4번째 「식품」을 누르면 체크되지 않는다', await 가입.관심분야('식품').isChecked(), false);
  });

  await test.step('관심 분야 4번째를 누른 뒤 토스트를 확인한다', async () => {
    await verify('관심 분야 4번째를 누르면 토스트 「관심 분야는 최대 3개까지 선택할 수 있습니다」가 보인다', await 가입.토스트창.글('관심 분야는 최대 3개까지 선택할 수 있습니다').isVisible(), true);
  });
});
