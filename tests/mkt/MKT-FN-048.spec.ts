import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

type 글요약 = { id: number };

export const spec = defineCase({
  tcId: 'MKT-FN-048',
  name: '「좋아요」를 누르면 수가 1 오르고 채워진 하트로 바뀌고 다시 누르면 1 줄어든다',
  precondition: ['회원으로 로그인해 있다 · 남의 글이다', '좋아요를 누른 상태다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 글들 = (await (await page.request.get('/api/posts?size=100')).json()).items as 글요약[];
  const 대상 = 글들[글들.length - 2]?.id ?? 0;
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    let 처음수 = 0;

    await test.step('「좋아요」를 누른다', async () => {
      await 상세.열기(대상);
      await 상세.댓글제목().waitFor();
      await verify(
        '회원으로 로그인해 있다 · 남의 글이다',
        [await 머리.로그아웃버튼().isVisible(), await 상세.수정링크().isVisible()],
        [true, false],
        { blocker: true },
      );
      처음수 = Number(await 상세.좋아요수().innerText());
      await 상세.좋아요누르기();
      await 상세.눌린좋아요버튼().waitFor();
      await verify('「좋아요」를 누르면 좋아요 수가 1 오른다', Number(await 상세.좋아요수().innerText()), 처음수 + 1);
      await verify('「좋아요」를 누르면 버튼이 채워진 하트로 바뀐다', await 상세.채운하트().isVisible(), true);
    });

    await test.step('「좋아요」를 다시 누른다', async () => {
      await 상세.좋아요누르기();
      await 상세.눌리지않은좋아요버튼().waitFor();
      await verify('「좋아요」를 다시 누르면 좋아요가 취소되어 수가 1 줄어든다', Number(await 상세.좋아요수().innerText()), 처음수);
    });
  } finally {
    const 글 = await (await page.request.get(`/api/posts/${대상}`)).json();
    if (글.liked === true) await page.request.post(`/api/posts/${대상}/like`);
    await page.request.delete('/api/me');
  }
});
