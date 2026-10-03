import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시글쓰기화면 } from './pages/board-write.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

type 글요약 = { title: string; createdAt: number };

export const spec = defineCase({
  tcId: 'MKT-FN-061',
  name: '글을 등록하면 새 글의 상세로 가고 목록 작성일은 오늘 글이 시각 이전 글이 날짜로 보인다',
  precondition: ['일반 회원으로 로그인해 있다', '오늘 쓴 글이 있다', '어제 이전에 쓴 글이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 게시글쓰기화면(page);
  const 상세 = new 게시글상세화면(page);
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 표식 = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const 아이디 = `mk${표식}`.slice(0, 12);
  const 비밀번호 = `Mk!${표식}9`;
  const 글제목 = `등록 시험 글 ${표식}`;
  const 가입 = await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  const 내번호: number = (await 가입.json()).id;
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  const 오늘 = new Date().toDateString();
  const 이전글 = ((await (await page.request.get('/api/posts?page=1&size=100')).json()).items as 글요약[]).find((글) => new Date(글.createdAt).toDateString() !== 오늘);

  try {
    await test.step('분류 · 제목 · 본문을 채워 등록한다', async () => {
      await 쓰기.열기();
      await 쓰기.준비된폼().waitFor();
      await verify('일반 회원으로 로그인해 있다', await 머리.로그아웃버튼().isVisible(), true, { blocker: true });
      await 쓰기.글채우기('자유', 글제목, '등록 뒤 화면을 보려고 쓴 글의 본문입니다');
      await 쓰기.등록버튼().click();
      await 상세.새댓글입력칸().waitFor();
      await verify('등록하면 방금 쓴 글의 상세 화면으로 간다', await 상세.제목().innerText(), 글제목);
      await verify('등록하면 토스트 「등록되었습니다」가 보인다', await 알림.문구('등록되었습니다').isVisible(), true);
    });

    await test.step('게시판 목록 화면을 연다', async () => {
      await 목록.열기();
      await 목록.글줄().first().waitFor();
      await verify('오늘 쓴 글이 있다', await 목록.글줄찾기(글제목).isVisible(), true, { blocker: true });
      await verify(
        '오늘 쓴 글의 작성일은 「14:05」 꼴로 시각만 보인다',
        (await 목록.작성일칸(목록.글줄찾기(글제목)).innerText()).replace(/\d/g, '9'),
        '99:99',
      );
      await 목록.검색하기('제목', 이전글?.title ?? '');
      await 목록.글줄찾기(이전글?.title ?? '').waitFor();
      await verify('어제 이전에 쓴 글이 있다', await 목록.글줄찾기(이전글?.title ?? '').isVisible(), true, { blocker: true });
      await verify(
        '그 전에 쓴 글의 작성일은 「2026-09-20」 꼴로 날짜만 보인다',
        (await 목록.작성일칸(목록.글줄찾기(이전글?.title ?? '')).innerText()).replace(/\d/g, '9'),
        '9999-99-99',
      );
    });
  } finally {
    const 전체 = await page.request.get('/api/posts?size=100');
    for (const 글 of ((await 전체.json()).items as { id: number; authorId: number }[]).filter((항목) => 항목.authorId === 내번호)) {
      await page.request.delete(`/api/posts/${글.id}`);
    }
    await page.request.delete('/api/me');
  }
});
