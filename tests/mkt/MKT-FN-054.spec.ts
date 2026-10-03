import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { APIRequestContext } from '@playwright/test';

import { 로그인폼 } from './components/login-form.component.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

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

const 작은사진 = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64',
);

export const spec = defineCase({
  tcId: 'MKT-FN-054',
  name: '프로필 사진을 올리면 미리보기가 바뀌고 「기본 이미지로」를 누르면 기본 사진으로 돌아간다',
  precondition: ['회원 계정으로 로그인해 있다', '회원정보 수정 칸이 열려 있다', '프로필 사진 미리보기가 바뀌어 있다'],
  params: null,
  expected: z.object({
    open: z.boolean().describe('회원정보 수정 칸이 열려 있는지').default(true),
    changed: z.boolean().describe('미리보기가 바뀌었는지').default(true),
  }),
});

test(spec, async ({ page, request, expected }) => {
  const 수정 = new 회원정보수정화면(page);
  const 아이디 = 새아이디();
  let 처음주소: string | null = null;

  try {
    await test.step('이번 실행에서 가입한 회원으로 회원정보 수정 칸을 연다', async () => {
      await request.post('/api/auth/signup', { data: 가입본문(아이디, '마켓회원') });
      await new 로그인폼(page).로그인한다(아이디, 예시비밀번호);
      await 수정.열기();
      await 수정.비밀번호를확인한다(예시비밀번호);
      처음주소 = await 수정.미리보기주소();
      await verify('회원정보 수정 칸이 열려 있다', await 수정.저장버튼.isVisible(), expected.open, { blocker: true });
    });

    await test.step('프로필 사진으로 jpg 파일을 올린다', async () => {
      await 수정.사진을올린다('avatar.jpg', 'image/jpeg', 작은사진);
      await 수정.올린사진미리보기.waitFor();
      await verify('프로필 사진을 올리면 바로 미리보기가 바뀐다', (await 수정.미리보기주소()) !== 처음주소, expected.changed);
    });

    await test.step('「기본 이미지로」를 누른다', async () => {
      await 수정.기본이미지로버튼.click();
      await verify('「기본 이미지로」를 누르면 기본 사진으로 돌아간다', await 수정.미리보기주소(), 처음주소);
    });
  } finally {
    await 탈퇴로치운다(request, 아이디);
  }
});
