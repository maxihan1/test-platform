import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 토스트 } from './components/toast.component.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-130',
  name: '검색어 1자로 검색하면 토스트 「검색어를 2자 이상 입력하세요」가 나온다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    oneChar: z.string().describe('1자 검색어 — 글자 하나').default('니'),
    twoChars: z.string().describe('2자 검색어 — 글자 둘, 제목에 든 글이 목록에 있어야 한다').default('니트'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 게시판목록화면(page);
  const 알림 = new 토스트(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('비회원이라 머리글에 「로그아웃」이 없다', await 목록.머리글.로그아웃버튼.count(), 0, { blocker: true });
    await verify('게시판 목록 제목 「커뮤니티」가 보인다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('검색어 1자 「니」로 검색한다', async () => {
    await 목록.검색어넣고누르기(params.oneChar);
    await verify('검색어 1자로 검색하면 토스트 「검색어를 2자 이상 입력하세요」가 나온다', await (await 알림.아무거나뜰때까지()).innerText(), '검색어를 2자 이상 입력하세요');
  });

  await test.step('검색어 2자 「니트」로 검색한다', async () => {
    await 목록.열기();
    await 목록.검색하기(params.twoChars);
    await verify('검색어 2자로 검색하면 토스트 없이 검색 결과가 보인다', [await 알림.문구('검색어를 2자 이상 입력하세요').count(), (await 목록.일반행.count()) > 0], [0, true]);
  });
});
