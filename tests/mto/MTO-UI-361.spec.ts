import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-361',
  name: '계정 상세 정보 표에 「역할」 「할당된 역할 없음」 · 「이메일」 · 「이메일 상태」 · 「보안」 · 「인터페이스 언어」 · 「가입 날짜」 · 「최근 활동」 줄이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);

  await test.step('Owner 계정으로 로그인하고 qa_user2 역할을 푼다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await qa_user2되돌리기(page);
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', new 로그인화면(page).로그인화면인가(), false, { blocker: true });
  });

  await test.step('qa_user2 계정 상세를 연다', async () => {
    await 상세.열기(await 계정번호(page, 'qa_user2'));
    const 역할 = await verify('「역할」 줄에 「할당된 역할 없음」이 보인다', (await 상세.역할칸.innerText()).trim(), '할당된 역할 없음');
    const 이메일 = await verify('「이메일」 줄이 보인다', await 상세.정보줄('이메일').isVisible(), true);
    const 상태 = await verify('「이메일 상태」 줄이 보인다', await 상세.정보줄('이메일 상태').isVisible(), true);
    const 보안 = await verify('「보안」 줄이 보인다', await 상세.정보줄('보안').isVisible(), true);
    const 언어 = await verify('「인터페이스 언어」 줄이 보인다', await 상세.정보줄('인터페이스 언어').isVisible(), true);
    const 가입 = await verify('「가입 날짜」 줄이 보인다', await 상세.정보줄('가입 날짜').isVisible(), true);
    const 활동 = await verify('「최근 활동」 줄이 보인다', await 상세.정보줄('최근 활동').isVisible(), true);
    await verify('계정 상세 정보 표에 「역할」 「할당된 역할 없음」 · 「이메일」 · 「이메일 상태」 · 「보안」 · 「인터페이스 언어」 · 「가입 날짜」 · 「최근 활동」 줄이 보인다', 역할 && 이메일 && 상태 && 보안 && 언어 && 가입 && 활동, true);
  });
});
