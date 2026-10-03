import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-055',
  name: '댓글 입력칸에 글을 적으면 글자 수가 나오고 300자를 넘게 입력되지 않고 등록하면 목록에 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 표식 = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const 아이디 = `mk${표식}`.slice(0, 12);
  const 비밀번호 = `Mk!${표식}9`;
  const 가입 = await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  const 내번호: number = (await 가입.json()).id;
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  const 글번호: number = (await (await page.request.post('/api/posts', { data: { category: '자유', title: `댓글 시험 글 ${표식}`, content: '댓글을 달아 보려고 만든 글의 본문입니다', images: [] } })).json()).id;
  const 짧은글 = '안녕하세요 댓글입니다';
  const 새댓글 = `시험 댓글 ${표식}`;

  try {
    await test.step('댓글 입력칸에 글을 적는다', async () => {
      await 상세.열기(글번호);
      await 상세.새댓글입력칸().waitFor();
      await verify('회원으로 로그인해 있다', await 머리.로그아웃버튼().isVisible(), true, { blocker: true });
      await 상세.새댓글입력칸().fill(짧은글);
      await verify('댓글 입력칸 오른쪽 아래에 「n/300」 꼴의 글자 수가 실시간으로 나온다', await 상세.새댓글글자수().innerText(), `${짧은글.length}/300`);
    });

    await test.step('댓글 입력칸에 301자를 적는다', async () => {
      await 상세.새댓글입력칸().fill('');
      await 상세.새댓글직접치기('가'.repeat(301));
      await verify('댓글 입력칸에는 300자를 넘게 입력되지 않는다', (await 상세.새댓글입력칸().inputValue()).length, 300);
    });

    await test.step('댓글을 적고 「등록」을 누른다', async () => {
      await 상세.새댓글입력칸().fill(새댓글);
      await 상세.새댓글등록버튼().click();
      await 상세.댓글수제목(1).waitFor();
      await verify('댓글을 적고 「등록」을 누르면 댓글 목록에 그 댓글이 보인다', await 상세.댓글찾기(새댓글).isVisible(), true);
    });
  } finally {
    const 전체 = await page.request.get('/api/posts?size=100');
    for (const 글 of ((await 전체.json()).items as { id: number; authorId: number }[]).filter((항목) => 항목.authorId === 내번호)) {
      await page.request.delete(`/api/posts/${글.id}`);
    }
    await page.request.delete('/api/me');
  }
});
