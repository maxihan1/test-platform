import { defineCase, test, verify } from '@platform/kit';
import type { APIRequestContext } from '@playwright/test';
import { z } from 'zod';

import { 로그인폼 } from './components/login-form.component.js';
import { 토스트 } from './components/toast.component.js';
import { 관리자화면 } from './pages/admin.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-023',
  name: '잠긴 회원 줄의 「잠금 해제」를 누르면 잠금이 풀린다',
  platforms: ['desktop'],
  precondition: ['관리자 계정으로 로그인해 있다', '이번 실행에서 가입한 회원이 5번 틀려 잠겨 있다'],
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').default('admin'),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

const 예시비밀번호 = 'Mkt!2026pw';
const 틀린비밀번호 = 'Wrong!2026x';

function 새아이디(): string {
  return `mk${Date.now().toString(36).slice(-5)}${(Math.random().toString(36) + '000').slice(2, 5)}`;
}

async function 가입한다(request: APIRequestContext, 아이디: string): Promise<number> {
  const 응답 = await request.post('/api/auth/signup', {
    data: {
      loginId: 아이디,
      password: 예시비밀번호,
      passwordConfirm: 예시비밀번호,
      name: '마켓검사',
      email: `${아이디}@demo.market`,
      phone: '',
      birth: '',
      gender: '선택 안 함',
      interests: [],
      terms: true,
      privacy: true,
      marketing: false,
    },
  });
  return 응답.status();
}

test(spec, async ({ page, request, params }) => {
  const 홈 = new 홈화면(page);
  const 로그인 = new 로그인폼(page);
  const 관리자 = new 관리자화면(page);
  const 알림 = new 토스트(page);
  const 아이디 = 새아이디();

  try {
    await test.step('이번 실행에서 쓸 회원을 만들어 5번 틀려 잠근다', async () => {
      await 가입한다(request, 아이디);
      for (let 번 = 0; 번 < 5; 번 += 1) {
        await request.post('/api/auth/login', { data: { loginId: 아이디, password: 틀린비밀번호, remember: false } });
      }
    });

    await test.step('관리자로 로그인해 회원 관리에서 잠긴 회원을 찾는다', async () => {
      await 홈.쿠키띠를치운다();
      await 홈.공지팝업을치운다();
      await 홈.설문을치운다();
      await 로그인.로그인한다(params.adminId, params.adminPassword ?? '');
      await 관리자.열기();
      await 관리자.아이디검색.fill(아이디);
      await 관리자.회원줄(아이디).waitFor();
      await verify('이번 실행에서 가입한 회원이 5번 틀려 잠겨 있다', await 관리자.잠금해제(아이디).isVisible(), true, { blocker: true });
    });

    await test.step('회원 관리에서 잠긴 회원 줄의 「잠금 해제」를 누른다', async () => {
      await 관리자.잠금해제(아이디).click();
      await 알림.문구('잠금이 해제되었습니다').waitFor();
      await verify(
        '잠긴 회원 줄의 「잠금 해제」를 누르면 잠금이 풀린다',
        [await 관리자.잠금해제(아이디).count(), await 관리자.회원줄(아이디).getByRole('cell').last().innerText()],
        [0, '정상'],
      );
    });
  } finally {
    await request.post('/api/auth/login', { data: { loginId: 아이디, password: 예시비밀번호, remember: false } });
    await request.delete('/api/me');
  }
});
