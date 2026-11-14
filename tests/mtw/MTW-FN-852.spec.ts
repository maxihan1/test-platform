import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 펼침메뉴 } from './components/dropdown.component.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-852',
  name: '일반 회원이 「더 보기」를 누르면 「중재」 · 「관리」가 보이지 않는다',
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 펼침 = new 펼침메뉴(page);

  await test.step('일반 회원으로 로그인하고 홈이 열렸는지 확인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('오른쪽 메뉴에 「더 보기」가 보인다', await 홈.메뉴.더보기.isVisible(), true, { blocker: true });
  });

  await test.step('일반 회원으로 홈에서 「더 보기」를 누른다', async () => {
    await 홈.메뉴.더보기.click();
    await 펼침.항목('로그아웃').waitFor();
    const 중재 = await verify('「중재」가 없다', await 펼침.항목('중재').count(), 0);
    const 관리 = await verify('「관리」가 없다', await 펼침.항목('관리').count(), 0);
    await verify('일반 회원이 「더 보기」를 누르면 「중재」 · 「관리」가 보이지 않는다', 중재 && 관리, true);
  });
});
