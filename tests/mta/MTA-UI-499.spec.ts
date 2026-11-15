import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세열기 } from './helpers/nav.helper.js';
import { 부스트시트 } from './pages/boost-sheet.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-499',
  name: '인용 승인제 글의 부스트 시트에 「인용 요청」 · 「작성자가 수동으로 검토할 것입니다.」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글상세 = new 글상세화면(driver);
  const 시트 = new 부스트시트(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('minjun_dev 의 인용 「승인 필요」 글에서 「부스트」를 누른다', async () => {
    await 글상세열기(driver, 'minjun_dev', '이 글을 인용하려면 제 승인이 필요해요');
    await driver.$(글상세.부스트).click();
    const 요청 = await verify('「인용 요청」이 보인다', await 시트.글자가뜰때까지('인용 요청'), true);
    const 검토 = await verify('「작성자가 수동으로 검토할 것입니다.」가 보인다', await 시트.글자가뜰때까지('작성자가 수동으로 검토할 것입니다.'), true);
    await verify('인용 승인제 글의 부스트 시트에 「인용 요청」 · 「작성자가 수동으로 검토할 것입니다.」가 보인다', 요청 && 검토, true);
    await 시트.닫기();
  });
});
