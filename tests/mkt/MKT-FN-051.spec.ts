import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 토스트 } from './components/toast.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-051',
  name: '작성자 본인에게만 「수정」 「삭제」 버튼이 보이고 「삭제」를 확인하면 목록과 토스트가 보인다',
  precondition: ['회원이 쓴 글이 하나 있다', '남의 글이 있다', '삭제 확인 모달이 열려 있다'],
  params: null,
  expected: null,
});

const 가입본문 = (아이디: string, 비밀번호: string) => ({
  loginId: 아이디,
  password: 비밀번호,
  passwordConfirm: 비밀번호,
  name: '임시회원',
  email: `${아이디}@demo.market`,
  phone: '',
  birth: '',
  gender: '선택 안 함',
  interests: [],
  terms: true,
  privacy: true,
  marketing: false,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 목록 = new 게시판목록화면(page);
  const 확인창 = new 모달(page);
  const 알림 = new 토스트(page);
  const 표식 = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const 작성자 = { 아이디: `mk${표식}`.slice(0, 12), 비밀번호: `Mk!${표식}9` };
  const 다른회원 = { 아이디: `mj${표식}`.slice(0, 12), 비밀번호: `Mj!${표식}9` };
  const 글제목 = `삭제 시험 글 ${표식}`;
  await page.request.post('/api/auth/signup', { data: 가입본문(작성자.아이디, 작성자.비밀번호) });
  await page.request.post('/api/auth/signup', { data: 가입본문(다른회원.아이디, 다른회원.비밀번호) });
  await page.request.post('/api/auth/login', { data: { loginId: 작성자.아이디, password: 작성자.비밀번호 } });
  const 글번호: number = (await (await page.request.post('/api/posts', { data: { category: '자유', title: 글제목, content: '삭제 시험을 위한 본문입니다 열 글자 이상', images: [] } })).json()).id;

  try {
    await test.step('작성자 본인으로 그 글의 상세 화면을 연다', async () => {
      await 상세.열기(글번호);
      await 상세.댓글제목().waitFor();
      await verify('회원이 쓴 글이 하나 있다', await 상세.제목().innerText(), 글제목, { blocker: true });
      await verify('작성자 본인에게는 「수정」과 「삭제」 버튼이 보인다', [await 상세.수정링크().isVisible(), await 상세.삭제버튼().isVisible()], [true, true]);
    });

    await test.step('다른 회원으로 그 글의 상세 화면을 연다', async () => {
      await page.request.post('/api/auth/login', { data: { loginId: 다른회원.아이디, password: 다른회원.비밀번호 } });
      await 상세.열기(글번호);
      await 상세.댓글제목().waitFor();
      await verify('남의 글이 있다', await 상세.제목().innerText(), 글제목, { blocker: true });
      await verify('작성자가 아닌 회원에게는 「수정」과 「삭제」 버튼이 보이지 않는다', [await 상세.수정링크().isVisible(), await 상세.삭제버튼().isVisible()], [false, false]);
    });

    await test.step('상세 화면에서 「삭제」를 누른다', async () => {
      await page.request.post('/api/auth/login', { data: { loginId: 작성자.아이디, password: 작성자.비밀번호 } });
      await 상세.열기(글번호);
      await 상세.댓글제목().waitFor();
      await 상세.삭제버튼().click();
      await 확인창.버튼('삭제').waitFor();
      await verify(
        '「삭제」를 누르면 모달 「게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.」가 뜬다',
        await 상세.삭제확인문구().isVisible(),
        true,
      );
    });

    await test.step('모달의 「삭제」를 누른다', async () => {
      await 확인창.버튼('삭제').click();
      await 목록.글줄().first().waitFor();
      await verify(
        '모달의 「삭제」를 누르면 목록으로 가서 토스트 「삭제되었습니다」가 보인다',
        [await 목록.제목().isVisible(), await 알림.문구('삭제되었습니다').isVisible()],
        [true, true],
      );
    });
  } finally {
    await page.request.post('/api/auth/login', { data: { loginId: 작성자.아이디, password: 작성자.비밀번호 } });
    await page.request.delete(`/api/posts/${글번호}`);
    await page.request.delete('/api/me');
    await page.request.post('/api/auth/login', { data: { loginId: 다른회원.아이디, password: 다른회원.비밀번호 } });
    await page.request.delete('/api/me');
  }
});
