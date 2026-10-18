import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 고유글자 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-420',
  name: 'FAQ 와 내 문의 목록을 주고 문의 등록은 성공한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      준비.회원 = await 새회원으로로그인(request);
    });

    await test.step('로그인한 상태를 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(request), true, { blocker: true });
    });

    await test.step('FAQ · 내 문의 목록을 부르고 문의를 등록한다', async () => {
      const FAQ응답 = await request.get('/api/faq');
      const 목록응답 = await request.get('/api/inquiries');
      const 등록응답 = await request.post('/api/inquiries', {
        data: { type: '기타', title: 고유글자('API 문의'), content: '문의 등록 요청을 확인합니다', fileName: '', fileData: '', emailNotify: false },
      });
      await verify(
        'FAQ 와 내 문의 목록을 주고 문의 등록은 성공한다',
        {
          FAQ: FAQ응답.ok() && ((await FAQ응답.json()) as { items: unknown[] }).items.length > 0,
          내문의목록: 목록응답.ok() && Array.isArray(((await 목록응답.json()) as { items: unknown[] }).items),
          등록: 등록응답.ok(),
        },
        { FAQ: true, 내문의목록: true, 등록: true },
      );
    });
  } finally {
    await 회원과주문정리(request, 준비.회원);
  }
});
