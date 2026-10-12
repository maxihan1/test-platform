import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 가짜클립보드걸렸나 } from './helpers/board-mock.helper.js';
import { 가짜클립보드, 복사된글 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-095',
  name: '「링크 복사」를 누르면 클립보드에 글 주소가 담긴다',
  precondition: ['클립보드는 가짜 클립보드(모킹)다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 알림 = new 토스트(page);

  await 방해막기(page);
  await test.step('클립보드를 가짜로 바꾸고 게시글 상세를 연다', async () => {
    await 가짜클립보드(page);
    await 상세.열기(1);
  });

  await test.step('클립보드가 가짜인지 확인한다', async () => {
    await 상세.그려질때까지();
    await verify('클립보드는 가짜 클립보드(모킹)다', await 가짜클립보드걸렸나(page), true, { blocker: true });
    await verify('게시글 상세 화면이 열려 있다', await 상세.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시글 상세에서 「링크 복사」를 누른다', async () => {
    await 상세.링크복사.click();
    await verify('「링크 복사」를 누르면 클립보드에 글 주소가 담긴다', (await 복사된글(page)) === page.url(), true);
  });

  await test.step('「링크 복사」를 누르고 토스트를 기다린다', async () => {
    await 알림.알림들.first().waitFor({ state: 'detached' });
    await 상세.링크복사.click();
    await 알림.글('링크를 복사했습니다').first().waitFor();
    await verify('「링크 복사」를 누르면 토스트 「링크를 복사했습니다」가 보인다', await 알림.글('링크를 복사했습니다').first().isVisible(), true);
  });
});
