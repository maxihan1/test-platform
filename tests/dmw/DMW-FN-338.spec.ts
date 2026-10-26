import { defineCase, test, verify } from '@platform/kit';

import { API로그인, 일회용회원만들기 } from './helpers/account.helper.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-338',
  name: '조회 API 는 200 으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 회원 = { id: 0, loginId: '', password: '', name: '', email: '' };
  let 글번호 = 0;
  let 지움 = false;

  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(request), null, { blocker: true });
  });

  await test.step('GET /api/posts 를 부른다', async () => {
    const 응답 = await request.get('/api/posts');
    await verify('조회 API 는 200 으로 응답한다', 응답.status(), 200);
  });

  await test.step('일회용 회원으로 로그인한다', async () => {
    회원 = await 일회용회원만들기(request);
    await API로그인(request, 회원.loginId, 회원.password);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(request), 회원.loginId, { blocker: true });
  });

  try {
    await test.step('POST /api/posts 로 글을 만든다', async () => {
      const 응답 = await request.post('/api/posts', { data: { category: '자유', title: '응답 코드 시험 글', content: '응답 코드를 확인하려고 만든 시험 글 내용입니다', images: [] } });
      const 상태 = 응답.status();
      글번호 = ((await 응답.json()) as { id?: number }).id ?? 0;
      await verify('만들기 API 는 201 로 응답한다', 상태, 201);
    });

    await test.step('DELETE /api/posts/{id} 로 만든 글을 지운다', async () => {
      const 응답 = await request.delete(`/api/posts/${글번호}`);
      const 상태 = await verify('지우기 API 의 응답 코드가 204 이다', 응답.status(), 204);
      지움 = 상태;
      const 본문 = await verify('지우기 API 의 응답 본문이 비어 있다', await 응답.text(), '');
      await verify('지우기 API 는 본문 없이 204 로 응답한다', 상태 && 본문, true);
    });
  } finally {
    if (글번호 !== 0 && !지움) await 글지우기(request, 글번호);
  }
});
