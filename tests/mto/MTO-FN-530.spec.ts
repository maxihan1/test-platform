import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리화면 } from './pages/admin.page.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 이메일도메인차단추가화면 } from './pages/email-domain-block-new.page.js';
import { 폼오류 } from './components/form-error.component.js';

export const spec = defineCase({
  tcId: 'MTO-FN-530',
  name: '새 이메일 도메인 차단에서 「도메인」을 비우고 「도메인 검사」를 누르면 오류 안내 없이 「새 이메일 도메인 차단」 폼에 「도메인 추가하기」가 보인다',
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
  const 폼 = new 이메일도메인차단추가화면(page);
  const 오류 = new 폼오류(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await 관리.사이드바.그려질때까지();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.중재.isVisible(), true, { blocker: true });
  });

  await test.step('새 이메일 도메인 차단에서 「도메인」을 비우고 「도메인 검사」를 누른다', async () => {
    await 폼.열기();
    await 폼.검사하기('');
    const 오류없음 = await verify('오류 안내가 보이지 않는다', await 오류.요약.isVisible(), false);
    const 폼제목 = await verify('「새 이메일 도메인 차단」 폼에 머문다', await 폼.제목.isVisible(), true);
    const 추가 = await verify('「도메인 추가하기」가 보인다', await 폼.도메인추가하기.isVisible(), true);
    await verify('새 이메일 도메인 차단에서 「도메인」을 비우고 「도메인 검사」를 누르면 오류 안내 없이 「새 이메일 도메인 차단」 폼에 「도메인 추가하기」가 보인다', 오류없음 && 폼제목 && 추가, true);
  });
});
