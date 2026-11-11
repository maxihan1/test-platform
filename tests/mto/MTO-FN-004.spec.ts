import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-004',
  name: 'Moderator 가 「신고」 · 「계정」 · 「해시태그」 · 「유행하는 게시물」 · 「감사 로그」 주소를 열면 화면마다 제목이 보인다',
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
  await test.step('「신고」 · 「계정」 · 「해시태그」 · 「유행하는 게시물」 · 「감사 로그」 주소를 차례로 연다', async () => {
    await 관리.열기('/admin/reports');
    const 화면1 = await verify('「신고」 화면에 제목이 보인다', await 관리.제목이('신고').isVisible(), true);
    await 관리.열기('/admin/accounts');
    const 화면2 = await verify('「계정」 화면에 제목이 보인다', await 관리.제목이('계정').isVisible(), true);
    await 관리.열기('/admin/tags');
    const 화면3 = await verify('「해시태그」 화면에 제목이 보인다', await 관리.제목이('해시태그').isVisible(), true);
    await 관리.열기('/admin/trends/statuses');
    const 화면4 = await verify('「유행하는 게시물」 화면에 제목이 보인다', await 관리.제목이('유행하는 게시물').isVisible(), true);
    await 관리.열기('/admin/action_logs');
    const 화면5 = await verify('「감사 로그」 화면에 제목이 보인다', await 관리.제목이('감사 로그').isVisible(), true);
    await verify('Moderator 가 「신고」 · 「계정」 · 「해시태그」 · 「유행하는 게시물」 · 「감사 로그」 주소를 열면 화면마다 제목이 보인다', 화면1 && 화면2 && 화면3 && 화면4 && 화면5, true);
  });
});
