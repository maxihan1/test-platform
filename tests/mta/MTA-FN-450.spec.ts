import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정신고열기, 신고의견칸까지 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-450',
  name: '신고 의견 쓰기에서 「다음」을 누르면 완료 화면에 「신고됨」 · 「신고해주셔서 감사합니다. 저희 중재팀이 확인할 예정입니다.」 · 「완료」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    신고됨글: z.string().describe('신고 완료 화면 글').default('신고됨'),
    감사글: z.string().describe('신고 완료 화면 글').default('신고해주셔서 감사합니다. 저희 중재팀이 확인할 예정입니다.'),
    완료글: z.string().describe('신고 완료 화면 단추 글').default('완료'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 신고 = new 신고화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('프로필 메뉴에서 「Report account」를 눌러 신고 첫 화면을 연다', async () => {
    await verify('계정 신고 첫 화면이 열린다', await 계정신고열기(driver, 'qa_blank'), true, { blocker: true });
  });
  await test.step('qa_blank 를 「스팸입니다」로 신고하고 의견 쓰기에서 「다음」을 누른다', async () => {
    await verify('신고 의견 쓰기 화면이 열린다', await 신고의견칸까지(driver, '스팸입니다'), true, { blocker: true });
    await 신고.다음누르기();
    const 신고됨 = await verify('완료 화면에 「신고됨」이 보인다', await 뜰때까지(driver, 신고.화면글(expected.신고됨글), 20_000), true);
    const 감사 = await verify('완료 화면에 「신고해주셔서 감사합니다. 저희 중재팀이 확인할 예정입니다.」가 보인다', await 뜰때까지(driver, 신고.화면글(expected.감사글), 10_000), true);
    const 완료 = await verify('완료 화면에 「완료」가 보인다', await 뜰때까지(driver, 신고.화면글정확히(expected.완료글), 10_000), true);
    await verify('신고 의견 쓰기에서 「다음」을 누르면 완료 화면에 「신고됨」 · 「신고해주셔서 감사합니다. 저희 중재팀이 확인할 예정입니다.」 · 「완료」가 보인다', 신고됨 && 감사 && 완료, true);
  });
});
