import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공지사항화면 } from './pages/announcements.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-278',
  name: '공지 목록의 게시 중 공지 줄에 「게시 취소」 · 「삭제」 · 「사용자들에게 알리기」가 보이고 초안 공지 줄에 「게시」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '게시 중 공지와 초안 공지가 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 공지 = new 공지사항화면(page);
  const 게시글 = '시험 서버 공지';
  const 초안글 = '다음 점검 안내';

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('게시 중 공지와 초안 공지가 있는지 확인한다', async () => {
    await 공지.열기();
    const 개수 = (await 공지.공지줄(게시글).count()) + (await 공지.공지줄(초안글).count());
    await verify('게시 중 공지와 초안 공지가 있다', 개수, 2, { blocker: true });
  });

  await test.step('「공지사항」 화면을 연다', async () => {
    await 공지.열기();
    const 취소 = await verify('게시 중 공지 줄에 「게시 취소」가 보인다', await 공지.게시취소(게시글).isVisible(), true);
    const 삭제 = await verify('게시 중 공지 줄에 「삭제」가 보인다', await 공지.삭제(게시글).isVisible(), true);
    const 알림 = await verify('게시 중 공지 줄에 「사용자들에게 알리기」가 보인다', await 공지.알리기(게시글).isVisible(), true);
    const 게시 = await verify('초안 공지 줄에 「게시」가 보인다', await 공지.게시(초안글).isVisible(), true);
    await verify('공지 목록의 게시 중 공지 줄에 「게시 취소」 · 「삭제」 · 「사용자들에게 알리기」가 보이고 초안 공지 줄에 「게시」가 보인다', 취소 && 삭제 && 알림 && 게시, true);
  });
});
