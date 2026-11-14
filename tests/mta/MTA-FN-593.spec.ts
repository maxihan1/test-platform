import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 메뉴 } from './components/menu.component.js';
import { 글카드 } from './components/status-card.component.js';
import { 글자들, 뒤로, 뜰때까지, 프로필열기 } from './helpers/app.helper.js';
import { 누르기, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-593',
  name: '표시 이름이 20자면 더보기 항목 이름을 줄이지 않는다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  held: '보류 — 표시 이름이 20자 · 21자인 계정',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    이십자계정: z.string().describe('표시 이름이 20자인 계정 이름'),
    이십일자계정: z.string().describe('표시 이름이 21자인 계정 이름'),
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
  await test.step('표시 이름이 20자인 사람 글의 더보기를 연다', async () => {
    await 프로필열기(driver, params.이십자계정);
    await 뜰때까지(driver, 카드.이름들);
    const 이름 = (await 글자들(driver, 카드.이름들))[0] ?? '';
    await 누르기(driver, 카드.더보기들);
    const 항목들 = await 팝업.항목글자();
    await verify('표시 이름이 20자면 더보기 항목 이름을 줄이지 않는다', 항목들.some((항목) => 항목.endsWith(' 뮤트') && 항목.slice(0, -' 뮤트'.length) === 이름), true);
    await 뒤로(driver);
  });
  await 탭줄로돌아오기(driver);
  await test.step('표시 이름이 21자인 사람 글의 더보기를 연다', async () => {
    await 프로필열기(driver, params.이십일자계정);
    await 뜰때까지(driver, 카드.이름들);
    const 이름 = (await 글자들(driver, 카드.이름들))[0] ?? '';
    await 누르기(driver, 카드.더보기들);
    const 항목들 = await 팝업.항목글자();
    await verify('표시 이름 21자에서는 더보기 항목 이름을 15자 뒤 「…」로 줄인다', 항목들.some((항목) => 항목.endsWith(' 뮤트') && 항목.slice(0, -' 뮤트'.length) === 이름.slice(0, 15) + '…'), true);
    await 뒤로(driver);
  }, { capture: true });
});
