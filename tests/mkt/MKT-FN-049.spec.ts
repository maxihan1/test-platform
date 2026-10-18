import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-049',
  name: '「최신글」 탭을 누르면 글 5건이 작성 순(최신 먼저)으로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['공지 팝업을 닫아 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 방해창막기(page);
    await 홈.열기();
    await verify('공지 팝업이 보이지 않는다', await 홈.공지팝업보이나(), false, { blocker: true });
  });

  await test.step('「최신글」 탭을 누른다', async () => {
    const 응답 = page.waitForResponse((r) => r.url().includes('/api/posts') && r.url().includes('sort=latest'));
    await 홈.최신글탭.click();
    const 본문 = (await (await 응답).json()) as { items: { title: string; createdAt: string | number }[] };
    await 홈.글제목링크들.first().waitFor();
    const 작성순제목 = [...본문.items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((글) => 글.title);
    await verify(
      '「최신글」 탭을 누르면 글 5건이 작성 순(최신 먼저)으로 보인다',
      { 건수: (await 홈.글들()).length, 제목순서: (await 홈.글들()).map((글) => 글.제목) },
      { 건수: 5, 제목순서: 작성순제목 },
    );
  });
});
