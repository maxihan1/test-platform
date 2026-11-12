import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리화면 } from './pages/admin.page.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 사용자명규칙폼화면 } from './pages/username-block-form.page.js';
import { 폼오류 } from './components/form-error.component.js';

export const spec = defineCase({
  tcId: 'MTO-FN-531',
  name: '새 사용자명 규칙 폼에서 「일치할 단어」를 비우고 「규칙 만들기」를 누르면 규칙이 만들어지지 않고 「내용을 입력해 주세요」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 폼 = new 사용자명규칙폼화면(page);
  const 오류 = new 폼오류(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await 관리.사이드바.그려질때까지();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.중재.isVisible(), true, { blocker: true });
  });

  await test.step('새 사용자명 규칙 폼에서 「일치할 단어」를 비우고 「규칙 만들기」를 누른다', async () => {
    await 폼.열기();
    await 폼.만들기('');
    await 오류.요약.or(폼.알림.모두).first().waitFor();
    const 안만들어짐 = await verify('규칙이 만들어지지 않고 「오류가 발생했습니다」 안내가 보인다', await 오류.요약.isVisible(), true);
    const 안내 = await verify('「내용을 입력해 주세요」가 보인다', await 오류.내용필요.isVisible(), true);
    await verify('새 사용자명 규칙 폼에서 「일치할 단어」를 비우고 「규칙 만들기」를 누르면 규칙이 만들어지지 않고 「내용을 입력해 주세요」가 보인다', 안만들어짐 && 안내, true);
  });
});
