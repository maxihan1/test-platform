import { defineCase, test, verify } from '@platform/kit';
import { 교육콘텐츠체험화면 } from './pages/education-demo.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-033',
  name: '「체험 시작하기」를 누르면 「STEP 1 / 6」이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 체험 = new 교육콘텐츠체험화면(page);

  await test.step('교육 콘텐츠 체험 화면을 연다', async () => {
    await 체험.연다();
  });

  await test.step('체험 화면이 열렸는지 확인한다', async () => {
    await 체험.제목.waitFor();
    await verify('체험 화면에 「학습 플랫폼을 미리 체험해보세요」 제목이 보인다', await 체험.제목.isVisible(), true, { blocker: true });
  });

  await test.step('교육 콘텐츠 체험 화면에서 「체험 시작하기」를 누른다', async () => {
    await 체험.체험시작을누른다();
    await 체험.학습시작버튼.waitFor();
    await verify('「체험 시작하기」를 누르면 「STEP 1 / 6」이 보인다', await 체험.단계표시.isVisible(), true);
  });
});
