import { defineCase, test, verify } from '@platform/kit';

type 글본문 = { id: number; title: string; liked: boolean; likes: number };

export const spec = defineCase({
  tcId: 'MKT-FN-095',
  name: '글 API 는 본인에게 작성 · 수정 · 삭제와 좋아요를 허용하고 남의 글 수정은 403 으로 막는다',
  precondition: ['회원으로 로그인해 있다', '다른 회원이 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 가입 = (아이디: string, 비밀번호: string) => ({
    loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false,
  });
  const 시각 = Date.now().toString(36);
  const 아이디 = `mk${시각}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${시각}9`;
  const 다른아이디 = `mj${시각}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 다른비밀번호 = `Mk!${시각}8`;
  const 글본문들 = (제목: string) => ({ category: '자유', title: 제목, content: 'API 케이스가 만든 임시 글입니다. 곧 지웁니다.', images: [] });
  await page.request.post('/api/auth/signup', { data: 가입(아이디, 비밀번호) });
  const 로그인응답 = await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  await request.post('/api/auth/signup', { data: 가입(다른아이디, 다른비밀번호) });
  const 다른로그인응답 = await request.post('/api/auth/login', { data: { loginId: 다른아이디, password: 다른비밀번호 } });
  const 남은글 = await page.request.post('/api/posts', { data: 글본문들('좋아요 시험용 임시 글') });
  const 남은글번호 = 남은글.status() === 201 ? ((await 남은글.json()) as 글본문).id : 0;
  let 글번호 = 0;

  try {
    await test.step('글 작성 · 수정 · 삭제 API 를 차례로 부른다', async () => {
      await verify('회원으로 로그인해 있다', 로그인응답.status(), 200, { blocker: true });
      await verify('다른 회원이 로그인해 있다', 다른로그인응답.status(), 200, { blocker: true });
      const 작성 = await page.request.post('/api/posts', { data: 글본문들('작성 시험용 임시 글') });
      글번호 = 작성.status() === 201 ? ((await 작성.json()) as 글본문).id : 0;
      const 수정 = await page.request.put(`/api/posts/${글번호}`, { data: 글본문들('수정한 임시 글 제목') });
      const 고친글 = (await (await page.request.get(`/api/posts/${글번호}`)).json()) as 글본문;
      const 삭제 = await page.request.delete(`/api/posts/${글번호}`);
      const 삭제뒤 = await page.request.get(`/api/posts/${글번호}`);
      글번호 = 0;
      await verify(
        '작성한 본인은 글을 만들고 고치고 지울 수 있다',
        [작성.status(), 수정.status(), 고친글.title, 삭제.status(), 삭제뒤.status()],
        [201, 200, '수정한 임시 글 제목', 204, 404],
      );
    });

    await test.step('남의 글을 수정 API 로 부른다', async () => {
      const 응답 = await request.put(`/api/posts/${남은글번호}`, { data: 글본문들('남이 고친 제목') });
      await verify('본인이 아닌 회원이 글을 수정하면 403 으로 응답한다', 응답.status(), 403);
    });

    await test.step('좋아요 API 를 두 번 부른다', async () => {
      const 첫째 = (await (await page.request.post(`/api/posts/${남은글번호}/like`)).json()) as 글본문;
      const 둘째 = (await (await page.request.post(`/api/posts/${남은글번호}/like`)).json()) as 글본문;
      await verify(
        '좋아요 API 는 부를 때마다 liked 와 likes 를 바꿔 돌려준다',
        [첫째.liked, 둘째.liked, 첫째.likes - 둘째.likes],
        [true, false, 1],
      );
    });
  } finally {
    if (글번호 !== 0) await page.request.delete(`/api/posts/${글번호}`);
    if (남은글번호 !== 0) await page.request.delete(`/api/posts/${남은글번호}`);
    await page.request.delete('/api/me');
    await request.delete('/api/me');
  }
});
