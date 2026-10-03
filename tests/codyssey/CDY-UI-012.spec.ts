import { defineCase, test, verify } from '@platform/kit';
import { 교육과정화면 } from './pages/course.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-012',
  name: '교육과정 화면에 제목과 머리글, 「자세히 보기」 버튼이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 교육과정화면(page);

  await test.step('교육과정 화면을 연다', async () => {
    await 화면.연다();
    await 화면.마지막머리글.waitFor();
    await verify('교육과정 화면에 제목 「교육과정」이 보인다', await 화면.제목.isVisible(), true);
    await verify('교육과정 화면에 머리글 「교육안내」가 보인다', await 화면.머리글('교육안내').isVisible(), true);
    await verify(
      '교육과정 화면에 머리글 「AI 올인원 과정 (최대 18개월)」 「AI 네이티브 과정 (최대 5개월)」이 보인다',
      (await 화면.보이는머리글(['AI 올인원 과정 (최대 18개월)', 'AI 네이티브 과정 (최대 5개월)'])).join(', '),
      'AI 올인원 과정 (최대 18개월), AI 네이티브 과정 (최대 5개월)',
    );
    await verify('교육과정 화면에 「자세히 보기」 버튼이 둘 보인다', await 화면.자세히보기버튼들.count(), 2);
  });
});
