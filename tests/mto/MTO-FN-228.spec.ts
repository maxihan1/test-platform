import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 이메일도메인차단추가화면 } from './pages/email-domain-block-new.page.js';
import { 이메일도메인차단목록화면 } from './pages/email-domain-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-228',
  name: '「도메인 검사」를 누르면 「주요 이메일 제공자를 차단하지 않도록 조심하세요.」와 「도메인 추가하기」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    검사할도메인: z.string().min(1).describe('도메인 칸에 적을 글자 — 메일 서버(MX)가 있는 도메인').default('maxihan.com'),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 이메일도메인차단목록화면(page);
  const 추가 = new 이메일도메인차단추가화면(page);

  await test.step('Owner 계정으로 로그인하고 「차단된 이메일 도메인」 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「새로 추가하기」에서 「도메인」에 「maxihan.com」을 적고 「도메인 검사」를 누른다', async () => {
    await 목록.새로추가하기.click();
    await 추가.제목.waitFor();
    await 추가.검사하기(params.검사할도메인);
    const 주의 = await verify('「주요 이메일 제공자를 차단하지 않도록 조심하세요.」가 보인다', await 추가.주요제공자주의.isVisible(), true);
    const 추가버튼 = await verify('「도메인 추가하기」가 보인다', await 추가.도메인추가하기.isVisible(), true);
    await verify('「도메인 검사」를 누르면 「주요 이메일 제공자를 차단하지 않도록 조심하세요.」와 「도메인 추가하기」가 보인다', 주의 && 추가버튼, true);
  });
});
