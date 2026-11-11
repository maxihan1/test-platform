import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 상세열기, 일회용계정만들기, type 일회용계정 } from './helpers/account.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 계정목록화면 } from './pages/account-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-082',
  name: '이메일 미확인 계정 상세에서 「신원 확인」을 누르면 「이메일 상태」가 「확인됨」으로 바뀐다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 이메일 미확인 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  const 목록 = new 계정목록화면(page);
  let 계정: 일회용계정 | undefined;

  try {
    await test.step('일회용 계정을 가입시키고 Owner 계정으로 로그인한다', async () => {
      계정 = await 일회용계정만들기(page);
      await 로그인하기(page, params.loginId, params.loginPassword);
    });

    await test.step('이메일 미확인 계정 상세를 열어 확인한다', async () => {
      await 상세열기(page, 계정?.아이디 ?? '');
      await verify('케이스가 만든 이메일 미확인 계정이 있다', await 상세.신원확인.isVisible(), true, { blocker: true });
    });

    await test.step('이메일 미확인 계정 상세에서 「신원 확인」을 누른다', async () => {
      const 상세주소 = new URL(page.url()).pathname;
      await 상세.신원확인.click();
      await 목록.제목.waitFor();
      await 상세.열기(상세주소.split('/').pop() ?? '');
      await verify('이메일 미확인 계정 상세에서 「신원 확인」을 누르면 「이메일 상태」가 「확인됨」으로 바뀐다', (await 상세.이메일상태칸.innerText()).trim(), '확인됨');
    });
  } finally {
    if (계정 !== undefined) await 계정지우기(page, 계정.아이디);
  }
});
