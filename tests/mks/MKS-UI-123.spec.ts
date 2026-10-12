import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, 로그인한아이디, 테스트계정으로로그인 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';
import { 경로, 보이는이름들 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-UI-123',
  name: '회원정보 수정에 「회원정보를 보호하기 위해 비밀번호를 다시 입력해 주세요.」와 비밀번호 입력칸이 보인다',
  precondition: ['테스트 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 회원정보 = new 회원정보수정화면(page);

  await test.step('테스트 계정으로 로그인한다', async () => {
    await 방해막기(page);
    await 테스트계정으로로그인(page.request, params);
  });

  await test.step('테스트 계정으로 로그인했는지 확인한다', async () => {
    await verify('테스트 계정으로 로그인해 있다', await 로그인한아이디(page.request), 계정값(params).loginId, { blocker: true });
  });

  await test.step('회원정보 수정을 연다', async () => {
    await 회원정보.열기();
    await 회원정보.제목.waitFor();
    await verify('회원정보 수정 화면이 열려 있다', 경로(page), 회원정보수정화면.주소, { blocker: true });
    await verify(
      '회원정보 수정에 「회원정보를 보호하기 위해 비밀번호를 다시 입력해 주세요.」와 비밀번호 입력칸이 보인다',
      await 보이는이름들({ '「회원정보를 보호하기 위해 비밀번호를 다시 입력해 주세요.」': 회원정보.안내, '비밀번호 입력칸': 회원정보.비밀번호 }),
      '「회원정보를 보호하기 위해 비밀번호를 다시 입력해 주세요.」, 비밀번호 입력칸',
    );
  });
});
