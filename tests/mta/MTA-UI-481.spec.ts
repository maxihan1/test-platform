import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 메뉴 } from './components/menu.component.js';
import { 컬렉션화면 } from './pages/collection.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-481',
  name: '컬렉션 메뉴에 「공유」 · 「브라우저에서 열기」 · 「Report collection」 · 「Block account」가 있다',
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
  const 프로필 = new 프로필화면(driver);
  const 컬렉션 = new 컬렉션화면(driver);
  const 팝업 = new 메뉴(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('내 컬렉션 「좋아하는 사진가」 메뉴를 연다', async () => {
    await 프로필.내프로필열기();
    await 프로필.탭누르기('추천');
    await 컬렉션.열기('좋아하는 사진가');
    await 컬렉션.더보기누르기();
    const 항목 = await 팝업.항목글자();
    const 판정1 = await verify('컬렉션 메뉴에 「공유」가 보인다', 항목.includes('공유'), true);
    const 판정2 = await verify('컬렉션 메뉴에 「브라우저에서 열기」가 보인다', 항목.includes('브라우저에서 열기'), true);
    const 판정3 = await verify('컬렉션 메뉴에 「Report collection」이 보인다', 항목.includes('Report collection'), true);
    const 판정4 = await verify('컬렉션 메뉴에 「Block account」가 보인다', 항목.includes('Block account'), true);
    await verify('컬렉션 메뉴에 「공유」 · 「브라우저에서 열기」 · 「Report collection」 · 「Block account」가 있다', 판정1 && 판정2 && 판정3 && 판정4, true);
  }, { capture: true });
});
