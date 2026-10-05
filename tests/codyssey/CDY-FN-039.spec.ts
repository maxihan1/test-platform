import { defineCase, test, verify } from '@platform/kit';
import { 공지목록화면 } from './pages/notice-list.page.js';
import { 공지상세화면 } from './pages/notice-detail.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-039',
  name: '공지 제목을 누르면 공지 상세에 「목록」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 공지목록 = new 공지목록화면(page);
  const 공지상세 = new 공지상세화면(page);

  await test.step('공지사항 목록 화면을 연다', async () => {
    await 공지목록.연다();
  });

  await test.step('공지사항 목록 화면이 열렸는지 확인한다', async () => {
    await 공지목록.제목.waitFor();
    await 공지목록.공지들.first().waitFor();
    await verify('공지사항 목록 화면에 「공지사항」 제목이 보인다', await 공지목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('공지사항 목록에서 첫 글 제목을 누른다', async () => {
    await 공지목록.첫글제목을누른다();
    await 공지상세.제목.waitFor();
    await verify('공지 제목을 누르면 공지 상세에 「목록」 버튼이 보인다', await 공지상세.목록버튼.isVisible(), true);
  });
});
