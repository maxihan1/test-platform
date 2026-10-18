import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 글제목읽기, 기본본문 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자, 글만들기, 글지우기 } from './helpers/data.helper.js';
import { 글쓰기화면 } from './pages/write.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-152',
  name: '수정 화면은 글쓰기와 같은 칸에 그 글의 분류 · 제목 · 본문이 채워져 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 쓴 글이 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 준비: { 회원?: 회원정보; 글번호?: number } = {};
  const 제목 = 고유글자('수정 화면 확인');

  try {
    await test.step('회원이 분류 「질문」으로 글을 쓴다', async () => {
      준비.회원 = await 새회원으로로그인(page.request);
      준비.글번호 = await 글만들기(page.request, { category: '질문', title: 제목, content: 기본본문 });
    });

    await test.step('회원이 쓴 글이 만들어졌는지 확인한다', async () => {
      await verify('쓴 글이 만들어져 있다', await 글제목읽기(page.request, 준비.글번호 ?? 0), 제목, { blocker: true });
    });

    await test.step('자기 글의 수정 화면을 연다', async () => {
      await 방해창막기(page);
      await 쓰기.수정화면열기(준비.글번호 ?? 0);
      await verify('수정 화면은 글쓰기와 같은 칸에 그 글의 분류 · 제목 · 본문이 채워져 있다', [await 쓰기.선택된분류.innerText(), await 쓰기.제목칸.inputValue(), await 쓰기.본문칸.inputValue()], ['질문', 제목, 기본본문]);
    });
  } finally {
    if (준비.글번호 !== undefined) await 글지우기(page.request, 준비.글번호);
    if (준비.회원) await 회원정리(page.request, 준비.회원);
  }
});
