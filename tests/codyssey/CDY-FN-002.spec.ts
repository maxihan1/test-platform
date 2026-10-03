import { defineCase, test, verify } from '@platform/kit';

import { 회원가입팝업 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-002',
  name: '「서울」을 고르고 「다음」을 누르면 「약관 동의 및 응시자격 확인」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['회원가입 지역 선택 팝업이 열려 있다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입팝업(page);

  await test.step('로그인 화면에서 회원가입 지역 선택 팝업을 연다', async () => {
    await 가입.지역팝업열기();
  });

  await test.step('회원가입 지역 선택 팝업이 열린 것을 확인한다', async () => {
    const 제목보임 = await 가입.지역선택제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('회원가입 팝업에 「지역을 선택해 주세요」 제목이 보인다', 제목보임, true, { blocker: true });
  });

  await test.step('팝업에서 「서울」 지역을 고른다', async () => {
    await 가입.지역고르기('서울');
  });

  await test.step('팝업에서 「다음」을 누른다', async () => {
    await 가입.다음누르기();

    const 약관제목보임 = await 가입.약관제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('「서울」을 고르고 「다음」을 누르면 「약관 동의 및 응시자격 확인」 제목이 보인다', 약관제목보임, true);
  });
});
