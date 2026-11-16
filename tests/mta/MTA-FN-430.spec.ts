import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글 } from './helpers/post.helper.js';
import { 목록만들기, 목록지우기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록화면 } from './pages/lists.page.js';
import { 확인창 } from './components/dialog.component.js';

export const spec = defineCase({
  tcId: 'MTA-FN-430',
  name: '목록 삭제를 누르면 「삭제」 확인 창에 「삭제」 · 「취소」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    삭제글: z.string().describe('삭제 확인 창 단추 글').default('삭제'),
    취소글: z.string().describe('삭제 확인 창 단추 글').default('취소'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 목록 = new 목록화면(driver);
  const 창 = new 확인창(driver);
  const 이름 = 표시글('목록');
  try {
    await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });
    await test.step('새 목록 하나를 만든다', async () => {
      await verify('새 목록이 만들어진다', await 목록만들기(driver, 이름), true, { blocker: true });
    });
    await test.step('새 목록 메뉴에서 「리스트 삭제」를 누른다', async () => {
      await 홈.목록고르기(이름);
      await 뜰때까지(driver, 홈.목록관리, 15_000);
      await driver.$(홈.목록관리).click();
      await verify('목록 편집 화면이 열린다', await 목록.편집그려질때까지(), true, { blocker: true });
      await driver.$(목록.편집더보기).click();
      await 홈.메뉴.고르기('리스트 삭제');
      await verify('삭제 확인 창이 뜬다', await 창.뜰때까지(), true, { blocker: true });
      const 삭제 = await verify('삭제 확인 창에 「삭제」가 보인다', await driver.$(창.확인버튼).getText(), expected.삭제글);
      const 취소 = await verify('삭제 확인 창에 「취소」가 보인다', await driver.$(창.취소버튼).getText(), expected.취소글);
      await verify('목록 삭제를 누르면 「삭제」 확인 창에 「삭제」 · 「취소」가 보인다', 삭제 && 취소, true);
      await 창.취소();
    });
  } finally {
    await 목록지우기(driver, 이름);
  }
});
