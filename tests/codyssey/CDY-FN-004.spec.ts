import { defineCase, test, verify } from '@platform/kit';

import { 회원가입팝업 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-004',
  name: '약관 동의 체크박스 둘만 켜면 「다음」 버튼이 꺼져 있다',
  platforms: ['desktop'],
  precondition: ['회원가입 약관 동의 단계가 열려 있다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입팝업(page);

  await test.step('로그인 화면에서 회원가입 약관 동의 단계를 연다', async () => {
    await 가입.지역팝업열기();
    await 가입.지역고르기('서울');
    await 가입.다음누르기();
  });

  await test.step('회원가입 약관 동의 단계가 열린 것을 확인한다', async () => {
    const 약관제목보임 = await 가입.약관제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('회원가입 팝업에 「약관 동의 및 응시자격 확인」 제목이 보인다', 약관제목보임, true, { blocker: true });
  });

  await test.step('약관 동의 체크박스 둘만 켠다', async () => {
    await 가입.약관둘켜기();

    const 다음보임 = await 가입.다음버튼.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    const 다음꺼짐 = 다음보임 && (await 가입.다음버튼.isDisabled());
    await verify('약관 동의 체크박스 둘만 켜면 「다음」 버튼이 꺼져 있다', 다음꺼짐, true);
  });
});
