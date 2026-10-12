import { defineCase, test, verify } from '@platform/kit';

import { 안내화면 } from './components/notice-screen.component.js';
import { 글쓴이정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-149',
  name: '다른 회원 글의 수정 주소를 열면 「권한이 없습니다」 화면이 보인다',
  precondition: ['회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 안내 = new 안내화면(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
    });

    await test.step('로그인했는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
    });

    await test.step('다른 회원 글의 수정 주소를 연다', async () => {
      await 쓰기.수정열기(1);
      await 쓰기.제목칸.or(안내.제목글('권한이 없습니다')).first().waitFor();
      await verify('다른 회원 글의 수정 주소를 열면 「권한이 없습니다」 화면이 보인다', await 안내.제목글('권한이 없습니다').isVisible(), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
