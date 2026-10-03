import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { APIRequestContext } from '@playwright/test';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 로그인화면 } from './pages/login.page.js';
import { 회원탈퇴화면 } from './pages/my-withdraw.page.js';

const 예시비밀번호 = 'Mkt!2026pw';

function 새아이디(): string {
  return `mk${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;
}

function 가입본문(아이디: string, 이름: string) {
  return {
    loginId: 아이디,
    password: 예시비밀번호,
    passwordConfirm: 예시비밀번호,
    name: 이름,
    email: `${아이디}@example.com`,
    phone: '',
    birth: '',
    gender: '선택 안 함',
    interests: [],
    terms: true,
    privacy: true,
    marketing: false,
  };
}

async function 탈퇴로치운다(request: APIRequestContext, 아이디: string): Promise<void> {
  const 로그인 = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 예시비밀번호, remember: false } });
  if (로그인.ok()) await request.delete('/api/me');
}

export const spec = defineCase({
  tcId: 'MKT-FN-055',
  name: '탈퇴 확인 창에서 확인하면 로그아웃되어 홈으로 가고 그 아이디로 다시 로그인할 수 없다',
  precondition: ['이번 실행에서 가입한 회원이 로그인해 있다', '방금 탈퇴한 아이디가 있다'],
  params: null,
  expected: z.object({
    created: z.number().describe('가입 응답 코드').default(201),
    enabled: z.boolean().describe('「탈퇴하기」 버튼이 눌리는지').default(true),
    confirmMessage: z.string().describe('탈퇴 확인 창 문구').default('정말 탈퇴하시겠습니까?'),
    afterWithdraw: z.string().describe('탈퇴 뒤 화면 경로와 상태').default('/ 로그아웃됨'),
    loggedIn: z.boolean().describe('로그인돼 있는지').default(false),
  }),
});

test(spec, async ({ page, request, expected }) => {
  const 탈퇴 = new 회원탈퇴화면(page);
  const 화면 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 아이디 = 새아이디();

  try {
    await test.step('이번 실행에서 가입한 회원이 로그인한다', async () => {
      const 가입 = await request.post('/api/auth/signup', { data: 가입본문(아이디, '마켓회원') });
      await verify('이번 실행에서 가입한 회원이 있다', 가입.status(), expected.created, { blocker: true });
      await new 로그인폼(page).로그인한다(아이디, 예시비밀번호);
    });

    await test.step('회원 탈퇴 화면에서 「위 내용을 확인했습니다」를 체크한다', async () => {
      await 탈퇴.열기();
      await 탈퇴.확인체크.check();
      await verify('「위 내용을 확인했습니다」를 체크하면 「탈퇴하기」 버튼이 눌린다', await 탈퇴.탈퇴버튼.isEnabled(), expected.enabled);
    });

    await test.step('「탈퇴하기」를 누르고 확인 창에서 확인한다', async () => {
      const 창문구 = await 탈퇴.탈퇴하기를누르고확인창을받는다();
      await 머리.로그인링크.waitFor();
      await verify('「탈퇴하기」를 누르면 확인 창 「정말 탈퇴하시겠습니까?」가 뜬다', 창문구, expected.confirmMessage);
      const 상태 = (await 머리.로그아웃.isVisible()) ? '로그인 상태' : '로그아웃됨';
      await verify('확인 창에서 확인하면 로그아웃되어 홈으로 간다', `${new URL(page.url()).pathname} ${상태}`, expected.afterWithdraw);
    });

    await test.step('로그인 화면에서 탈퇴한 아이디로 로그인한다', async () => {
      await 화면.열기();
      await 화면.입력한다(아이디, 예시비밀번호);
      await 화면.로그인버튼.click();
      await 화면.로그인버튼.waitFor();
      await verify('탈퇴한 아이디로는 로그인할 수 없다', await 머리.로그아웃.isVisible(), expected.loggedIn);
    });
  } finally {
    await 탈퇴로치운다(request, 아이디);
  }
});
