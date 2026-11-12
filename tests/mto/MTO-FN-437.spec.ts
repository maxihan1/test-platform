import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 공지정리, 공지즉시발행 } from './helpers/settings-data.helper.js';
import { 공지사항화면 } from './pages/announcements.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-437',
  name: '설정 관리 권한이 없는 역할이 공지 목록을 열면 그 역할이 발행한 게시 중 공지 줄에 「사용자들에게 알리기」가 보이지 않는다',
  precondition: ['공지 관리만 가진 역할 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    roleId: z.string().describe('공지 관리만 가진 역할 아이디').optional().meta({ secret: true, account: '공지 관리만 가진 역할' }),
    rolePassword: z.string().describe('공지 관리만 가진 역할 비밀번호').optional().meta({ secret: true, account: '공지 관리만 가진 역할' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 공지 = new 공지사항화면(page);

  await test.step('공지 관리만 가진 역할 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.roleId, params.rolePassword);
    await 프로필.열기();
    await verify('공지 관리만 가진 역할 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  const 글 = `MTO 공지 ${고유이름('n')}`;
  try {
    await test.step('그 역할로 공지를 즉시 발행한다', async () => {
      await 공지즉시발행(page, 글);
    });
    await test.step('그 역할로 즉시 발행한 공지가 있는 「공지사항」 화면을 연다', async () => {
      await 공지.열기();
      await verify('그 역할로 즉시 발행한 공지가 게시 중이다', await 공지.게시취소(글).count(), 1, { blocker: true });
      await verify('설정 관리 권한이 없는 역할이 공지 목록을 열면 그 역할이 발행한 게시 중 공지 줄에 「사용자들에게 알리기」가 보이지 않는다', await 공지.알리기(글).isVisible(), false);
    });
  } finally {
    await 공지정리(page, 글);
  }
});
