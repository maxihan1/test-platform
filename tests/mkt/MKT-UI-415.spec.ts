import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-415',
  name: '회원 관리 표에 아이디 · 이름 · 이메일 · 가입일 · 상태 칸이 보인다',
  platforms: ['desktop'],
  precondition: [
    '관리자로 로그인해 있다',
  ],
  held: '보류 — 관리자 계정이 없다',
  params: z.object({
    adminLoginId: z.string().describe('관리자 아이디'),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 관리자 = new 관리자화면(page);
  const 머리 = new 머리글(page);

  await 방해막기(page);

  await test.step('관리자로 로그인한다', async () => {
    await 화면로그인(page, params.adminLoginId, params.adminPassword ?? '');
    await 머리.관리자링크.waitFor();
    await verify('머리글에 「관리자」 링크가 보인다', await 머리.관리자링크.isVisible(), true, { blocker: true });
  });

  await test.step('관리자로 회원 관리를 연다', async () => {
    await 관리자.열기();
    await 관리자.탭('회원 관리').click();
    await 관리자.회원줄들.first().waitFor();
    await verify(
      '회원 관리 표에 아이디 · 이름 · 이메일 · 가입일 · 상태 칸이 보인다',
      {
        아이디: await 관리자.회원열머리('아이디').isVisible(),
        이름: await 관리자.회원열머리('이름').isVisible(),
        이메일: await 관리자.회원열머리('이메일').isVisible(),
        가입일: await 관리자.회원열머리('가입일').isVisible(),
        상태: await 관리자.회원열머리('상태').isVisible(),
      },
      { 아이디: true, 이름: true, 이메일: true, 가입일: true, 상태: true },
    );
    await verify('회원 관리 표 위에 「총 {N}명」 이 보인다', /^총 \d+명$/.test(await 관리자.회원총인원.innerText()), true);
  });
});
