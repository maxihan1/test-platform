import { defineCase, test, verify } from '@platform/kit';
import { 공지목록화면 } from './pages/notice-list.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-019',
  name: '공지사항 목록 화면에 「공지사항」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 공지목록 = new 공지목록화면(page);

  await test.step('공지사항 목록 화면을 연다', async () => {
    await 공지목록.연다();
    await 공지목록.제목.waitFor();
    await 공지목록.공지들.first().waitFor();
    await verify('공지사항 목록 화면에 「공지사항」 제목이 보인다', await 공지목록.제목.isVisible(), true, { blocker: true });
    await verify(
      '자리표시가 「검색어를 입력하세요.」인 입력칸과 「검색」 버튼이 보인다',
      (await 공지목록.검색.검색어칸.isVisible()) && (await 공지목록.검색.검색버튼.isVisible()),
      true,
    );
    await verify('첫 쪽 목록에 공지가 9건 보인다', await 공지목록.공지들.count(), 9);
  });
});
