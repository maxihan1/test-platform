import { defineCase, test, verify } from '@platform/kit';

import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-052',
  name: '「목록」을 누르면 들어오기 전의 분류 · 검색 · 페이지가 유지된 목록으로 돌아간다',
  precondition: ['분류 · 검색 · 페이지를 바꾼 목록에서 글 상세에 들어왔다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 상세 = new 게시글상세화면(page);
  const 표식 = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const 아이디 = `mk${표식}`.slice(0, 12);
  const 비밀번호 = `Mk!${표식}9`;
  const 가입 = await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  const 내번호: number = (await 가입.json()).id;
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  for (let 순번 = 1; 순번 <= 11; 순번 += 1) {
    await page.request.post('/api/posts', { data: { category: '자유', title: `목록 유지 ${표식} ${순번}`, content: '목록 유지를 보려고 만든 글의 본문입니다', images: [] } });
  }
  await page.request.post('/api/auth/logout');
  let 들어오기전 = new URLSearchParams();
  let 들어오기전제목들: string[] = [];

  try {
    await test.step('「목록」 버튼을 누른다', async () => {
      await 목록.열기();
      await 목록.글줄().first().waitFor();
      await 목록.분류고르기('자유');
      await 목록.글줄().first().waitFor();
      await 목록.검색하기('제목', 표식);
      await 목록.글줄().first().waitFor();
      await 목록.쪽버튼(2).click();
      await 목록.글줄().first().waitFor();
      들어오기전 = new URL(page.url()).searchParams;
      들어오기전제목들 = await 목록.제목칸(목록.일반글줄()).allInnerTexts();
      await 목록.첫글열기();
      await 상세.댓글제목().waitFor();
      await verify(
        '분류 · 검색 · 페이지를 바꾼 목록에서 글 상세에 들어왔다',
        { 상세: await 상세.제목().isVisible(), 바꾼조건: [...들어오기전.keys()].sort() },
        { 상세: true, 바꾼조건: ['category', 'field', 'page', 'q'] },
        { blocker: true },
      );
      await 상세.목록버튼().click();
      await 목록.쪽버튼(2).waitFor();
      await 목록.글줄().first().waitFor();
      await verify(
        '「목록」을 누르면 들어오기 전의 분류 · 검색 · 페이지가 유지된 목록으로 돌아간다',
        { 조건: new URL(page.url()).searchParams.toString(), 제목들: await 목록.제목칸(목록.일반글줄()).allInnerTexts() },
        { 조건: 들어오기전.toString(), 제목들: 들어오기전제목들 },
      );
    });
  } finally {
    await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
    const 전체 = await page.request.get('/api/posts?size=100');
    for (const 글 of ((await 전체.json()).items as { id: number; authorId: number }[]).filter((항목) => 항목.authorId === 내번호)) {
      await page.request.delete(`/api/posts/${글.id}`);
    }
    await page.request.delete('/api/me');
  }
});
