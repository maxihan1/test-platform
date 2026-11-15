import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글카드 } from './pages/post-card.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-166',
  name: '인용 제거를 누르면 「게시물을 삭제하시겠습니까?」 · 「이 작업은 되돌릴 수 없습니다.」 · 「게시물 삭제」 확인 창이 뜬다',
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

  await test.step('jiho_cafe 인용 글 더보기에서 인용 제거를 누른다', async () => {
    await 프로필열기(driver, 'jiho_cafe');
    await verify('인용 글 더보기에 인용 제거 항목이 보인다', await 카드.더보기메뉴에서찾기('지호의 게시물에서 나의 게시물을 제거합니다'), true, { blocker: true });
    await driver.$(카드.메뉴.항목포함('지호의 게시물에서 나의 게시물을 제거합니다')).click();
    const 제목 = await verify('「게시물을 삭제하시겠습니까?」가 보인다', await 뜰때까지(driver, 창.안의글자('게시물을 삭제하시겠습니까?'), 10_000), true);
    const 안내 = await verify('「이 작업은 되돌릴 수 없습니다.」가 보인다', await 뜰때까지(driver, 창.안의글자('이 작업은 되돌릴 수 없습니다.'), 10_000), true);
    const 확인 = await verify('「게시물 삭제」 버튼이 보인다', await driver.$(창.확인버튼).getText(), '게시물 삭제');
    await verify('인용 제거를 누르면 「게시물을 삭제하시겠습니까?」 · 「이 작업은 되돌릴 수 없습니다.」 · 「게시물 삭제」 확인 창이 뜬다', 제목 && 안내 && 확인, true);
    await 창.취소();
  });
});
