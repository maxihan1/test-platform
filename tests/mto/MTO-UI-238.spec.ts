import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-238',
  name: '가입 탭에 「모두에게 가입을 열기 전에」로 시작하는 경고와 「최소 연령 제한」 · 「누가 가입할 수 있는지」 세 선택지 · 「가입이 불가능 할 때의 사용자 지정 메시지」가 보이고 CAPTCHA 칸은 보이지 않는다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 설정 = new 서버설정화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「가입」 탭을 연다', async () => {
    await 설정.열기('registrations');
    const 경고 = await verify('「모두에게 가입을 열기 전에」로 시작하는 경고가 보인다', await 설정.가입경고.isVisible(), true);
    const 연령 = await verify('「최소 연령 제한」이 보인다', await 설정.최소연령.isVisible(), true);
    const 선택지 = await verify('「누가 가입할 수 있는지」 선택지가 세 개다', (await 설정.가입방식선택지.allInnerTexts()).join(', '), '누구나 가입 할 수 있음, 가입하려면 승인이 필요함, 아무도 가입 할 수 없음');
    const 메시지 = await verify('「가입이 불가능 할 때의 사용자 지정 메시지」가 보인다', await 설정.가입불가메시지.isVisible(), true);
    const 캡차 = await verify('CAPTCHA 칸이 보이지 않는다', await 설정.캡차.isVisible(), false);
    await verify('가입 탭에 「모두에게 가입을 열기 전에」로 시작하는 경고와 「최소 연령 제한」 · 「누가 가입할 수 있는지」 세 선택지 · 「가입이 불가능 할 때의 사용자 지정 메시지」가 보이고 CAPTCHA 칸은 보이지 않는다', 경고 && 연령 && 선택지 && 메시지 && 캡차, true);
  });
});
