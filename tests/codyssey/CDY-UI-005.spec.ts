import { defineCase, test, verify } from '@platform/kit';
import { 로그인화면 } from './pages/login.page.js';
import { 회원가입창 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-005',
  name: '가입 창 기본 정보 단계에 제목과 단계 표시, 인증 버튼, 꺼진 칸, 비밀번호 규칙이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 로그인화면(page);
  const 가입창 = new 회원가입창(page);

  await test.step('로그인 화면에서 가입 창을 약관 동의 단계까지 연다', async () => {
    await 화면.연다();
    await 화면.회원가입을누른다();
    await 가입창.지역을고른다('서울');
    await 가입창.다음을누른다();
  });

  await test.step('가입 창의 약관 동의 단계를 확인한다', async () => {
    await 가입창.제목('약관 동의 및 응시자격 확인').waitFor();
    await verify('가입 창에 제목 「약관 동의 및 응시자격 확인」이 보인다', await 가입창.제목('약관 동의 및 응시자격 확인').isVisible(), true, { blocker: true });
  });

  await test.step('약관 동의 단계에서 체크박스 셋을 켜고 「다음」을 누른다', async () => {
    await 가입창.약관셋을켠다();
    await 가입창.다음을누른다();
    await 가입창.제목('회원가입').waitFor();
    await verify('가입 창에 제목 「회원가입」이 보인다', await 가입창.제목('회원가입').isVisible(), true);
    await verify(
      '가입 창에 단계 표시 「기본 정보」 「참여 정보」가 보인다',
      (await 가입창.보이는단계(['기본 정보', '참여 정보'])).join(', '),
      '기본 정보, 참여 정보',
    );
    await verify('가입 창에 「본인인증 하기」 버튼이 보인다', await 가입창.버튼('본인인증 하기').isVisible(), true);
    await verify('가입 창의 이름 칸은 꺼져 있다', await 가입창.이름칸.isDisabled(), true);
    await verify(
      '가입 창의 비밀번호 규칙이 「○ 8~20자」 「○ 영문 포함」 「○ 숫자 포함」 「○ 특수문자 포함」으로 보인다',
      (await 가입창.비밀번호규칙.allInnerTexts()).join(', '),
      '○ 8~20자, ○ 영문 포함, ○ 숫자 포함, ○ 특수문자 포함',
    );
    await verify('가입 창의 「다음」 버튼은 꺼져 있다', await 가입창.버튼('다음').isDisabled(), true);
  });
});
