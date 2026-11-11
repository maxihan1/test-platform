import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공지사항폼화면 } from './pages/announcement-form.page.js';
import { 공지사항화면 } from './pages/announcements.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-279',
  name: '새 공지사항 폼에 「이벤트 시작」 · 「이벤트 종료」 · 「종일 일정」 · 「공지사항」 · 「발행 일정」 · 「공지사항 생성」이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 공지 = new 공지사항화면(page);
  const 폼 = new 공지사항폼화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「공지사항」 화면에서 「새 공지사항」을 누른다', async () => {
    await 공지.열기();
    await 공지.새공지.click();
    await 폼.새폼제목.waitFor();
    const 시작 = await verify('「이벤트 시작」이 보인다', await 폼.이벤트시작.isVisible(), true);
    const 종료 = await verify('「이벤트 종료」가 보인다', await 폼.이벤트종료.isVisible(), true);
    const 종일 = await verify('「종일 일정」이 보인다', await 폼.종일일정.isVisible(), true);
    const 본문 = await verify('「공지사항」 칸이 보인다', await 폼.본문칸.waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    const 일정 = await verify('「발행 일정」이 보인다', await 폼.발행일정.isVisible(), true);
    const 생성 = await verify('「공지사항 생성」이 보인다', await 폼.생성.isVisible(), true);
    await verify('새 공지사항 폼에 「이벤트 시작」 · 「이벤트 종료」 · 「종일 일정」 · 「공지사항」 · 「발행 일정」 · 「공지사항 생성」이 보인다', 시작 && 종료 && 종일 && 본문 && 일정 && 생성, true);
  });
});
