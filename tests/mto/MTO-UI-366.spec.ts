import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 이메일바꾸기화면 } from './pages/change-email.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-366',
  name: '「이메일 바꾸기」 화면에 「현재 이메일」 · 「새 이메일」 칸과 「이메일 바꾸기」 버튼이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '조치 대상 qa_user2 가 제재 없는 상태다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  const 이메일 = new 이메일바꾸기화면(page);
  let 번호 = '';

  try {

    await test.step('Owner 계정으로 로그인하고 qa_user2 제재를 푼다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await qa_user2되돌리기(page);
    });

    await test.step('qa_user2 가 제재 없는 상태인지 확인한다', async () => {
      번호 = await 계정번호(page, 'qa_user2');
      await 상세.열기(번호);
      await verify('조치 대상 qa_user2 가 제재 없는 상태다', (await 상세.상태.innerText()).trim(), '제한 없음', { blocker: true });
    });

    await test.step('qa_user2 계정 상세에서 「이메일 바꾸기」를 누른다', async () => {
      await 상세.이메일바꾸기.click();
      await 이메일.그려질때까지();
      const 현재 = await verify('「현재 이메일」 칸이 보인다', await 이메일.현재이메일.isVisible(), true);
      const 새 = await verify('「새 이메일」 칸이 보인다', await 이메일.새이메일.isVisible(), true);
      const 버튼 = await verify('「이메일 바꾸기」 버튼이 보인다', await 이메일.바꾸기.isVisible(), true);
      await verify('「이메일 바꾸기」 화면에 「현재 이메일」 · 「새 이메일」 칸과 「이메일 바꾸기」 버튼이 보인다', 현재 && 새 && 버튼, true);
    });

  } finally {
    await qa_user2되돌리기(page);
  }
});
