import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-517',
  name: 'Moderator 가 「이의제기」 · 「초대」 · 「연합」 · 「차단된 이메일 도메인」 · 「사용자명 규칙」 · 「IP 규칙들」 주소를 열면 화면마다 「이 페이지를 표시할 권한이 없습니다.」가 보인다',
  precondition: ['Moderator(qa_mod) 계정으로 로그인해 있다'],
  params: z.object({
    modId: z.string().describe('중재자 아이디').optional().meta({ secret: true, account: '중재자' }),
    modPassword: z.string().describe('중재자 비밀번호').optional().meta({ secret: true, account: '중재자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 프로필 = new 공개프로필화면(page);

  await test.step('Moderator 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.modId, params.modPassword);
    await 프로필.열기();
    await verify('Moderator(qa_mod) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「이의제기」 · 「초대」 · 「연합」 · 「차단된 이메일 도메인」 · 「사용자명 규칙」 · 「IP 규칙들」 주소를 차례로 연다', async () => {
    await 관리.열기('/admin/disputes/appeals');
    const 화면1 = await verify('「이의제기」 화면에 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.isVisible(), true);
    await 관리.열기('/admin/invites');
    const 화면2 = await verify('「초대」 화면에 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.isVisible(), true);
    await 관리.열기('/admin/instances');
    const 화면3 = await verify('「연합」 화면에 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.isVisible(), true);
    await 관리.열기('/admin/email_domain_blocks');
    const 화면4 = await verify('「차단된 이메일 도메인」 화면에 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.isVisible(), true);
    await 관리.열기('/admin/username_blocks');
    const 화면5 = await verify('「사용자명 규칙」 화면에 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.isVisible(), true);
    await 관리.열기('/admin/ip_blocks');
    const 화면6 = await verify('「IP 규칙들」 화면에 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.isVisible(), true);
    await verify('Moderator 가 「이의제기」 · 「초대」 · 「연합」 · 「차단된 이메일 도메인」 · 「사용자명 규칙」 · 「IP 규칙들」 주소를 열면 화면마다 「이 페이지를 표시할 권한이 없습니다.」가 보인다', 화면1 && 화면2 && 화면3 && 화면4 && 화면5 && 화면6, true);
  });
});
