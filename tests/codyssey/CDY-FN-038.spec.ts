import { defineCase, test, verify } from '@platform/kit';
import { 공지목록화면 } from './pages/notice-list.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-038',
  name: '「모집」으로 공지사항을 검색하면 보이는 제목마다 「모집」이 들어 있다',
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
  });

  await test.step('공지사항 목록 화면이 열렸는지 확인한다', async () => {
    await 공지목록.제목.waitFor();
    await 공지목록.공지들.first().waitFor();
    await verify('공지사항 목록 화면에 「공지사항」 제목이 보인다', await 공지목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('공지사항 목록에서 검색어 「모집」을 적고 「검색」을 누른다', async () => {
    await 공지목록.검색.검색한다('모집');
    await 공지목록.공지제목들.filter({ hasNotText: '모집' }).first().waitFor({ state: 'detached' });
    await 공지목록.공지제목들.first().waitFor();
    const 제목들 = await 공지목록.공지제목들.allInnerTexts();
    await verify('「모집」으로 공지사항을 검색하면 보이는 제목마다 「모집」이 들어 있다', 제목들.length > 0 && 제목들.every((제목) => 제목.includes('모집')), true);
  });
});
