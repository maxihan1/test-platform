import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 메뉴 } from './components/menu.component.js';
import { 글카드 } from './components/status-card.component.js';
import { 뒤로 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-148',
  name: '「부스트」를 길게 누르면 「부스트」(또는 「부스트 실행 취소」) · 「부스터 보기」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  const 팝업 = new 메뉴(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈 글 카드 「부스트」를 길게 누른다', async () => {
    await 카드.첫글버튼길게('boost_btn');
    const 항목들 = await 팝업.항목글자();
    const 부스트 = await verify('길게 누른 메뉴에 「부스트」(또는 「부스트 실행 취소」)가 보인다', 항목들.includes('부스트') || 항목들.includes('부스트 실행 취소'), true);
    const 부스터 = await verify('길게 누른 메뉴에 「부스터 보기」가 보인다', 항목들.includes('부스터 보기'), true);
    await verify('「부스트」를 길게 누르면 「부스트」(또는 「부스트 실행 취소」) · 「부스터 보기」가 보인다', 부스트 && 부스터, true);
    await 뒤로(driver);
  }, { capture: true });
});
