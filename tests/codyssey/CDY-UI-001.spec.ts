import { defineCase, test, verify } from '@platform/kit';
import { 바닥 } from './components/footer.component.js';
import { 머리 } from './components/header.component.js';
import { 제목 } from './components/title.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-001',
  name: '홈 화면에 제목과 머리 메뉴, 신청 버튼, 바닥 안내가 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 홈화면(page);
  const 머리부 = new 머리(page);
  const 바닥부 = new 바닥(page);
  const 제목부 = new 제목(page);
  const 홈제목 = 제목부.대제목('학비와 시간 제약 없이 장학금 받으며 배우는 AI전문인재 과정');

  await test.step('홈 화면을 연다', async () => {
    await 화면.연다();
    await 홈제목.waitFor();
    await verify('홈 화면에 제목 「학비와 시간 제약 없이 장학금 받으며 배우는 AI전문인재 과정」이 보인다', await 홈제목.isVisible(), true);
    await verify(
      '홈 화면 머리에 메뉴 「코디세이란」 「과정소개」 「모집안내」 「알림마당」이 보인다',
      (await 화면.보이는머리메뉴(['코디세이란', '과정소개', '모집안내', '알림마당'])).join(', '),
      '코디세이란, 과정소개, 모집안내, 알림마당',
    );
    await verify('홈 화면 머리에 「회원가입」 링크가 보인다', await 머리부.회원가입링크.isVisible(), true);
    await verify('홈 화면 머리에 「로그인」 링크가 보인다', await 머리부.로그인링크.isVisible(), true);
    await verify('홈 화면 머리에 지역 버튼 「서울」이 보인다', await 머리부.지역버튼().isVisible(), true);
    await verify('홈 화면에 「교육과정 신청하기」 버튼이 보인다', await 화면.교육과정신청버튼.isVisible(), true);
    await verify('홈 화면 바닥에 주소 「서울시 강남구 개포로 416 이노베이션아카데미」가 보인다', await 바닥부.주소.isVisible(), true);
    await verify('홈 화면 바닥에 문의 메일 「qna@codyssey.kr」 링크가 보인다', await 바닥부.문의메일링크.isVisible(), true);
    await verify('홈 화면 바닥에 「이용약관」 링크가 보인다', await 바닥부.이용약관링크.isVisible(), true);
    await verify('홈 화면 바닥에 「개인정보처리방침」 링크가 보인다', await 바닥부.개인정보링크.isVisible(), true);
  });
});
