import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

type 주문요약 = { id: string };

export const spec = defineCase({
  tcId: 'MKT-FN-038',
  name: '남의 주문 번호로 주문 상세에 들어가면 「권한이 없습니다」가 보인다',
  precondition: ['다른 회원이 로그인해 있다'],
  params: z.object({
    ownerId: z.string().min(1).describe('주문을 가진 회원 아이디').default('user1'),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 상세 = new 주문상세화면(page);
  const 머리 = new 머리글(page);
  await request.post('/api/auth/login', { data: { loginId: params.ownerId, password: params.password ?? '' } });
  const 남의주문들 = (await (await request.get('/api/orders?period=all')).json()).items as 주문요약[];
  const 남의주문번호 = 남의주문들[0]?.id ?? '';
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await test.step('남의 주문 번호로 주문 상세 화면을 연다', async () => {
      await 상세.열기(남의주문번호);
      await 머리.로그아웃버튼().waitFor();
      await verify('다른 회원이 로그인해 있다', await 머리.로그아웃버튼().isVisible(), true, { blocker: true });
      await 상세.주문내역으로링크().waitFor();
      await verify('남의 주문 번호로 주문 상세에 들어가면 「권한이 없습니다」가 보인다', await 상세.권한없음문구().isVisible(), true);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
