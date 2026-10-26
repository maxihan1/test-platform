import { defineCase, test, verify } from '@platform/kit';

import { API로그인, 일회용회원만들기 } from './helpers/account.helper.js';
import { 몸읽기 } from './helpers/my-admin-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-386',
  name: 'FAQ API 는 FAQ 목록을 돌려준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 회원 = { id: 0, loginId: '', password: '', name: '', email: '' };

  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(request), null, { blocker: true });
  });

  await test.step('GET /api/faq 를 부른다', async () => {
    const 응답 = await request.get('/api/faq');
    const 목록 = (await 몸읽기<{ items?: unknown[] }>(응답)).items;
    await verify('FAQ API 는 FAQ 목록을 돌려준다', Array.isArray(목록) && 목록.length > 0, true);
  });

  await test.step('일회용 회원으로 로그인한다', async () => {
    회원 = await 일회용회원만들기(request);
    await API로그인(request, 회원.loginId, 회원.password);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(request), 회원.loginId, { blocker: true });
  });

  await test.step('POST /api/inquiries 로 문의를 등록하고 GET /api/inquiries 를 부른다', async () => {
    const 등록 = await request.post('/api/inquiries', { data: { type: '기타', title: '문의 API 시험', content: '문의 등록 API 로 등록한 문의가 맨 앞에 오는지 보는 내용입니다', fileName: '', fileData: '', emailNotify: false } });
    const 만든것 = await 몸읽기<{ id?: number }>(등록);
    const 목록 = await 몸읽기<{ items?: { id: number }[] }>(await request.get('/api/inquiries'));
    await verify('문의 등록 API 로 등록한 문의가 내 문의 목록 API 맨 앞에 있다', 목록.items?.[0]?.id, 만든것.id);
  });
});
