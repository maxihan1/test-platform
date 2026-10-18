import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 로그아웃요청 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 응답본문모으기 } from './helpers/visual.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-446',
  name: '로그인 · 회원 정보 응답 어디에도 비밀번호 원문이 없다',
  platforms: ['desktop', 'mobile'],
  precondition: ['로그인 화면이 열려 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 비밀번호 = params.loginPassword ?? '';

  await test.step('로그인 화면을 연다', async () => {
    await 방해창막기(page);
    await 로그인.열기();
    await verify('로그인 화면 제목 「로그인」이 보인다', await 로그인.제목.isVisible(), true, { blocker: true });
  });

  await test.step('로그인하며 로그인 · 회원 정보 응답을 받는다', async () => {
    const 모음 = await 응답본문모으기(page, ['/api/auth/login', '/api/session']);
    try {
      await 로그인.로그인하기(params.loginId ?? '', 비밀번호);
      await 로그인.머리글.로그인꼴일때까지();
      const 로그인본문 = (모음.본문들['/api/auth/login'] ?? []).join('\n');
      const 회원정보본문 = (모음.본문들['/api/session'] ?? []).join('\n');
      await verify('비밀번호를 적었다', 비밀번호.length > 0, true, { blocker: true });
      await verify('로그인 응답과 회원 정보 응답을 받았다', 로그인본문.length > 0 && 회원정보본문.length > 0, true, { blocker: true });
      await verify(
        '로그인 · 회원 정보 응답 어디에도 비밀번호 원문이 없다',
        { 로그인응답: 로그인본문.includes(비밀번호), 회원정보응답: 회원정보본문.includes(비밀번호) },
        { 로그인응답: false, 회원정보응답: false },
      );
    } finally {
      await 모음.걷기();
    }
  });

  await test.step('비밀번호를 적은 화면 글자를 확인한다', async () => {
    await 로그아웃요청(page.request);
    await 로그인.열기();
    await 로그인.채우기(params.loginId ?? '', 비밀번호);
    await verify('화면 어디에도 비밀번호 원문이 글자로 보이지 않는다', (await page.locator('body').innerText()).includes(비밀번호), false);
  });
});
