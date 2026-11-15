import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정신고열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-374',
  name: '신고 이유 목록에 「마음에 안 듭니다」 · 「스팸입니다」 · 「불법입니다」 · 「다른 문제가 있습니다」와 각 부제가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    이유1: z.string().describe('신고 이유').default('마음에 안 듭니다'),
    부제1: z.string().describe('신고 이유 부제').default('내가 보기 싫은 종류에 속합니다'),
    이유2: z.string().describe('신고 이유').default('스팸입니다'),
    부제2: z.string().describe('신고 이유 부제').default('악성 링크, 반응 스팸, 또는 반복적인 답장'),
    이유3: z.string().describe('신고 이유').default('불법입니다'),
    부제3: z.string().describe('신고 이유 부제').default('당신은 본인 혹은 서버가 속한 국가의 법률을 위반한다고 생각합니다.'),
    이유4: z.string().describe('신고 이유').default('다른 문제가 있습니다'),
    부제4: z.string().describe('신고 이유 부제').default('이슈가 다른 분류에 속하지 않습니다'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 신고 = new 신고화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('신고 첫 화면의 이유 목록을 확인한다', async () => {
    await verify('계정 신고 첫 화면이 열린다', await 계정신고열기(driver, 'cafe_moon'), true, { blocker: true });
    const 이유1 = await verify('신고 이유 목록에 「마음에 안 듭니다」가 보인다', await 뜰때까지(driver, 신고.이유(expected.이유1), 10_000), true);
    const 부제1 = await verify('신고 이유 「마음에 안 듭니다」의 부제가 보인다', await 뜰때까지(driver, 신고.이유(expected.부제1), 10_000), true);
    const 이유2 = await verify('신고 이유 목록에 「스팸입니다」가 보인다', await 뜰때까지(driver, 신고.이유(expected.이유2), 10_000), true);
    const 부제2 = await verify('신고 이유 「스팸입니다」의 부제가 보인다', await 뜰때까지(driver, 신고.이유(expected.부제2), 10_000), true);
    const 이유3 = await verify('신고 이유 목록에 「불법입니다」가 보인다', await 뜰때까지(driver, 신고.이유(expected.이유3), 10_000), true);
    const 부제3 = await verify('신고 이유 「불법입니다」의 부제가 보인다', await 뜰때까지(driver, 신고.이유(expected.부제3), 10_000), true);
    const 이유4 = await verify('신고 이유 목록에 「다른 문제가 있습니다」가 보인다', await 뜰때까지(driver, 신고.이유(expected.이유4), 10_000), true);
    const 부제4 = await verify('신고 이유 「다른 문제가 있습니다」의 부제가 보인다', await 뜰때까지(driver, 신고.이유(expected.부제4), 10_000), true);
    await verify('신고 이유 목록에 「마음에 안 듭니다」 · 「스팸입니다」 · 「불법입니다」 · 「다른 문제가 있습니다」와 각 부제가 보인다', 이유1 && 부제1 && 이유2 && 부제2 && 이유3 && 부제3 && 이유4 && 부제4, true);
  });
});
