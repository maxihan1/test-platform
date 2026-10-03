import { defineCase, test, verify } from '@platform/kit';
import { 로그인화면 } from './pages/login.page.js';
import { 회원가입창 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-011',
  name: '가입 창에서 지역 「서울」을 고르면 아래 버튼이 켜진 「다음」으로 바뀐다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 로그인화면(page);
  const 가입창 = new 회원가입창(page);

  await test.step('로그인 화면에서 가입 창을 연다', async () => {
    await 화면.연다();
    await 화면.회원가입을누른다();
  });

  await test.step('가입 창의 지역 선택 단계를 확인한다', async () => {
    await 가입창.제목('지역을 선택해 주세요').waitFor();
    await verify('가입 창에 제목 「지역을 선택해 주세요」가 보인다', await 가입창.제목('지역을 선택해 주세요').isVisible(), true, { blocker: true });
    await verify('가입 창 아래 버튼 「지역을 선택해 주세요」는 꺼져 있다', await 가입창.버튼('지역을 선택해 주세요').isDisabled(), true, { blocker: true });
  });

  await test.step('가입 창에서 지역 「서울」을 고른다', async () => {
    await 가입창.지역을고른다('서울');
    await 가입창.버튼('다음').waitFor();
    await verify('가입 창에서 지역 「서울」을 고르면 아래 버튼이 켜진 「다음」으로 바뀐다', await 가입창.버튼('다음').isEnabled(), true);
  });
});
