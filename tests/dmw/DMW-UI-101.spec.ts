import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-101',
  name: '게시글 「삭제」를 누르면 「게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.」 모달이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 안내 = new 모달(page);
  let 글번호 = 0;

  try {
    await test.step('일회용 회원이 올린 내 글의 상세 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(page.request);
      글번호 = 글.번호;
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('올려 둔 글의 제목이 보인다', await 상세.제목.innerText(), 글.제목, { blocker: true });
    });

    await test.step('내 글 상세에서 「삭제」를 누른다', async () => {
      await 상세.삭제.click();
      await 안내.뜰때까지();
      await verify(
        '게시글 「삭제」를 누르면 「게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.」 모달이 보인다',
        await 안내.창.getByText('게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.', { exact: true }).isVisible(),
        true,
      );
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
