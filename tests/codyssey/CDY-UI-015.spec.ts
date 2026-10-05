import { defineCase, test, verify } from '@platform/kit';
import { 모집안내화면 } from './pages/recruitment-notice.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-015',
  name: '모집안내 화면에 「AI 올인원」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 모집안내 = new 모집안내화면(page);

  await test.step('모집안내 AI 올인원 화면을 연다', async () => {
    await 모집안내.연다();
    await 모집안내.제목.waitFor();
    await verify('모집안내 화면에 「AI 올인원」 제목이 보인다', await 모집안내.제목.isVisible(), true, { blocker: true });
    await verify('지원 혜택에 「교육생 장학금」이 보인다', await 모집안내.혜택('교육생 장학금').isVisible(), true);
  });
});
