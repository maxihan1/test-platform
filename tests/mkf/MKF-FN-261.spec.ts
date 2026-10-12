import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-261',
  name: '비회원이 내 문의 목록을 부르면 401 로 응답한다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('비회원으로 GET /api/inquiries 를 부른다', async () => {
    const res = await request.get('/api/inquiries');
    await verify('비회원이 내 문의 목록을 부르면 401 로 응답한다', res.status(), 401);
  });

  await test.step('비회원으로 POST /api/inquiries 를 부른다', async () => {
    const res = await request.post('/api/inquiries', { data: { type: '기타', title: '임시 문의 제목', content: '임시 문의 내용입니다', fileName: '', fileData: '', emailNotify: false } });
    await verify('비회원이 문의 등록을 부르면 401 로 응답한다', res.status(), 401);
  });
});
