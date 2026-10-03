import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-029',
  name: '로그인하고 홈 화면과 장바구니 화면을 열면 서버 응답 어디에도 비밀번호가 평문으로 나오지 않는다',
  precondition: ['회원 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    found: z.boolean().describe('비밀번호가 나오는지').default(false),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 비밀번호 = params.password ?? '';
  const 응답글자: string[] = [];
  const 화면글자: string[] = [];
  const 읽는중: Promise<void>[] = [];

  page.on('response', (응답) => {
    const 종류 = 응답.request().resourceType();
    if (!응답.ok() || (종류 !== 'fetch' && 종류 !== 'xhr')) return;
    const 읽기 = 응답.text().then(
      (글) => {
        응답글자.push(글);
      },
      () => undefined,
    );
    const 지연 = new Promise<void>((해결) => {
      setTimeout(해결, 3000);
    });
    읽는중.push(Promise.race([읽기, 지연]));
  });

  await test.step('로그인하고 홈 화면과 장바구니 화면을 연다', async () => {
    const 로그인응답 = await page.request.post('/api/auth/login', { data: { loginId: params.loginId, password: 비밀번호, remember: false } });
    응답글자.push(await 로그인응답.text());
    await page.goto('/');
    await 머리.로그아웃.waitFor();
    화면글자.push(await 화면.본문글자());
    await page.goto('/cart');
    await 머리.로그아웃.waitFor();
    await page.waitForLoadState('networkidle');
    화면글자.push(await 화면.본문글자());
    await Promise.all(읽는중);

    await verify('서버 응답 어디에도 비밀번호가 평문으로 나오지 않는다', 비밀번호 !== '' && 응답글자.some((글) => 글.includes(비밀번호)), expected.found);
    await verify('화면 어디에도 비밀번호가 평문으로 나오지 않는다', 비밀번호 !== '' && 화면글자.some((글) => 글.includes(비밀번호)), expected.found);
  });
});
