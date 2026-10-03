import { defineCase, test, verify } from '@platform/kit';

import { 로그인부품 } from './components/login.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-006',
  name: '「다른 지역이신가요?」를 누르면 지역 목록에 「대전 캠퍼스」와 「경남 캠퍼스」가 모두 보인다',
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
    const 버튼보임 = await 화면.다른지역버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('로그인 화면에 「다른 지역이신가요?」 버튼이 보인다', 버튼보임, true, { blocker: true });
  });

  await test.step('「다른 지역이신가요?」를 누른다', async () => {
    await 화면.다른지역펼치기();

    const 대전보임 = await 화면.대전캠퍼스링크
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('「다른 지역이신가요?」를 누르면 지역 목록에 「대전 캠퍼스」가 보인다', 대전보임, true);

    const 경남보임 = await 화면.경남캠퍼스링크
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('지역 목록에 「경남 캠퍼스」가 보인다', 경남보임, true);
  });
});
