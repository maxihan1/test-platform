import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 정리함, 회원로그인 } from './components/board-helpers.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-484',
  name: 'FAQ 조회는 「items」로 응답한다',
  precondition: ['비회원이다', '새로 만든 회원으로 로그인해 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  const 정리 = new 정리함();
  try {
    const 문의제목 = 고유이름('문의제목');

    await test.step('FAQ 목록 /api/faq 를 부른다', async () => {
      const res = await request.get('/api/faq');
      await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
      const 본문 = (await res.json()) as { items?: unknown };
      await verify('FAQ 조회는 「items」로 응답한다', Array.isArray(본문.items), true);
    });

    await test.step('새로 만든 회원으로 로그인한다', async () => {
      await 회원로그인(request, 정리);
    });

    await test.step('문의 등록 POST /api/inquiries 를 보낸다', async () => {
      const res = await request.post('/api/inquiries', {
        data: { type: '기타', title: 문의제목, content: '문의 내용입니다 열글자 넘게 적습니다', fileName: '', fileData: '', emailNotify: false },
      });
      await verify('문의 등록 요청은 201 로 응답한다', res.status(), 201);
    });

    await test.step('내 문의 목록 GET /api/inquiries 를 부른다', async () => {
      const res = await request.get('/api/inquiries');
      const { items } = (await res.json()) as { items: Array<{ title: string; status: string }> };
      await verify('내 문의 목록에 방금 등록한 문의가 「답변 대기」로 온다', items.find((문의) => 문의.title === 문의제목)?.status, '답변 대기');
    });
  } finally {
    await 정리.비우기();
  }
});
