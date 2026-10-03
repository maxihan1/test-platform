import { defineCase, test, verify } from '@platform/kit';

type 목록본문 = { total: number };

export const spec = defineCase({
  tcId: 'MKT-FN-089',
  name: '「POST /api/reset」은 204 로 응답하고 reset 뒤에는 만든 글이 사라진다',
  precondition: ['회원이 만든 글이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  const 시작글수 = ((await (await request.get('/api/posts')).json()) as 목록본문).total;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  const 만든글 = await page.request.post('/api/posts', { data: { category: '자유', title: '초기화 시험용 임시 글', content: 'API 케이스가 만든 임시 글입니다. 초기화로 사라집니다.', images: [] } });
  const 글번호 = 만든글.status() === 201 ? ((await 만든글.json()) as { id: number }).id : 0;

  try {
    await test.step('「POST /api/reset」을 부른다', async () => {
      await verify('회원이 만든 글이 있다', 만든글.status(), 201, { blocker: true });
      const 응답 = await request.post('/api/reset');
      await verify('reset 은 204 로 응답한다', 응답.status(), 204);
    });

    await test.step('「POST /api/reset」을 부른 뒤 글 목록을 조회한다', async () => {
      const 글 = await request.get(`/api/posts/${글번호}`);
      const 옛회원 = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
      const 지금글수 = ((await (await request.get('/api/posts')).json()) as 목록본문).total;
      await verify('reset 뒤에는 만든 글이 사라지고 초기 상태로 돌아간다', [글.status(), 옛회원.status(), 지금글수], [404, 401, 시작글수]);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
