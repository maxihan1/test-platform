import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 글쓴이정리하기, 로그인해있나, 본문글, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-293',
  name: '제목 1자로 등록하면 토스트 「제목은 2~50자입니다」가 보인다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 토스 = new 토스트(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;

  await 방해막기(page);
  try {
    await test.step('새로 가입한 회원으로 로그인해 글쓰기 화면을 연다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      await 쓰기.열기();
    });

    await test.step('글쓰기 화면이 열렸는지 확인한다', async () => {
      await 쓰기.준비될때까지();
      await verify('새로 가입한 회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
      await verify('글쓰기 화면이 열려 있다', await 쓰기.제목.isVisible(), true, { blocker: true });
    });

    await test.step('제목 1자 · 본문 10자로 「등록」을 누르고 토스트를 기다린다', async () => {
      await 쓰기.채우기({ 분류: '자유', 제목: '가', 본문: 본문글(10) });
      await 쓰기.등록하고응답받기();
      await 토스.알림들.first().waitFor();
      await verify('제목 1자로 등록하면 토스트 「제목은 2~50자입니다」가 보인다', await 토스.글('제목은 2~50자입니다').isVisible(), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
