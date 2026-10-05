import { defineCase, test, verify } from '@platform/kit';
import { 소개화면 } from './pages/about-intro.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-008',
  name: '소개 화면에 「코디세이 소개」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 소개 = new 소개화면(page);

  await test.step('코디세이 소개 화면을 연다', async () => {
    await 소개.연다();
    await 소개.제목.waitFor();
    await verify('소개 화면에 「코디세이 소개」 제목이 보인다', await 소개.제목.isVisible(), true, { blocker: true });
    await verify('「교육 인재상」 · 「학습 프로세스」 제목이 보인다', (await 소개.소제목('교육 인재상').isVisible()) && (await 소개.소제목('학습 프로세스').isVisible()), true);
  });
});
