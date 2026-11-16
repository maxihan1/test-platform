import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 해시태그관리열기 } from './helpers/hashtag-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 해시태그관리화면 } from './pages/hashtag-manage.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-301',
  name: '해시태그 관리에서 해제 버튼을 누르면 「님을 언팔로우 할까요?」 창에 「팔로우 해제」 · 「취소」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다', '팔로우 중인 해시태그가 하나 이상 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    묻는글: z.string().describe('해제 확인 창 제목에 보이는 글').default('님을 언팔로우 할까요?'),
    해제글: z.string().describe('확인 창의 해제 버튼 글').default('팔로우 해제'),
    취소글: z.string().describe('확인 창의 취소 버튼 글').default('취소'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 관리 = new 해시태그관리화면(driver);
  const 창 = new 확인창(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('해시태그 관리 화면을 연다', async () => {
    await verify('해시태그 관리 화면에 줄이 그려진다', await 해시태그관리열기(driver), true, { blocker: true });
  });

  try {
    await test.step('해시태그 관리에서 해제 버튼을 누른다', async () => {
      await 관리.첫해제버튼누르기();
      await verify('해제 메뉴 항목이 뜬다', await 뜰때까지(driver, 관리.해제메뉴항목, 10_000), true, { blocker: true });
      await driver.$(관리.해제메뉴항목).click();
      await verify('해제 확인 창이 뜬다', await 창.뜰때까지(), true, { blocker: true });
    });

    await test.step('해제 확인 창의 제목과 버튼을 확인한다', async () => {
      const 제목 = await verify('창 제목에 「님을 언팔로우 할까요?」가 보인다', (await driver.$(창.제목).getText()).includes(expected.묻는글), true);
      const 해제 = await verify('창에 「팔로우 해제」가 보인다', await driver.$(창.확인버튼).getText(), expected.해제글);
      const 취소 = await verify('창에 「취소」가 보인다', await driver.$(창.취소버튼).getText(), expected.취소글);
      await verify('해시태그 관리에서 해제 버튼을 누르면 「님을 언팔로우 할까요?」 창에 「팔로우 해제」 · 「취소」가 보인다', 제목 && 해제 && 취소, true);
    });
  } finally {
    if (await 보이나(driver, 창.취소버튼)) await 창.취소();
  }
});
