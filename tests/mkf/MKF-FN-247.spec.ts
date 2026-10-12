import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 글쓴이정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 가입본문, 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-247',
  name: '로그인이 필요한 요청을 비회원이 부르면 401 UNAUTHORIZED 로 응답한다',
  precondition: ['비회원이다', '회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;

  try {
    await test.step('비회원인지 확인한다', async () => {
      await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
    });

    await test.step('회원으로 로그인한다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
    });

    await test.step('회원으로 로그인해 있는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
    });

    await test.step('비회원으로 GET /api/auth/me 를 부른다', async () => {
      const res = await request.get('/api/auth/me');
      const 코드 = ((await res.json()) as { code?: string }).code;
      await verify('로그인이 필요한 요청을 비회원이 부르면 401 UNAUTHORIZED 로 응답한다', `${String(res.status())} ${String(코드)}`, '401 UNAUTHORIZED');
    });

    await test.step('없는 글 GET /api/posts/999999 를 부른다', async () => {
      const res = await request.get('/api/posts/999999');
      const 코드 = ((await res.json()) as { code?: string }).code;
      await verify('없는 대상을 부르면 404 NOT_FOUND 로 응답한다', `${String(res.status())} ${String(코드)}`, '404 NOT_FOUND');
    });

    await test.step('주소 검색 GET /api/address?q=a 를 부른다', async () => {
      const res = await request.get('/api/address', { params: { q: 'a' } });
      const 코드 = ((await res.json()) as { code?: string }).code;
      await verify('입력이 틀린 요청은 400 VALIDATION 으로 응답한다', `${String(res.status())} ${String(코드)}`, '400 VALIDATION');
    });

    await test.step('일반 회원으로 GET /api/admin/users 를 부른다', async () => {
      const res = await page.request.get('/api/admin/users');
      const 코드 = ((await res.json()) as { code?: string }).code;
      await verify('권한 없는 요청은 403 FORBIDDEN 으로 응답한다', `${String(res.status())} ${String(코드)}`, '403 FORBIDDEN');
    });

    await test.step('이미 있는 아이디 「admin」으로 POST /api/auth/signup 을 부른다', async () => {
      const res = await request.post('/api/auth/signup', { data: 가입본문({ ...새회원정보(), loginId: 'admin' }) });
      const 코드 = ((await res.json()) as { code?: string }).code;
      await verify('충돌하는 요청은 409 CONFLICT 로 응답한다', `${String(res.status())} ${String(코드)}`, '409 CONFLICT');
    });
  } finally {
    await 정리.모두하기();
  }
});
