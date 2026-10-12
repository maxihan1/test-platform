import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-368',
  name: '본문 칸에 2000자를 넣으면 2000자가 다 들어간다',
  precondition: ['회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인해 글쓰기 화면을 연다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      await 쓰기.열기();
    });

    await test.step('글쓰기 화면이 열렸는지 확인한다', async () => {
      await 쓰기.준비될때까지();
      await verify('회원으로 로그인해 글쓰기 화면을 열어 두었다', (await 로그인해있나(page.request)) && (await 쓰기.제목.isVisible()), true, { blocker: true });
    });

    await test.step('글쓰기 본문 칸에 2000자를 넣는다', async () => {
      await 쓰기.본문칸.fill('가'.repeat(2000));
      await verify('본문 칸에 2000자를 넣으면 2000자가 다 들어간다', (await 쓰기.본문칸.inputValue()).length, 2000);
    });

    await test.step('글쓰기 본문 칸에 2001자를 넣는다', async () => {
      await 쓰기.본문칸.fill('가'.repeat(2001));
      await verify('본문 칸에 2001자를 넣으면 2000자까지만 들어간다', (await 쓰기.본문칸.inputValue()).length, 2000);
    });
  } finally {
    await 정리.모두하기();
  }
});
