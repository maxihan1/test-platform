import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 글만들기, 표식 } from './helpers/board.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-292',
  name: 'POST /api/reset 은 204 로 응답한다',
  precondition: ['새로 가입한 회원이 글을 하나 썼다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 글번호 = 0;

  await test.step('새로 가입한 회원으로 로그인해 글을 하나 만든다', async () => {
    await 새회원으로로그인(request);
    글번호 = await 글만들기(request, { category: '자유', title: 표식('초기화 확인 글'), content: '초기화 뒤 사라져야 하는 글입니다' });
  });

  await test.step('만든 글이 조회되는지 확인한다', async () => {
    const res = await request.get(`/api/posts/${String(글번호)}`);
    await verify('초기화 전에는 만든 글이 조회된다', res.status(), 200, { blocker: true });
  });

  await test.step('POST /api/reset 을 보낸다', async () => {
    const res = await request.post('/api/reset');
    await verify('POST /api/reset 은 204 로 응답한다', res.status(), 204);
  });

  await test.step('POST /api/reset 을 보낸 뒤 그 글을 부른다', async () => {
    const res = await request.get(`/api/posts/${String(글번호)}`);
    await verify('초기화하면 초기화 전에 만든 글이 없어진다', res.status(), 404);
  });
});
