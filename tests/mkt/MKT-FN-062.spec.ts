import { defineCase, test, verify } from '@platform/kit';

import { 게시글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-062',
  name: '수정 화면은 글쓰기와 같은 모양에 기존 내용이 채워져 있다',
  precondition: ['내가 쓴 글이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 게시글쓰기화면(page);
  const 표식 = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const 아이디 = `mk${표식}`.slice(0, 12);
  const 비밀번호 = `Mk!${표식}9`;
  const 글제목 = `수정 시험 글 ${표식}`;
  const 글본문 = '수정 화면에 채워질 기존 본문입니다';
  const 가입 = await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  const 내번호: number = (await 가입.json()).id;
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  const 글번호: number = (await (await page.request.post('/api/posts', { data: { category: '질문', title: 글제목, content: 글본문, images: [] } })).json()).id;

  try {
    await test.step('그 글의 수정 화면을 연다', async () => {
      await 쓰기.수정열기(글번호);
      await 쓰기.준비된폼().waitFor();
      await verify('내가 쓴 글이 있다', (await page.request.get(`/api/posts/${글번호}`)).status(), 200, { blocker: true });
      await verify(
        '수정 화면은 글쓰기와 같은 모양에 기존 내용이 채워져 있다',
        {
          모양: [await 쓰기.분류선택().isVisible(), await 쓰기.제목칸().isVisible(), await 쓰기.본문칸().isVisible(), await 쓰기.이미지입력().isVisible(), await 쓰기.등록버튼().isVisible()],
          분류: await 쓰기.분류선택().inputValue(),
          제목: await 쓰기.제목칸().inputValue(),
          본문: await 쓰기.본문칸().inputValue(),
        },
        { 모양: [true, true, true, true, true], 분류: '질문', 제목: 글제목, 본문: 글본문 },
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
