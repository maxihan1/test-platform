import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 게시글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-059',
  name: '제목을 비우거나 1자로 적거나 본문을 9자로 적고 등록하면 글이 등록되지 않고 글쓰기 화면에 머문다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 게시글쓰기화면(page);
  const 머리 = new 머리글(page);
  const 표식 = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const 아이디 = `mk${표식}`.slice(0, 12);
  const 비밀번호 = `Mk!${표식}9`;
  const 가입 = await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  const 내번호: number = (await 가입.json()).id;
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  const 본문 = `글쓰기 입력 규칙을 보려는 본문입니다 ${표식}`;
  const 글수 = async (): Promise<number> => {
    const 본문찾기 = (await (await page.request.get(`/api/posts?field=content&q=${표식}`)).json()).total as number;
    const 제목찾기 = (await (await page.request.get(`/api/posts?field=title&q=${표식}`)).json()).total as number;
    return 본문찾기 + 제목찾기;
  };

  try {
    const 이전 = 0;

    await test.step('제목을 비운 채 본문을 적고 등록한다', async () => {
      await 쓰기.열기();
      await 쓰기.준비된폼().waitFor();
      await verify('일반 회원으로 로그인해 있다', await 머리.로그아웃버튼().isVisible(), true, { blocker: true });
      await 쓰기.분류고르기('자유');
      await 쓰기.본문칸().fill(본문);
      await 쓰기.등록버튼().click();
      await 쓰기.등록버튼().waitFor();
      await verify(
        '제목을 비우면 글이 등록되지 않고 글쓰기 화면에 머문다',
        { 경로: new URL(page.url()).pathname, 글수: await 글수() },
        { 경로: '/board/write', 글수: 이전 },
      );
    });

    await test.step('제목을 1자로 적고 등록한다', async () => {
      await 쓰기.제목칸().fill('가');
      await 쓰기.등록버튼().click();
      await 쓰기.등록버튼().waitFor();
      await verify(
        '제목이 1자면 글이 등록되지 않고 글쓰기 화면에 머문다',
        { 경로: new URL(page.url()).pathname, 글수: await 글수() },
        { 경로: '/board/write', 글수: 이전 },
      );
    });

    await test.step('본문을 9자로 적고 등록한다', async () => {
      await 쓰기.제목칸().fill(`입력 규칙 시험 ${표식}`);
      await 쓰기.본문칸().fill('가나다라마바사아자');
      await 쓰기.등록버튼().click();
      await 쓰기.등록버튼().waitFor();
      await verify(
        '본문이 9자면 글이 등록되지 않고 글쓰기 화면에 머문다',
        { 경로: new URL(page.url()).pathname, 글수: await 글수() },
        { 경로: '/board/write', 글수: 이전 },
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
