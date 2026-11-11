import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-038',
  name: '계정 목록의 qa_user2 행에 표시 이름 · @아이디 · 게시물 수 · 팔로워 수 · 「최근 활동」 · 이메일 도메인이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 계정목록화면(page);

  await test.step('Owner 계정으로 로그인하고 「계정」 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「계정」 화면에서 아이디 「qa_user2」를 검색한다', async () => {
    await 목록.아이디로찾기('qa_user2');
    const 이름 = await verify('표시 이름과 @아이디가 보인다', await 목록.계정이름링크('qa_user2').isVisible(), true);
    const 게시물 = await verify('게시물 수가 보인다', await 목록.행게시물수('qa_user2').isVisible(), true);
    const 팔로워 = await verify('팔로워 수가 보인다', await 목록.행팔로워수('qa_user2').isVisible(), true);
    const 활동 = await verify('「최근 활동」이 보인다', await 목록.행최근활동('qa_user2').isVisible(), true);
    const 도메인 = await verify('이메일 도메인이 보인다', await 목록.행이메일도메인('qa_user2').isVisible(), true);
    await verify('계정 목록의 qa_user2 행에 표시 이름 · @아이디 · 게시물 수 · 팔로워 수 · 「최근 활동」 · 이메일 도메인이 보인다', 이름 && 게시물 && 팔로워 && 활동 && 도메인, true);
  });
});
