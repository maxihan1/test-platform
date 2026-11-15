import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글카드 } from './pages/post-card.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-498',
  name: '승인 대기 인용 카드에 「게시 대기중」이 보이고 누르면 설명 창과 「알겠습니다」가 뜬다',
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
  const 카드 = new 글카드(driver);
  const 창 = new 확인창(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('hana_photo 의 승인 대기 인용 카드에서 「게시 대기중」을 누른다', async () => {
    await 프로필열기(driver, 'hana_photo');
    const 대기중 = await verify('「게시 대기중」이 보인다', await 카드.글자가보일때까지('게시 대기중'), true);
    await driver.$(카드.굴려서글자포함('게시 대기중')).click();
    const 설명창 = await verify('설명 창이 뜬다', await 창.뜰때까지(), true);
    const 알겠습니다 = await verify('「알겠습니다」가 보인다', await driver.$(창.확인버튼).getText(), '알겠습니다');
    await verify('승인 대기 인용 카드에 「게시 대기중」이 보이고 누르면 설명 창과 「알겠습니다」가 뜬다', 대기중 && 설명창 && 알겠습니다, true);
  });
});
