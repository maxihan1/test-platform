import { defineCase, test, verify } from '@platform/kit';
import { 머리 } from './components/header.component.js';
import { 공지사항화면 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-024',
  name: '공지사항 화면에서 없는 검색어를 검색하면 「검색결과가 없습니다.」가 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 공지사항화면(page);
  const 머리부 = new 머리(page);

  await test.step('공지사항 화면을 연다', async () => {
    await 화면.연다();
  });

  await test.step('머리의 「로그인」 링크를 확인한다', async () => {
    await verify('머리에 「로그인」 링크가 보인다', await 머리부.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('공지사항 화면에서 검색어 칸에 「zzqqxx」를 적고 「검색」을 누른다', async () => {
    await 화면.첫공지제목.waitFor();
    await 화면.검색한다('zzqqxx');
    await 화면.검색결과없음문구.waitFor({ state: 'attached' });
    await verify('공지사항 화면에서 없는 검색어를 검색하면 「검색결과가 없습니다.」가 보인다', await 화면.검색결과없음문구.isVisible(), true);
  });
});
