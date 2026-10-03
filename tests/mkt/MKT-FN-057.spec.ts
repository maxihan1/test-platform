import type { APIRequestContext } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인폼 } from './components/login-form.component.js';
import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 문의 } from './pages/support-inquiry.page.js';

const 새회원비밀번호 = 'Mkt!2026pw';

async function 가입한다(request: APIRequestContext): Promise<string> {
  const 아이디 = `mk${Date.now().toString(36).slice(-6)}${Math.random().toString(36).slice(2, 5)}`;
  const res = await request.post('/api/auth/signup', {
    data: {
      loginId: 아이디,
      password: 새회원비밀번호,
      passwordConfirm: 새회원비밀번호,
      name: '시험회원',
      email: `${아이디}@example.com`,
      phone: '',
      birth: '',
      gender: '선택 안 함',
      interests: [],
      terms: true,
      privacy: true,
      marketing: false,
    },
  });
  if (res.status() !== 201) throw new Error(`가입 응답이 ${res.status()}이다`);
  return 아이디;
}

async function 치운다(request: APIRequestContext, 아이디: string): Promise<void> {
  await request.post('/api/auth/login', { data: { loginId: 아이디, password: 새회원비밀번호 } });
  await request.delete('/api/me');
}

export const spec = defineCase({
  tcId: 'MKT-FN-057',
  name: '문의 제목 · 내용에 한도를 넘겨 적으면 잘리고 등록하면 내역 맨 위에 추가된다',
  platforms: ['desktop'],
  precondition: ['회원 계정으로 로그인해 있다', '이번 실행에서 가입한 회원이 로그인해 있다'],
  params: z.object({
    type: z.string().min(1).describe('문의 유형').default('기타'),
    content: z.string().min(1).describe('문의 내용').default('시험용 문의 내용입니다'),
  }),
  expected: z.object({
    titleLength: z.number().describe('제목에 남는 글자 수').default(50),
    contentLength: z.number().describe('내용에 남는 글자 수').default(1000),
    status: z.string().describe('등록 직후 상태').default('답변 대기'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 폼 = new 문의(page);
  const 알림 = new 토스트(page);
  const 아이디 = await 가입한다(request);

  try {
    await test.step('이번 실행에서 쓸 회원을 로그인시키고 1:1 문의 화면을 연다', async () => {
      await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
      await 로그인.로그인한다(아이디, 새회원비밀번호);
      await 폼.열기();
    });

    await test.step('로그인 상태를 확인한다', async () => {
      await 머리.로그아웃.waitFor();
      await verify('이번 실행에서 가입한 회원이 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('문의 제목 칸에 51자를 적는다', async () => {
      await 폼.제목칸.fill('가'.repeat(51));
      await verify('문의 제목에 51자를 적으면 50자까지만 남는다', (await 폼.제목칸.inputValue()).length, expected.titleLength);
    });

    await test.step('문의 내용 칸에 1001자를 적는다', async () => {
      await 폼.내용칸.fill('나'.repeat(1001));
      await verify('문의 내용에 1001자를 적으면 1000자까지만 남는다', (await 폼.내용칸.inputValue()).length, expected.contentLength);
    });

    await test.step('1:1 문의 화면에서 유형 · 제목 · 내용을 채우고 등록한다', async () => {
      const 제목 = `시험 문의 ${아이디}`;
      await 폼.채운다(params.type, 제목, params.content);
      await 폼.등록.click();
      await 알림.문구('문의가 등록되었습니다').waitFor();
      const 첫줄 = await 폼.내역첫줄.innerText();
      await verify(
        '문의를 등록하면 폼 아래 「내 문의 내역」 맨 위에 「답변 대기」 상태로 추가된다',
        [첫줄.includes(제목), await 폼.내역첫줄상태.innerText()].join(', '),
        `true, ${expected.status}`,
      );
    });
  } finally {
    await 치운다(request, 아이디);
  }
});
