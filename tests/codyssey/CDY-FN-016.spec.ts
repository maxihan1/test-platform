import { defineCase, test, verify } from '@platform/kit';

import { 회원가입팝업 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-016',
  name: '「서울 개포 캠퍼스」를 고르면 아래 버튼이 「다음」으로 바뀐다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '지역 선택 팝업이 열려 있다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입팝업(page);

  await test.step('지역 선택 팝업을 연다', async () => {
    await 가입.지역팝업을연다();
  });

  await test.step('지역 선택 팝업이 열렸는지 확인한다', async () => {
    await 가입.지역팝업제목.waitFor();
    await verify('「지역을 선택해 주세요」 팝업이 보인다', await 가입.지역팝업제목.isVisible(), true, { blocker: true });
  });

  await test.step('「서울 개포 캠퍼스」 지역 버튼을 고른다', async () => {
    await 가입.서울개포를고른다();
    await 가입.지역선택버튼.waitFor({ state: 'detached' });
    await verify('「서울 개포 캠퍼스」를 고르면 아래 버튼이 「다음」으로 바뀐다', await 가입.지역다음버튼.isVisible(), true);
    await verify('아래 「다음」 버튼이 켜진다', await 가입.지역다음버튼.isEnabled(), true);
  });
});
