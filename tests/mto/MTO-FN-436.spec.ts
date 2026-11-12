import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 공지정리 } from './helpers/settings-data.helper.js';
import { 공지사항폼화면 } from './pages/announcement-form.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-436',
  name: '공지 관리 권한만 가진 역할이 공지를 즉시 발행하면 「공지사항이 성공적으로 발행되었습니다!」가 보인다',
  precondition: ['공지 관리만 가진 역할 계정으로 로그인해 있다'],
  params: z.object({
    roleId: z.string().describe('공지 관리만 가진 역할 아이디').optional().meta({ secret: true, account: '공지 관리만 가진 역할' }),
    rolePassword: z.string().describe('공지 관리만 가진 역할 비밀번호').optional().meta({ secret: true, account: '공지 관리만 가진 역할' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 폼 = new 공지사항폼화면(page);

  await test.step('공지 관리만 가진 역할 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.roleId, params.rolePassword);
    await 프로필.열기();
    await verify('공지 관리만 가진 역할 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  const 글 = `MTO 공지 ${고유이름('n')}`;
  try {
    await test.step('새 공지사항 폼에 글을 적고 「공지사항 생성」을 누른다', async () => {
      await 폼.즉시발행하기(글);
      const 보인다 = await 폼.알림.글('공지사항이 성공적으로 발행되었습니다!').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('공지 관리 권한만 가진 역할이 공지를 즉시 발행하면 「공지사항이 성공적으로 발행되었습니다!」가 보인다', 보인다, true);
    });
  } finally {
    await 공지정리(page, 글);
  }
});
