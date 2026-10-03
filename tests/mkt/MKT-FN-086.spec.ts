import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'MKT-FN-086',
  name: '글 조회 · 생성 · 삭제 API 는 200 · 201 · 204 로 응답한다',
  precondition: ['비회원이다', '회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  let 글번호 = 0;

  try {
    await test.step('조회 · 생성 · 삭제 API 를 부른다', async () => {
      const 조회 = await request.get('/api/posts');
      await verify('조회 API 는 200 으로 응답한다', 조회.status(), 200, { blocker: true });
    });

    await test.step('글을 만들고 지운다', async () => {
      const 생성 = await page.request.post('/api/posts', { data: { category: '자유', title: '임시 글 제목입니다', content: 'API 케이스가 만든 임시 글입니다. 곧 지웁니다.', images: [] } });
      await verify('생성 API 는 201 로 응답한다', 생성.status(), 201);
      글번호 = ((await 생성.json()) as { id: number }).id;
      const 삭제 = await page.request.delete(`/api/posts/${글번호}`);
      await verify('삭제 API 는 204 로 응답하고 본문이 없다', [삭제.status(), (await 삭제.text()).length], [204, 0]);
      글번호 = 0;
    });
  } finally {
    if (글번호 !== 0) await page.request.delete(`/api/posts/${글번호}`);
    await page.request.delete('/api/me');
  }
});
