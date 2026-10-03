import { defineCase, test, verify } from '@platform/kit';
import { 머리 } from './components/header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-006',
  name: '머리 메뉴 「과정소개」에 마우스를 올리면 하위 메뉴 「교육과정」 「교육 콘텐츠 알아보기」 「교육 콘텐츠 체험」 「연간 교육일정」 「지원혜택」이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 홈화면(page);
  const 머리부 = new 머리(page);

  await test.step('홈 화면을 연다', async () => {
    await 화면.연다();
  });

  await test.step('머리의 「로그인」 링크를 확인한다', async () => {
    await verify('머리에 「로그인」 링크가 보인다', await 머리부.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('머리 메뉴 「과정소개」에 마우스를 올린다', async () => {
    await 머리부.메뉴에올린다('과정소개');
    await 머리부.메뉴('지원혜택').waitFor();
    await verify(
      '머리 메뉴 「과정소개」에 마우스를 올리면 하위 메뉴 「교육과정」 「교육 콘텐츠 알아보기」 「교육 콘텐츠 체험」 「연간 교육일정」 「지원혜택」이 보인다',
      (await 화면.보이는머리메뉴(['교육과정', '교육 콘텐츠 알아보기', '교육 콘텐츠 체험', '연간 교육일정', '지원혜택'])).join(', '),
      '교육과정, 교육 콘텐츠 알아보기, 교육 콘텐츠 체험, 연간 교육일정, 지원혜택',
    );
  });
});
