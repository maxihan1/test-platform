import { defineCase, test, verify } from '@platform/kit';
import { 공지목록화면 } from './pages/notice-list.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-037',
  name: '없는 검색어로 공지사항을 검색하면 「검색결과가 없습니다.」가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 공지목록 = new 공지목록화면(page);

  await test.step('공지사항 목록 화면을 연다', async () => {
    await 공지목록.연다();
  });

  await test.step('공지사항 목록 화면이 열렸는지 확인한다', async () => {
    await 공지목록.제목.waitFor();
    await 공지목록.공지들.first().waitFor();
    await verify('공지사항 목록 화면에 「공지사항」 제목이 보인다', await 공지목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('공지사항 목록에서 검색어 「zzzz없는말」을 적고 「검색」을 누른다', async () => {
    await 공지목록.검색.검색한다('zzzz없는말');
    await 공지목록.공지들.first().waitFor({ state: 'detached' });
    await 공지목록.결과없음문구.waitFor();
    await verify('없는 검색어로 공지사항을 검색하면 「검색결과가 없습니다.」가 보인다', await 공지목록.결과없음문구.isVisible(), true);
  });
});
