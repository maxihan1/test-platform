import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-246',
  name: '실패 응답 본문은 code 와 한국어 message 칸을 갖는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('비회원으로 GET /api/auth/me 를 부른다', async () => {
    const res = await request.get('/api/auth/me');
    await verify('GET /api/auth/me 를 비회원이 부르면 실패 응답이 온다', res.ok(), false, { blocker: true });
    const 본문 = (await res.json()) as { code?: unknown; message?: unknown };
    const 글 = typeof 본문.message === 'string' ? 본문.message : '';
    const 맞다 = typeof 본문.code === 'string' && 본문.code !== '' && /[가-힣]/.test(글) && !/^[A-Za-z0-9_ ]+$/.test(글);
    await verify('실패 응답 본문은 code 와 한국어 message 칸을 갖는다', 맞다, true);
  });
});
