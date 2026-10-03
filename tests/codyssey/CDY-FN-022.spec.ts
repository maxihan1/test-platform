import { defineCase, test, verify } from '@platform/kit';
import { 제목 } from './components/title.component.js';
import { 네이티브모집안내화면 } from './pages/recruitment-ai-native.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-022',
  name: 'AI 네이티브 모집안내 화면에서 「FAQ」를 누르면 제목 「FAQ」 화면이 열린다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 네이티브모집안내화면(page);
  const 제목부 = new 제목(page);

  await test.step('AI 네이티브 모집안내 화면을 연다', async () => {
    await 화면.연다();
  });

  await test.step('AI 네이티브 모집안내 화면의 「FAQ」 버튼을 확인한다', async () => {
    await 화면.제목.waitFor();
    await verify('AI 네이티브 모집안내 화면에 버튼 「FAQ」가 보인다', await 화면.FAQ버튼.isVisible(), true, { blocker: true });
  });

  await test.step('AI 네이티브 모집안내 화면에서 「FAQ」를 누른다', async () => {
    await 화면.FAQ를누른다();
    await 제목부.대제목('FAQ').waitFor();
    await verify('AI 네이티브 모집안내 화면에서 「FAQ」를 누르면 제목 「FAQ」 화면이 열린다', await 제목부.대제목('FAQ').isVisible(), true);
  });
});
