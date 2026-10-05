import { defineCase, test, verify } from '@platform/kit';
import { 공지상세화면 } from './pages/notice-detail.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-020',
  name: '공지 상세 화면에 「공지사항」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 공지상세 = new 공지상세화면(page);

  await test.step('공지 상세(pstartSn=57001)를 연다', async () => {
    await 공지상세.연다('57001');
    await 공지상세.제목.waitFor();
    await 공지상세.목록버튼.waitFor();
    await verify('공지 상세 화면에 「공지사항」 제목이 보인다', await 공지상세.제목.isVisible(), true, { blocker: true });
    await verify(
      '첨부파일에 「미리보기」 · 「다운로드」가 보인다',
      (await 공지상세.미리보기버튼.isVisible()) && (await 공지상세.다운로드버튼.isVisible()),
      true,
    );
    await verify('「목록」 버튼이 보인다', await 공지상세.목록버튼.isVisible(), true);
  });
});
