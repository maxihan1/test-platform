import { defineCase, test, verify } from '@platform/kit';

import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-011',
  name: '회원가입 화면에 중복 확인 · 입력칸 · 성별 · 관심 분야 · 약관과 눌리지 않는 「가입하기」 버튼이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 화면.열기();
    await 화면.가입하기버튼().waitFor();
    await verify('아이디 옆에 「중복 확인」 버튼이 보인다', await 화면.중복확인버튼().isVisible(), true, { blocker: true });
    await verify(
      '이름 · 이메일 · 휴대폰 · 생년월일 입력칸이 보인다',
      [await 화면.이름칸().isVisible(), await 화면.이메일칸().isVisible(), await 화면.휴대폰칸().isVisible(), await 화면.생년월일칸().isVisible()],
      [true, true, true, true],
    );
    await verify(
      '성별 라디오 버튼 「선택 안 함」 「남성」 「여성」이 보인다',
      [await 화면.성별라디오('선택 안 함').isVisible(), await 화면.성별라디오('남성').isVisible(), await 화면.성별라디오('여성').isVisible()],
      [true, true, true],
    );
    await verify('성별은 「선택 안 함」이 기본으로 선택돼 있다', await 화면.성별라디오('선택 안 함').isChecked(), true);
    await verify(
      '관심 분야 체크박스 「패션」 「전자기기」 「도서」 「식품」이 보인다',
      [
        await 화면.관심분야체크('패션').isVisible(),
        await 화면.관심분야체크('전자기기').isVisible(),
        await 화면.관심분야체크('도서').isVisible(),
        await 화면.관심분야체크('식품').isVisible(),
      ],
      [true, true, true, true],
    );
    await verify(
      '약관 「(필수) 이용약관 동의」 「(필수) 개인정보 수집 동의」 「(선택) 마케팅 수신 동의」와 「전체 동의」가 보인다',
      [
        await 화면.약관체크('(필수) 이용약관 동의').isVisible(),
        await 화면.약관체크('(필수) 개인정보 수집 동의').isVisible(),
        await 화면.약관체크('(선택) 마케팅 수신 동의').isVisible(),
        await 화면.전체동의체크().isVisible(),
      ],
      [true, true, true, true],
    );
    await verify('처음에는 「가입하기」 버튼이 눌리지 않는다', await 화면.가입하기버튼().isEnabled(), false);
  });
});
