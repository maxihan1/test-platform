import { defineCase, test, verify } from '@platform/kit';

import { 게시글상세화면 } from './pages/board-detail.page.js';

type 글요약 = { id: number; commentCount: number };
type 댓글 = { content: string; parentId: number | null; deleted: boolean; author: string };

export const spec = defineCase({
  tcId: 'MKT-FN-057',
  name: '댓글의 「답글」을 누르면 그 댓글 바로 아래에 답글 입력칸이 열리고 답글에는 「답글」 버튼이 없다',
  precondition: ['댓글이 있는 글이다', '답글이 달린 댓글이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 후보 = ((await (await page.request.get('/api/posts?size=100')).json()).items as 글요약[]).filter((글) => 글.commentCount > 0);
  let 글번호 = 0;
  let 댓글들: 댓글[] = [];
  for (const 글 of 후보) {
    const 가져옴 = ((await (await page.request.get(`/api/posts/${글.id}/comments`)).json()).items as 댓글[]).filter((항목) => !항목.deleted && 항목.author !== '임시회원');
    if (글번호 === 0 && 가져옴.some((항목) => 항목.parentId !== null)) {
      글번호 = 글.id;
      댓글들 = 가져옴;
    }
  }
  const 부모내용 = 댓글들.find((항목) => 항목.parentId === null)?.content ?? '';
  const 답글내용 = 댓글들.find((항목) => 항목.parentId !== null)?.content ?? '';
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await test.step('댓글의 「답글」 버튼을 누른다', async () => {
      await 상세.열기(글번호);
      await 상세.댓글찾기(답글내용).waitFor();
      await verify('댓글이 있는 글이다', await 상세.댓글찾기(부모내용).isVisible(), true, { blocker: true });
      await 상세.답글버튼(상세.댓글찾기(부모내용)).click();
      await verify('「답글」을 누르면 그 댓글 바로 아래에 답글 입력칸이 열린다', await 상세.답글입력칸(상세.댓글찾기(부모내용)).isVisible(), true);
    });

    await test.step('게시글 상세 화면을 연다', async () => {
      await 상세.열기(글번호);
      await 상세.댓글찾기(답글내용).waitFor();
      await verify('답글이 달린 댓글이 있다', await 상세.댓글찾기(답글내용).isVisible(), true, { blocker: true });
      await verify('답글에는 「답글」 버튼이 없다', await 상세.답글버튼(상세.댓글찾기(답글내용)).count(), 0);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
