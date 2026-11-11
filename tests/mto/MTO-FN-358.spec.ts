import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 확인창받기 } from './helpers/dialog.helper.js';
import { 공지정리, 공지즉시발행 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공지사항화면 } from './pages/announcements.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-358',
  name: '공지를 「게시 취소」하면 「공지가 성공적으로 발행 취소되었습니다!」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 즉시 발행한 공지가 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 공지 = new 공지사항화면(page);
  const 글 = 고유이름('mto');

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('케이스 공지를 즉시 발행한다', async () => {
      await 공지즉시발행(page, 글);
    });

    await test.step('케이스가 즉시 발행한 공지가 있는지 확인한다', async () => {
      await 공지.열기();
      await verify('케이스가 즉시 발행한 공지가 있다', await 공지.공지줄(글).count(), 1, { blocker: true });
    });

    await test.step('그 공지의 「게시 취소」를 누르고 확인한다', async () => {
      const 창 = 확인창받기(page, '확인');
      await 공지.게시취소(글).click();
      await 창;
      const 보인다 = await 공지.알림.글('공지가 성공적으로 발행 취소되었습니다!').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('공지를 「게시 취소」하면 「공지가 성공적으로 발행 취소되었습니다!」가 보인다', 보인다, true);
    });
  } finally {
    await 공지정리(page, 글);
  }
});
