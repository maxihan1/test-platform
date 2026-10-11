import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 글쓴이정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-279',
  name: '입력이 틀린 요청은 400 VALIDATION 으로 응답한다',
  precondition: ['로그인하지 않은 요청이다', '회원으로 로그인한 요청이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;

  try {
    await test.step('회원으로 로그인한다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
    });

    await test.step('로그인한 요청인지 확인한다', async () => {
      await verify('회원으로 로그인한 요청이다', await 로그인해있나(page.request), true, { blocker: true });
    });

    await test.step('GET /api/address?q=가 를 부른다', async () => {
      const res = await request.get('/api/address', { params: { q: '가' } });
      const 코드 = ((await res.json()) as { code?: string }).code;
      await verify('입력이 틀린 요청은 400 VALIDATION 으로 응답한다', `${String(res.status())} ${String(코드)}`, '400 VALIDATION');
    });

    await test.step('로그인 없이 GET /api/cart 를 부른다', async () => {
      const res = await request.get('/api/cart');
      const 코드 = ((await res.json()) as { code?: string }).code;
      await verify('로그인이 필요한 요청을 로그인 없이 보내면 401 UNAUTHORIZED 로 응답한다', `${String(res.status())} ${String(코드)}`, '401 UNAUTHORIZED');
    });

    await test.step('GET /api/admin/users 를 부른다', async () => {
      const res = await page.request.get('/api/admin/users');
      const 코드 = ((await res.json()) as { code?: string }).code;
      await verify('권한이 없는 요청은 403 FORBIDDEN 으로 응답한다', `${String(res.status())} ${String(코드)}`, '403 FORBIDDEN');
    });

    await test.step('GET /api/posts/999999 를 부른다', async () => {
      const res = await request.get('/api/posts/999999');
      const 코드 = ((await res.json()) as { code?: string }).code;
      await verify('없는 대상을 부르면 404 NOT_FOUND 로 응답한다', `${String(res.status())} ${String(코드)}`, '404 NOT_FOUND');
    });

    await test.step('이미 있는 아이디 「user2」로 POST /api/auth/signup 을 부른다', async () => {
      const 정보 = 새회원정보();
      const res = await request.post('/api/auth/signup', {
        data: {
          loginId: 'user2', password: 정보.password, passwordConfirm: 정보.password, name: 정보.name, email: 정보.email,
          phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false,
        },
      });
      const 코드 = ((await res.json()) as { code?: string }).code;
      await verify('충돌하는 요청은 409 CONFLICT 로 응답한다', `${String(res.status())} ${String(코드)}`, '409 CONFLICT');
    });
  } finally {
    await 정리.모두하기();
  }
});
