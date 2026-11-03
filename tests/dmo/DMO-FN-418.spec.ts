import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { API로그인, 회원가입 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 세션읽기 } from './helpers/users-flow.helper.js';
import { 회원관리화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-418',
  name: '「잠그기」 응답이 서버 실패면 화면이 깨지지 않고 오류 안내 토스트가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['오류 추정'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원이 있다', '「잠그기」 응답은 가짜 응답(모킹)이다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 회원 = new 회원관리화면(page);
  const 토스트들 = new 토스트(page);
  let 일회용: 일회용회원;

  await test.step('일회용 회원을 만든다', async () => {
    일회용 = await 회원가입(request);
  });

  await test.step('관리자 계정으로 로그인해 있고 일회용 회원이 있음을 확인한다', async () => {
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await verify('관리자 계정으로 로그인해 있다', (await 세션읽기(page))?.role, 'admin', { blocker: true });
    await 회원.열기();
    await 회원.검색하기(일회용.loginId);
    await verify('일회용 회원 줄이 보인다', await 회원.회원줄(일회용.loginId).count(), 1, { blocker: true });
  });

  await test.step('「잠그기」 응답이 실패하는 채로 「잠그기」를 누른다', async () => {
    const 잠그기주소 = '**/api/ops/users/*/lock';
    await page.context().route(잠그기주소, (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));
    try {
      await 회원.줄버튼(일회용.loginId, '잠그기').click();
      await 토스트들.목록.first().waitFor();
      const 오류토스트 = await verify('오류 안내 토스트가 보인다', await 토스트들.목록.first().isVisible(), true);
      const 목록그대로 = await verify('일회용 회원 줄의 상태가 「정상」 그대로 보인다', (await 회원.상태칸(일회용.loginId).innerText()).trim(), '정상');
      await verify('「잠그기」 응답이 서버 실패면 화면이 깨지지 않고 오류 안내 토스트가 보인다', 오류토스트 && 목록그대로, true);
    } finally {
      await page.context().unroute(잠그기주소);
    }
  });
});
