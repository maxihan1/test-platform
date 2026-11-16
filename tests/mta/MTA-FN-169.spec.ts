import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-169',
  name: '팔로잉이 1명 이상이고 나를 팔로우하지 않는 사람 글에 「답장」을 누르면 「안녕하세요, 새로운 연결!」 시트와 「알겠습니다」 · 「다시 알리지 않습니다」가 뜬다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  techniques: ['경계값 분석'],
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

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('팔로잉 1명 이상이고 나를 팔로우하지 않는 사람 글에 「답장」을 누른다', async () => {
    await 글상세열기(driver, 'seoyeon_books', '가을엔 역시 독서');
    await verify('글 상세가 열린다', await 글상세.그려질때까지(), true, { blocker: true });
    await driver.$(글상세.답장).click();
    const 시트 = await verify('「안녕하세요, 새로운 연결!」 시트가 보인다', await 뜰때까지(driver, 글상세.전체글자포함('안녕하세요, 새로운 연결!'), 10_000), true);
    const 알겠습니다 = await verify('「알겠습니다」가 보인다', await 뜰때까지(driver, 글상세.전체글자포함('알겠습니다'), 10_000), true);
    const 다시 = await verify('「다시 알리지 않습니다」가 보인다', await 뜰때까지(driver, 글상세.전체글자포함('다시 알리지 않습니다'), 10_000), true);
    await verify('팔로잉이 1명 이상이고 나를 팔로우하지 않는 사람 글에 「답장」을 누르면 「안녕하세요, 새로운 연결!」 시트와 「알겠습니다」 · 「다시 알리지 않습니다」가 뜬다', 시트 && 알겠습니다 && 다시, true);
  });
});
