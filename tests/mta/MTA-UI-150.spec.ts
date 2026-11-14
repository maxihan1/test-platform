import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 메뉴 } from './components/menu.component.js';
import { 글카드 } from './components/status-card.component.js';
import { 뒤로 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-150',
  name: '「좋아요」를 길게 누르면 「좋아요」(취소는 「즐겨찾기 실행 취소」) · 「보관」(해제는 「북마크 삭제」) · 「즐겨찾기 보기」가 보인다',
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
  await test.step('홈 글 카드 「좋아요」를 길게 누른다', async () => {
    await 카드.첫글버튼길게('favorite_btn');
    const 항목들 = await 팝업.항목글자();
    const 좋아요 = await verify('길게 누른 메뉴에 「좋아요」(취소는 「즐겨찾기 실행 취소」)가 보인다', 항목들.includes('좋아요') || 항목들.includes('즐겨찾기 실행 취소'), true);
    const 보관 = await verify('길게 누른 메뉴에 「보관」(해제는 「북마크 삭제」)이 보인다', 항목들.includes('보관') || 항목들.includes('북마크 삭제'), true);
    const 보기 = await verify('길게 누른 메뉴에 「즐겨찾기 보기」가 보인다', 항목들.includes('즐겨찾기 보기'), true);
    await verify('「좋아요」를 길게 누르면 「좋아요」(취소는 「즐겨찾기 실행 취소」) · 「보관」(해제는 「북마크 삭제」) · 「즐겨찾기 보기」가 보인다', 좋아요 && 보관 && 보기, true);
    await 뒤로(driver);
  }, { capture: true });
});
