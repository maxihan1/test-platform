import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 테스트계정값 } from './components/account.component.js';
import { 정리함, 회원로그인 } from './components/board-helpers.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-477',
  name: '남의 주문 상세 조회는 403 으로 응답한다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '테스트 계정의 주문 번호를 안다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('테스트 계정 아이디').optional().meta({ secret: true }),
    password: z.string().describe('테스트 계정 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, request, params }) => {
  const 정리 = new 정리함();
  try {
    let 남의주문번호 = '';

    await test.step('테스트 계정으로 주문 번호를 알아내고 새로 만든 회원으로 로그인한다', async () => {
      const 계정 = 테스트계정값(params);
      await API로그인(page.request, 계정.loginId, 계정.password);
      const 목록 = await page.request.get('/api/orders', { params: { period: 'all' } });
      남의주문번호 = ((await 목록.json()) as { items: Array<{ id: string }> }).items[0]?.id ?? '';
      await verify('테스트 계정의 주문 번호를 안다', 남의주문번호.length > 0, true, { blocker: true });
      await 회원로그인(request, 정리);
    });

    await test.step('테스트 계정 주문의 상세를 부른다', async () => {
      const res = await request.get(`/api/orders/${encodeURIComponent(남의주문번호)}`);
      await verify('남의 주문 상세 조회는 403 으로 응답한다', res.status(), 403);
    });
  } finally {
    await 정리.비우기();
  }
});
