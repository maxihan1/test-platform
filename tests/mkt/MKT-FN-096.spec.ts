import { defineCase, test, verify } from '@platform/kit';

type 글요약 = { id: number };
type 댓글본문 = { id: number; content: string; parentId: number | null; deleted?: boolean };

export const spec = defineCase({
  tcId: 'MKT-FN-096',
  name: '댓글 API 는 댓글과 답글을 달고 본인 댓글을 고치고 지울 수 있게 한다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  const 글들 = ((await (await page.request.get('/api/posts?size=10')).json()) as { items: 글요약[] }).items;
  const 글번호 = 글들[3]?.id ?? 0;
  const 목록 = async (): Promise<댓글본문[]> => ((await (await page.request.get(`/api/posts/${글번호}/comments`)).json()) as { items: 댓글본문[] }).items;
  let 댓글번호 = 0;
  let 답글번호 = 0;

  try {
    await test.step('댓글 작성 API 를 부른 뒤 댓글 목록 API 를 부른다', async () => {
      const 작성 = await page.request.post(`/api/posts/${글번호}/comments`, { data: { content: 'API 케이스가 단 임시 댓글입니다', parentId: null } });
      댓글번호 = 작성.ok() ? ((await 작성.json()) as 댓글본문).id : 0;
      const 들어간 = (await 목록()).find((댓글) => 댓글.id === 댓글번호);
      await verify('댓글을 쓰면 댓글 목록에 그 댓글이 들어간다', [작성.ok(), 들어간?.content], [true, 'API 케이스가 단 임시 댓글입니다'], { blocker: true });
    });

    await test.step('parentId 를 담아 답글을 쓴다', async () => {
      const 작성 = await page.request.post(`/api/posts/${글번호}/comments`, { data: { content: 'API 케이스가 단 임시 답글입니다', parentId: 댓글번호 } });
      답글번호 = 작성.ok() ? ((await 작성.json()) as 댓글본문).id : 0;
      const 들어간 = (await 목록()).find((댓글) => 댓글.id === 답글번호);
      await verify('parentId 를 담아 쓰면 답글이 달린다', [작성.ok(), 들어간?.parentId], [true, 댓글번호]);
    });

    await test.step('내 댓글을 수정 API 와 삭제 API 로 부른다', async () => {
      const 수정 = await page.request.put(`/api/comments/${댓글번호}`, { data: { content: 'API 케이스가 고친 임시 댓글입니다' } });
      const 고친 = (await 목록()).find((댓글) => 댓글.id === 댓글번호);
      const 답글삭제 = await page.request.delete(`/api/comments/${답글번호}`);
      const 댓글삭제 = await page.request.delete(`/api/comments/${댓글번호}`);
      const 남은 = (await 목록()).filter((댓글) => (댓글.id === 댓글번호 || 댓글.id === 답글번호) && 댓글.deleted !== true);
      await verify(
        '본인은 댓글을 고치고 지울 수 있다',
        [수정.ok(), 고친?.content, 답글삭제.status(), 댓글삭제.status(), 남은.length],
        [true, 'API 케이스가 고친 임시 댓글입니다', 204, 204, 0],
      );
      댓글번호 = 0;
      답글번호 = 0;
    });
  } finally {
    if (답글번호 !== 0) await page.request.delete(`/api/comments/${답글번호}`);
    if (댓글번호 !== 0) await page.request.delete(`/api/comments/${댓글번호}`);
    await page.request.delete('/api/me');
  }
});
