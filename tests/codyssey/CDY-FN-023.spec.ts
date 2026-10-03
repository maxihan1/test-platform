import { defineCase, test, verify } from '@platform/kit';
import { 머리 } from './components/header.component.js';
import { 공지사항화면 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-023',
  name: '공지사항 화면에서 「AI 네이티브」를 검색하면 제목에 그 글자가 든 공지만 목록에 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 공지사항화면(page);
  const 머리부 = new 머리(page);
  const 검색어 = 'AI 네이티브';

  await test.step('공지사항 화면을 연다', async () => {
    await 화면.연다();
  });

  await test.step('머리의 「로그인」 링크를 확인한다', async () => {
    await verify('머리에 「로그인」 링크가 보인다', await 머리부.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('공지사항 화면에서 검색어 칸에 「AI 네이티브」를 적고 「검색」을 누른다', async () => {
    const 걸러질제목 = await 화면.검색어가없는첫제목(검색어);
    await 화면.검색한다(검색어);
    await 화면.공지제목(걸러질제목).waitFor({ state: 'detached' });
    await 화면.검색어가든공지제목(검색어).first().waitFor();
    await verify('공지사항 화면에서 「AI 네이티브」를 검색하면 목록에 공지가 한 건 이상 보인다', (await 화면.공지제목들.count()) > 0, true);
    await verify(
      '목록의 모든 제목에 「AI 네이티브」가 들어 있다',
      (await 화면.공지제목글자들()).every((글자) => 글자.includes(검색어)),
      true,
    );
  });
});
