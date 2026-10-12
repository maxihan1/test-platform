import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 글쓴이정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 경로 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-115',
  name: '빈 글쓰기에서 「등록」을 누르면 「분류를 선택하세요」가 보이고 글쓰기 화면에 머문다',
  precondition: ['회원으로 로그인해 있다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 알림 = new 토스트(page);
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

    await test.step('글쓰기에서 모든 칸을 비우고 「등록」을 누른다', async () => {
      await 쓰기.등록하고응답받기();
      await 알림.글('분류를 선택하세요').first().waitFor();
      await verify(
        '빈 글쓰기에서 「등록」을 누르면 「분류를 선택하세요」가 보이고 글쓰기 화면에 머문다',
        { 안내: await 알림.글('분류를 선택하세요').first().isVisible(), 화면: 경로(page) },
        { 안내: true, 화면: 글쓰기화면.주소 },
      );
    });
  } finally {
    await 정리.모두하기();
  }
});
