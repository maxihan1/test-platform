import { defineCase, test, verify } from '@platform/kit';

import { 게시글쓰기화면 } from './pages/board-write.page.js';

type 글요약 = { id: number; authorId: number };

export const spec = defineCase({
  tcId: 'MKT-FN-063',
  name: '작성자가 아닌 사람이 수정 주소로 들어오면 「권한이 없습니다」가 보인다',
  precondition: ['남의 글이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 게시글쓰기화면(page);
  const 표식 = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const 아이디 = `mk${표식}`.slice(0, 12);
  const 비밀번호 = `Mk!${표식}9`;
  const 가입 = await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  const 내번호: number = (await 가입.json()).id;
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  const 남의글 = ((await (await page.request.get('/api/posts?size=100')).json()).items as 글요약[]).reverse().find((글) => 글.authorId !== 내번호);

  try {
    await test.step('작성자가 아닌 회원으로 그 글의 수정 주소를 연다', async () => {
      await verify('남의 글이 있다', 남의글 !== undefined, true, { blocker: true });
      await 쓰기.수정열기(남의글?.id ?? 0);
      await 쓰기.권한없음홈링크().waitFor();
      await verify('작성자가 아닌 사람이 수정 주소로 들어오면 「권한이 없습니다」가 보인다', await 쓰기.권한없음문구().isVisible(), true);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
