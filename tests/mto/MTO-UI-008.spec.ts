import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 유행게시물화면 } from './pages/trends-statuses.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-008',
  name: 'Owner 의 사이드바 맨 위에 「마스토돈으로 돌아가기」가 보이고 「추천과 유행」 묶음에 유행 메뉴 넷이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({ 메뉴수: z.number().describe('추천과 유행 묶음 메뉴 수').default(4) }),
});

test(spec, async ({ page, params, expected }) => {
  const 관리 = new 관리화면(page);
  const 프로필 = new 공개프로필화면(page);
  const 유행게시물 = new 유행게시물화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「유행하는 게시물」 화면을 연다', async () => {
    await 유행게시물.열기();
    await 관리.사이드바.그려질때까지();
    const 맨위 = await verify('사이드바 맨 위에 「마스토돈으로 돌아가기」가 보인다', (await 관리.사이드바맨위항목.innerText()).trim(), '마스토돈으로 돌아가기');
    const 유행메뉴 = await verify('「추천과 유행」 묶음에 유행 메뉴 넷이 보인다', await 관리.묶음메뉴들('추천과 유행').count(), expected.메뉴수);
    await verify('Owner 의 사이드바 맨 위에 「마스토돈으로 돌아가기」가 보이고 「추천과 유행」 묶음에 유행 메뉴 넷이 보인다', 맨위 && 유행메뉴, true);
  });
});
