import { defineCase, test, verify } from '@platform/kit';
import { 로그인화면 } from './pages/login.page.js';
import { 회원가입창 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-013',
  name: '가입 창의 비밀번호 칸에 영문 8자를 적으면 규칙 두 줄만 「✓」로 바뀐다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 로그인화면(page);
  const 가입창 = new 회원가입창(page);

  await test.step('로그인 화면에서 가입 창을 기본 정보 단계까지 연다', async () => {
    await 화면.연다();
    await 화면.회원가입을누른다();
    await 가입창.지역을고른다('서울');
    await 가입창.다음을누른다();
    await 가입창.약관셋을켠다();
    await 가입창.다음을누른다();
  });

  await test.step('가입 창의 기본 정보 단계를 확인한다', async () => {
    await 가입창.제목('회원가입').waitFor();
    await verify('가입 창에 제목 「회원가입」이 보인다', await 가입창.제목('회원가입').isVisible(), true, { blocker: true });
    await verify(
      '가입 창의 비밀번호 규칙이 「○ 8~20자」 「○ 영문 포함」 「○ 숫자 포함」 「○ 특수문자 포함」으로 보인다',
      (await 가입창.비밀번호규칙.allInnerTexts()).join(', '),
      '○ 8~20자, ○ 영문 포함, ○ 숫자 포함, ○ 특수문자 포함',
      { blocker: true },
    );
  });

  await test.step('가입 창의 비밀번호 칸에 영문 8자 「abcdefgh」를 적는다', async () => {
    await 가입창.비밀번호를적는다('abcdefgh');
    await 가입창.규칙줄('✓ 영문 포함').waitFor();
    await verify('가입 창의 비밀번호 칸에 영문 8자를 적으면 규칙 「✓ 8~20자」가 보인다', await 가입창.규칙줄('✓ 8~20자').isVisible(), true);
    await verify('규칙 「✓ 영문 포함」이 보인다', await 가입창.규칙줄('✓ 영문 포함').isVisible(), true);
    await verify('규칙 「○ 숫자 포함」이 그대로 보인다', await 가입창.규칙줄('○ 숫자 포함').isVisible(), true);
    await verify('규칙 「○ 특수문자 포함」이 그대로 보인다', await 가입창.규칙줄('○ 특수문자 포함').isVisible(), true);
  });
});
