import { defineCase, test, verify } from '@platform/kit';

import { 로그인부품 } from './components/login.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-007',
  name: '「비밀번호 보기」를 누르면 「비밀번호 숨기기」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['로그인 화면이 열려 있다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 부품 = new 로그인부품(page);
  const 화면 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 부품.열기();
  });

  await test.step('로그인 화면이 열린 것을 확인한다', async () => {
    const 버튼보임 = await 화면.비밀번호보기버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('로그인 화면에 「비밀번호 보기」 버튼이 보인다', 버튼보임, true, { blocker: true });
  });

  await test.step('「비밀번호 보기」를 누른다', async () => {
    await 화면.비밀번호보기누르기();

    const 숨기기보임 = await 화면.비밀번호숨기기버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('「비밀번호 보기」를 누르면 「비밀번호 숨기기」 버튼이 보인다', 숨기기보임, true);
  });
});
