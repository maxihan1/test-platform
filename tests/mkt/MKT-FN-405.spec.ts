import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입요청, 로그아웃요청, 임시회원로그인, 임시회원정보, 임시회원지우기, type 임시회원, 아이디사용중인가 } from './components/account.component.js';
import { 있어야한다 } from './components/site-extra.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-405',
  name: '입력 오류는 400 · 「VALIDATION」 코드와 한국어 message 로 응답한다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '새로 만든 회원 계정이 있다'],
  params: z.object({
    이미있는아이디: z.string().describe('이미 있는 아이디').default('user2'),
  }),
  expected: z.object({}),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params }) => {
  let 회원 = undefined as 임시회원 | undefined;

  try {
    await test.step('아이디 형식이 틀린 회원가입 요청을 보낸다', async () => {
      const 응답 = await 가입요청(request, { ...임시회원정보(), loginId: 'AB' });
      const 본문 = (await 응답.json()) as { code?: string; message?: string };
      await verify(
        '입력 오류는 400 · 「VALIDATION」 코드와 한국어 message 로 응답한다',
        [응답.status(), 본문.code, /[가-힣]/.test(본문.message ?? '')],
        [400, 'VALIDATION', true],
      );
    });

    await test.step('로그인 없이 장바구니 조회를 부른다', async () => {
      const 응답 = await request.get('/api/cart');
      await verify('로그인이 필요하면 401 · 「UNAUTHORIZED」로 응답한다', [응답.status(), ((await 응답.json()) as { code?: string }).code], [401, 'UNAUTHORIZED']);
    });

    await test.step('새로 만든 회원을 가입시키고 로그인한다', async () => {
      회원 = await 임시회원로그인(request);
    });

    await test.step('새로 만든 회원 계정이 있는지 확인한다', async () => {
      await verify('새로 만든 회원 계정이 있다', await 아이디사용중인가(request, 있어야한다(회원, '새로 만든 회원').loginId), true, { blocker: true });
    });

    await test.step('그 회원으로 관리자 회원 목록을 부른다', async () => {
      const 응답 = await request.get('/api/admin/users');
      await verify('권한이 없으면 403 · 「FORBIDDEN」으로 응답한다', [응답.status(), ((await 응답.json()) as { code?: string }).code], [403, 'FORBIDDEN']);
    });

    await test.step('새로 만든 회원을 로그아웃한다', async () => {
      await 로그아웃요청(request);
    });

    await test.step('없는 글 번호로 게시글 상세를 부른다', async () => {
      const 응답 = await request.get('/api/posts/99999999');
      await verify('없는 대상은 404 · 「NOT_FOUND」로 응답한다', [응답.status(), ((await 응답.json()) as { code?: string }).code], [404, 'NOT_FOUND']);
    });

    await test.step('이미 있는 아이디 「user2」로 회원가입 요청을 보낸다', async () => {
      const 응답 = await 가입요청(request, { ...임시회원정보(), loginId: params.이미있는아이디 });
      await verify('충돌은 409 · 「CONFLICT」로 응답한다', [응답.status(), ((await 응답.json()) as { code?: string }).code], [409, 'CONFLICT']);
    });
  } finally {
    if (회원) await 임시회원지우기(request, 회원);
  }
});
