import { defineCase, test, verify } from '@platform/kit';
import { AI네이티브화면 } from './pages/ai-native.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-016',
  name: 'AI 네이티브 화면에 「AI 네이티브」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const AI네이티브 = new AI네이티브화면(page);

  await test.step('AI 네이티브 화면을 연다', async () => {
    await AI네이티브.연다();
    await AI네이티브.제목.waitFor();
    await verify('AI 네이티브 화면에 「AI 네이티브」 제목이 보인다', await AI네이티브.제목.isVisible(), true, { blocker: true });
    await verify('「공고문 바로보기」 · 「공고문 다운로드」 · 「FAQ」가 보인다', (await AI네이티브.공고문바로보기버튼.isVisible()) && (await AI네이티브.공고문다운로드버튼.isVisible()) && (await AI네이티브.FAQ버튼.isVisible()), true);
  });
});
