import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 기본회원으로로그인, 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원정보수정화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-333',
  name: '「기본 이미지로」를 누르면 프로필 미리보기가 기본 사진으로 돌아간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 수정 = new 회원정보수정화면(page);
  let 처음주소 = '';

  await test.step('회원으로 로그인한다', async () => {
    await 방해창막기(page);
    await 기본회원으로로그인(page.request, params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('로그인한 상태를 확인한다', async () => {
    await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
  });

  await test.step('회원정보 수정 화면에서 비밀번호를 다시 입력한다', async () => {
    await 수정.열기();
    await 수정.비밀번호확인하기(params.loginPassword ?? '');
    처음주소 = await 수정.미리보기주소();
  });

  await test.step('회원정보 수정 화면이 열렸는지 확인한다', async () => {
    await verify('「기본 이미지로」 버튼이 보인다', await 수정.기본이미지버튼.isVisible(), true, { blocker: true });
  });

  await test.step('사진을 올린 뒤 「기본 이미지로」를 누른다', async () => {
    await 수정.사진올리기(1000);
    await 수정.미리보기바뀔때까지(처음주소);
    await 수정.기본이미지버튼.click();
    await verify('「기본 이미지로」를 누르면 프로필 미리보기가 기본 사진으로 돌아간다', (await 수정.미리보기주소()).startsWith('data:image/svg+xml'), true);
  });
});
