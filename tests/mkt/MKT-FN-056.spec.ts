import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-056',
  name: '공백만 적고 「등록」을 누르면 토스트 「댓글 내용을 입력하세요」가 보이고 댓글이 등록되지 않는다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 알림 = new 토스트(page);
  const 표식 = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const 아이디 = `mk${표식}`.slice(0, 12);
  const 비밀번호 = `Mk!${표식}9`;
  const 가입 = await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  const 내번호: number = (await 가입.json()).id;
  const 로그인응답 = await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  const 글번호: number = (await (await page.request.post('/api/posts', { data: { category: '자유', title: `공백 댓글 시험 글 ${표식}`, content: '공백 댓글을 시험하려고 만든 글의 본문입니다', images: [] } })).json()).id;

  try {
    await test.step('공백만 적고 「등록」을 누른다', async () => {
      await verify('회원으로 로그인해 있다', 로그인응답.status(), 200, { blocker: true });
      await 상세.열기(글번호);
      await 상세.새댓글입력칸().waitFor();
      await 상세.새댓글입력칸().fill('   ');
      await 상세.새댓글등록버튼().click();
      await verify('공백만 적고 「등록」을 누르면 토스트 「댓글 내용을 입력하세요」가 보인다', await 알림.문구('댓글 내용을 입력하세요').isVisible(), true);
      await verify(
        '공백만 적고 「등록」을 누르면 댓글이 등록되지 않는다',
        [await 상세.댓글줄().count(), ((await (await page.request.get(`/api/posts/${글번호}/comments`)).json()).items as unknown[]).length],
        [0, 0],
      );
    });
  } finally {
    const 전체 = await page.request.get('/api/posts?size=100');
    for (const 글 of ((await 전체.json()).items as { id: number; authorId: number }[]).filter((항목) => 항목.authorId === 내번호)) {
      await page.request.delete(`/api/posts/${글.id}`);
    }
    await page.request.delete('/api/me');
  }
});
