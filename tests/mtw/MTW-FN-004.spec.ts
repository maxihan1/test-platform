import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 펼침메뉴 } from './components/dropdown.component.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-004',
  name: '관리자로 홈을 열면 웹 앱 메뉴에 관리 링크가 보인다',
  precondition: ['관리자로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 펼침 = new 펼침메뉴(page);

  await test.step('관리자로 로그인하고 홈이 열렸는지 확인한다', async () => {
    await 로그인하기(page, params.adminId, params.adminPassword);
    await 홈.열기();
    await verify('오른쪽 메뉴에 「더 보기」가 보인다', await 홈.메뉴.더보기.isVisible(), true, { blocker: true });
  });

  await test.step('관리자로 홈을 연다', async () => {
    await 홈.메뉴.더보기.click();
    await 펼침.열릴때까지();
    await verify('관리자로 홈을 열면 웹 앱 메뉴에 관리 링크가 보인다', await 펼침.항목('관리').isVisible(), true);
  });
});
