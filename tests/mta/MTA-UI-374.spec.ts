import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 뮤트시트 } from './pages/mute-sheet.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-374',
  name: '신고 이유 목록에 「마음에 안 듭니다」(「내가 보기 싫은 종류에 속합니다」) · 「스팸입니다」(「악성 링크, 반응 스팸, 또는 반복적인 답장」) · 「불법입니다」(「당신은 본인 혹은 서버가 속한 국가의 법률을 위반한다고 생각합니다.」) · 「다른 문제가 있습니다」(「이슈가 다른 분류에 속하지 않습니다」)가 보인다',
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
  const 시트 = new 뮤트시트(driver);
  const 신고 = new 신고화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('promo_lee 프로필을 연다', async () => {
    await 프로필열기(driver, 'promo_lee');
    await verify('promo_lee 프로필 화면이 보인다', await 시트.프로필떴나(), true, { blocker: true });
  });
  await test.step('promo_lee 프로필 메뉴에서 「Report account」를 누른다', async () => {
    await 신고.프로필에서열기();
    await verify('신고 이유 목록이 보인다', await 신고.글자보이나('마음에 안 듭니다', 15_000), true);
    const 제목들 = await 신고.제목글들();
    const 부제들 = await 신고.부제글들();
    const 마음1 = await verify('「마음에 안 듭니다」가 보인다', 제목들.includes('마음에 안 듭니다'), true);
    const 마음2 = await verify('「내가 보기 싫은 종류에 속합니다」가 보인다', 부제들.includes('내가 보기 싫은 종류에 속합니다'), true);
    const 스팸1 = await verify('「스팸입니다」가 보인다', 제목들.includes('스팸입니다'), true);
    const 스팸2 = await verify('「악성 링크, 반응 스팸, 또는 반복적인 답장」이 보인다', 부제들.includes('악성 링크, 반응 스팸, 또는 반복적인 답장'), true);
    const 불법1 = await verify('「불법입니다」가 보인다', 제목들.includes('불법입니다'), true);
    const 불법2 = await verify('「당신은 본인 혹은 서버가 속한 국가의 법률을 위반한다고 생각합니다.」가 보인다', 부제들.includes('당신은 본인 혹은 서버가 속한 국가의 법률을 위반한다고 생각합니다.'), true);
    const 기타1 = await verify('「다른 문제가 있습니다」가 보인다', 제목들.includes('다른 문제가 있습니다'), true);
    const 기타2 = await verify('「이슈가 다른 분류에 속하지 않습니다」가 보인다', 부제들.includes('이슈가 다른 분류에 속하지 않습니다'), true);
    await verify('신고 이유 목록에 「마음에 안 듭니다」(「내가 보기 싫은 종류에 속합니다」) · 「스팸입니다」(「악성 링크, 반응 스팸, 또는 반복적인 답장」) · 「불법입니다」(「당신은 본인 혹은 서버가 속한 국가의 법률을 위반한다고 생각합니다.」) · 「다른 문제가 있습니다」(「이슈가 다른 분류에 속하지 않습니다」)가 보인다', 마음1 && 마음2 && 스팸1 && 스팸2 && 불법1 && 불법2 && 기타1 && 기타2, true);
  }, { capture: true });
});
