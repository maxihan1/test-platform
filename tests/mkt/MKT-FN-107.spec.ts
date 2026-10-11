import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 가짜클립보드, 복사된글 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-107',
  name: '「링크 복사」를 누르면 클립보드에 그 글 주소가 담긴다',
  precondition: ['비회원이다', '클립보드 쓰기는 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 알림 = new 토스트(page);
  await 방해막기(page);

  await test.step('클립보드 쓰기를 가짜로 바꾼다', async () => {
    await 가짜클립보드(page);
  });

  await test.step('게시글 상세 화면을 연다', async () => {
    await 상세.열기(1);
  });

  await test.step('게시글 상세 화면이 열렸는지 확인한다', async () => {
    await 상세.그려질때까지();
    await verify('게시글 상세 화면이 열려 있다', await 상세.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시글 상세에서 「링크 복사」를 누른다', async () => {
    await 상세.링크복사.click();
    await 알림.글('링크를 복사했습니다').first().waitFor();
    await verify('「링크 복사」를 누르면 클립보드에 그 글 주소가 담긴다', (await 복사된글(page)) === page.url(), true);
    await verify('「링크 복사」를 누르면 토스트 「링크를 복사했습니다」가 보인다', await 알림.글('링크를 복사했습니다').first().isVisible(), true);
  });
});
