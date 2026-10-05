import { defineCase, test, verify } from '@platform/kit';
import { AI네이티브화면 } from './pages/ai-native.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-036',
  name: '「공고문 바로보기」를 누르면 새 탭에 PDF 공고문이 열린다',
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
  });

  await test.step('AI 네이티브 화면이 열렸는지 확인한다', async () => {
    await AI네이티브.제목.waitFor();
    await verify('AI 네이티브 화면에 「AI 네이티브」 제목이 보인다', await AI네이티브.제목.isVisible(), true, { blocker: true });
  });

  await test.step('AI 네이티브 화면에서 「공고문 바로보기」를 누른다', async () => {
    const 새탭주소 = await AI네이티브.공고문바로보기를누른다();
    await verify('「공고문 바로보기」를 누르면 새 탭에 PDF 공고문이 열린다', 새탭주소.endsWith('.pdf'), true);
  });
});
