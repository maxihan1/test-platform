import { defineCase, test, verify } from '@platform/kit';
import { 머리 } from './components/header.component.js';
import { 제목 } from './components/title.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-001',
  name: '홈 화면에서 「교육과정 신청하기」를 누르면 제목 「AI 네이티브」 화면이 열린다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 홈화면(page);
  const 머리부 = new 머리(page);
  const 제목부 = new 제목(page);

  await test.step('홈 화면을 연다', async () => {
    await 화면.연다();
  });

  await test.step('머리의 「로그인」 링크를 확인한다', async () => {
    await verify('머리에 「로그인」 링크가 보인다', await 머리부.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('홈 화면에서 「교육과정 신청하기」를 누른다', async () => {
    await 화면.교육과정신청을누른다();
    await 제목부.대제목('AI 네이티브').waitFor();
    await verify('홈 화면에서 「교육과정 신청하기」를 누르면 제목 「AI 네이티브」 화면이 열린다', await 제목부.대제목('AI 네이티브').isVisible(), true);
  });
});
