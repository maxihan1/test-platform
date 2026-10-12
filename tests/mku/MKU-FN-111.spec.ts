import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 글쓴이정리하기, 글있나, 글하나쓰기, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-111',
  name: '게시글 「삭제」를 누르면 모달 「게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.」가 보인다',
  precondition: ['회원으로 로그인해 내 글을 하나 썼다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 팝업 = new 모달(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 글번호 = 0;
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인해 글을 하나 쓴다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      글번호 = (await 글하나쓰기(나.api, '삭제글')).id;
    });

    await test.step('회원이 쓴 글이 있는지 확인한다', async () => {
      await verify('회원이 쓴 글이 하나 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('내 글 상세에서 「삭제」를 누른다', async () => {
      await 상세.열기(글번호);
      await 상세.그려질때까지();
      await 상세.삭제.click();
      await 팝업.창.waitFor();
      await verify('게시글 「삭제」를 누르면 모달 「게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.」가 보인다', await 팝업.본문.innerText(), '게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.');
    });
  } finally {
    await 정리.모두하기();
  }
});
