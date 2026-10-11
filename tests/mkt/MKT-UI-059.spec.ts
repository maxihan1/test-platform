import { defineCase, test, verify } from '@platform/kit';

import { 상자, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-059',
  name: '홈 탭 위에 「타임세일 종료까지 HH:MM:SS」 꼴 카운트다운이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 홈.시계.filter({ hasText: /\d\d:\d\d:\d\d/ }).waitFor();
    const 글 = (await 홈.카운트다운.innerText()).replace(/\d{2}:\d{2}:\d{2}/, 'HH:MM:SS').replace(/\s+/g, ' ').trim();
    const 카운트 = await 상자(홈.카운트다운);
    await verify(
      '홈 탭 위에 「타임세일 종료까지 HH:MM:SS」 꼴 카운트다운이 보인다',
      { 글, 탭위: 카운트.y + 카운트.height <= (await 상자(홈.글탭목록)).y },
      { 글: '타임세일 종료까지 HH:MM:SS', 탭위: true },
    );
  });
});
