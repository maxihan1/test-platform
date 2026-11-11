import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-458',
  name: 'Moderator 가 대시보드에서 「N개의 대기 중인 이의 제기」를 누르면 「이 페이지를 표시할 권한이 없습니다.」가 보인다',
  precondition: ['Moderator(qa_mod) 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    modId: z.string().describe('중재자 아이디').optional().meta({ secret: true, account: '중재자' }),
    modPassword: z.string().describe('중재자 비밀번호').optional().meta({ secret: true, account: '중재자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 프로필 = new 공개프로필화면(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('Moderator 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.modId, params.modPassword);
    await 프로필.열기();
    await verify('Moderator(qa_mod) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('대시보드에서 「N개의 대기 중인 이의 제기」를 누른다', async () => {
    await 대시보드.열기();
    await 관리.누르기(대시보드.대기이의제기);
    await verify('Moderator 가 대시보드에서 「N개의 대기 중인 이의 제기」를 누르면 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
  });
});
