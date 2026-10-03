import { defineCase, test, verify } from '@platform/kit';

import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-058',
  name: '내 댓글을 수정하면 「(수정됨)」이 붙고 삭제하면 답글이 있을 때만 「삭제된 댓글입니다」가 남는다',
  precondition: ['내가 쓴 댓글이 있다', '내 댓글을 수정하는 중이다', '답글이 달린 내 댓글이 있다', '답글이 없는 내 댓글이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 표식 = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const 아이디 = `mk${표식}`.slice(0, 12);
  const 비밀번호 = `Mk!${표식}9`;
  const 가입 = await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  const 내번호: number = (await 가입.json()).id;
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  const 글번호: number = (await (await page.request.post('/api/posts', { data: { category: '자유', title: `댓글 고치기 시험 글 ${표식}`, content: '댓글을 고쳐 보려고 만든 글의 본문입니다', images: [] } })).json()).id;
  const 첫댓글 = `답글이 달릴 댓글 ${표식}`;
  const 둘째댓글 = `답글이 없는 댓글 ${표식}`;
  const 답글 = `첫 댓글에 단 답글 ${표식}`;
  const 고친내용 = `고친 댓글 ${표식}`;
  const 첫댓글번호: number = (await (await page.request.post(`/api/posts/${글번호}/comments`, { data: { content: 첫댓글, parentId: null } })).json()).id;
  await page.request.post(`/api/posts/${글번호}/comments`, { data: { content: 둘째댓글, parentId: null } });
  await page.request.post(`/api/posts/${글번호}/comments`, { data: { content: 답글, parentId: 첫댓글번호 } });

  try {
    await test.step('내 댓글의 「수정」을 누른다', async () => {
      await 상세.열기(글번호);
      await 상세.댓글줄().first().waitFor();
      await verify('내가 쓴 댓글이 있다', await 상세.댓글찾기(첫댓글).isVisible(), true, { blocker: true });
      await 상세.댓글수정버튼(상세.댓글찾기(첫댓글)).click();
      await verify(
        '내 댓글의 「수정」을 누르면 그 자리가 입력칸으로 바뀌고 「저장」과 「취소」가 나온다',
        [
          await 상세.수정입력칸(상세.수정중인댓글()).isVisible(),
          await 상세.저장버튼(상세.수정중인댓글()).isVisible(),
          await 상세.수정취소버튼(상세.수정중인댓글()).isVisible(),
        ],
        [true, true, true],
      );
    });

    await test.step('내용을 바꾸고 「저장」을 누른다', async () => {
      const 수정중 = 상세.수정중인댓글();
      await verify('내 댓글을 수정하는 중이다', await 상세.수정입력칸(수정중).isVisible(), true, { blocker: true });
      await 상세.수정입력칸(수정중).fill(고친내용);
      await 상세.저장버튼(수정중).click();
      await 상세.댓글찾기(고친내용).waitFor();
      await verify('수정한 댓글에는 「(수정됨)」이 붙는다', await 상세.댓글의수정됨표시(상세.댓글찾기(고친내용)).isVisible(), true);
    });

    await test.step('내 댓글의 「삭제」를 누른다', async () => {
      await verify(
        '답글이 달린 내 댓글이 있다',
        [await 상세.댓글찾기(고친내용).isVisible(), await 상세.댓글찾기(답글).isVisible()],
        [true, true],
        { blocker: true },
      );
      await 상세.댓글삭제버튼(상세.댓글찾기(고친내용)).click();
      await 상세.댓글수제목(2).waitFor();
      await verify(
        '답글이 달린 댓글을 삭제하면 댓글 자리에 「삭제된 댓글입니다」가 남고 답글은 그대로 보인다',
        [await 상세.삭제된댓글표시().isVisible(), await 상세.댓글찾기(답글).isVisible()],
        [true, true],
      );
      await verify('답글이 없는 내 댓글이 있다', await 상세.댓글찾기(둘째댓글).isVisible(), true, { blocker: true });
      await 상세.댓글삭제버튼(상세.댓글찾기(둘째댓글)).click();
      await 상세.댓글수제목(1).waitFor();
      await verify('답글이 없는 댓글을 삭제하면 댓글이 목록에서 사라진다', await 상세.댓글찾기(둘째댓글).count(), 0);
    });
  } finally {
    const 전체 = await page.request.get('/api/posts?size=100');
    for (const 글 of ((await 전체.json()).items as { id: number; authorId: number }[]).filter((항목) => 항목.authorId === 내번호)) {
      await page.request.delete(`/api/posts/${글.id}`);
    }
    await page.request.delete('/api/me');
  }
});
