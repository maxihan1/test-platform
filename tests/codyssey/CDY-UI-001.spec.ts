import { defineCase, test, verify } from '@platform/kit';
import { 홈공지팝업 } from './components/home-popup.component.js';
import { 바닥글 } from './components/site-footer.component.js';
import { 머리글 } from './components/site-header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-001',
  name: '홈 화면에 「학비와 시간 제약 없이 장학금 받으며 배우는 AI전문인재 과정」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 바닥 = new 바닥글(page);
  const 팝업 = new 홈공지팝업(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.연다();
    await 홈.첫제목.waitFor();
    await verify(
      '홈 화면에 「학비와 시간 제약 없이 장학금 받으며 배우는 AI전문인재 과정」 제목이 보인다',
      await 홈.첫제목.isVisible(),
      true,
      { blocker: true },
    );

    const 메뉴이름 = ['코디세이란', '과정소개', '모집안내', '알림마당'];
    for (const 이름 of 메뉴이름) await 머리.메뉴(이름).waitFor();
    const 메뉴보임 = await Promise.all(메뉴이름.map((이름) => 머리.메뉴(이름).isVisible()));
    await verify('머리글에 「코디세이란」 · 「과정소개」 · 「모집안내」 · 「알림마당」 메뉴가 보인다', 메뉴보임.every(Boolean), true);

    await 머리.회원가입링크.waitFor();
    await 머리.로그인링크.waitFor();
    const 계정링크보임 = [await 머리.회원가입링크.isVisible(), await 머리.로그인링크.isVisible()];
    await verify('머리글에 「회원가입」 · 「로그인」 링크가 보인다', 계정링크보임.every(Boolean), true);

    await 바닥.이용약관링크.waitFor();
    await 바닥.개인정보처리방침링크.waitFor();
    const 바닥링크보임 = [await 바닥.이용약관링크.isVisible(), await 바닥.개인정보처리방침링크.isVisible()];
    await verify('바닥글에 「이용약관」 · 「개인정보처리방침」 링크가 보인다', 바닥링크보임.every(Boolean), true);

    await 홈.교육과정신청버튼.waitFor();
    await verify('「교육과정 신청하기」 버튼이 보인다', await 홈.교육과정신청버튼.isVisible(), true);

    await 팝업.ost.waitFor();
    await verify('「OST2026」 공지 팝업이 보인다', await 팝업.ost.isVisible(), true);
  });
});
