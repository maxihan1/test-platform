import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 공지정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공지사항폼화면 } from './pages/announcement-form.page.js';
import { 공지사항화면 } from './pages/announcements.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-506',
  name: '「이벤트 시작」만 적고 공지를 만들면 저장되지 않고 오류가 보인다',
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
  const 글 = 고유이름('mto');

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('「이벤트 시작」만 적고 「공지사항 생성」을 누른다', async () => {
      await 폼.새폼열기();
      await 폼.본문칸.fill(글);
      await 폼.이벤트시작.fill(폼.일정글(new Date(Date.now() + 24 * 60 * 60 * 1000)));
      await 폼.생성.click();
      const 오류 = await verify('오류가 보인다', (await 폼.종료칸검증메시지()) !== '', true);
      await 공지.열기();
      await 공지.새공지.waitFor();
      const 안저장 = await verify('저장되지 않는다', await 공지.공지줄(글).count(), 0);
      await verify('「이벤트 시작」만 적고 공지를 만들면 저장되지 않고 오류가 보인다', 안저장 && 오류, true);
    });
  } finally {
    await 공지정리(page, 글);
  }
});
