import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-387',
  name: '로그인 없이 내 문의 목록 API 를 부르면 401 로 응답한다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(request), null, { blocker: true });
  });

  await test.step('로그인 없이 GET /api/inquiries 를 부른다', async () => {
    const 응답 = await request.get('/api/inquiries');
    await verify('로그인 없이 내 문의 목록 API 를 부르면 401 로 응답한다', 응답.status(), 401);
  });

  await test.step('로그인 없이 POST /api/inquiries 를 부른다', async () => {
    const 응답 = await request.post('/api/inquiries', { data: { type: '기타', title: '문의', content: '로그인 없이 보내는 문의 내용입니다', fileName: '', fileData: '', emailNotify: false } });
    await verify('로그인 없이 문의 등록 API 를 부르면 401 로 응답한다', 응답.status(), 401);
  });
});
