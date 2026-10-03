import { defineCase, test, verify } from '@platform/kit';
import { 머리 } from './components/header.component.js';
import { 제목 } from './components/title.component.js';
import { 공지사항화면 } from './pages/notice.page.js';
import { 공지상세화면 } from './pages/notice-detail.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-025',
  name: '공지사항 목록에서 첫 공지의 제목을 누르면 상세 화면에 그 제목과 「목록」 버튼이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 공지사항화면(page);
  const 상세 = new 공지상세화면(page);
  const 머리부 = new 머리(page);
  const 제목부 = new 제목(page);

  await test.step('공지사항 화면을 연다', async () => {
    await 화면.연다();
  });

  await test.step('머리의 「로그인」 링크를 확인한다', async () => {
    await verify('머리에 「로그인」 링크가 보인다', await 머리부.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('공지사항 목록에서 첫 공지의 제목을 누른다', async () => {
    const 첫제목 = await 화면.첫공지제목글자();
    await 화면.첫공지제목을누른다();
    await 제목부.중제목('공지사항').waitFor();
    await verify('공지사항 목록에서 첫 공지의 제목을 누르면 상세 화면에 그 제목이 보인다', await 상세.글제목(첫제목).isVisible(), true);
    await verify('상세 화면에 「목록」 버튼이 보인다', await 상세.목록버튼.isVisible(), true);
  });
});
