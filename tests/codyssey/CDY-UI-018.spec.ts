import { defineCase, test, verify } from '@platform/kit';
import { 제목 } from './components/title.component.js';
import { 공지사항화면 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-018',
  name: '공지사항 화면에 제목과 검색어 칸, 등록일 칸, 검색 버튼, 목록, 쪽 이동이 보인다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 공지사항화면(page);
  const 제목부 = new 제목(page);

  await test.step('공지사항 화면을 연다', async () => {
    await 화면.연다();
    await 화면.첫공지제목.waitFor();
    await verify('공지사항 화면에 제목 「공지사항」이 보인다', await 제목부.대제목('공지사항').isVisible(), true);
    await verify('공지사항 화면의 검색어 칸에 안내 「검색어를 입력하세요.」가 보인다', await 화면.검색어칸.isVisible(), true);
    await verify('공지사항 화면의 등록일 칸에 안내 「YYYY.MM.DD ~ YYYY.MM.DD」가 보인다', await 화면.등록일칸.isVisible(), true);
    await verify('공지사항 화면에 「검색」 버튼이 보인다', await 화면.검색버튼.isVisible(), true);
    await verify('공지사항 화면의 목록에 공지가 한 건 이상 보인다', (await 화면.공지제목들.count()) > 0, true);
    await verify(
      '공지사항 화면에 쪽 이동 「이전」 「다음」이 보인다',
      [await 화면.이전버튼.isVisible(), await 화면.다음버튼.isVisible()],
      [true, true],
    );
  });
});
