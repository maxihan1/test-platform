import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 게시글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-060',
  name: '조건을 어긴 이미지는 이유 토스트가 보이고 올바른 이미지는 미리보기가 보이고 X 로 빠진다',
  precondition: ['일반 회원으로 로그인해 있다', '이미지를 한 장 첨부했다'],
  params: null,
  expected: null,
});

const 작은그림 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const 그림 = (이름: string) => ({ name: 이름, mimeType: 'image/png', buffer: 작은그림 });

test(spec, async ({ page }) => {
  const 쓰기 = new 게시글쓰기화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 표식 = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const 아이디 = `mk${표식}`.slice(0, 12);
  const 비밀번호 = `Mk!${표식}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await test.step('png 가 아닌 파일을 첨부한다', async () => {
      await 쓰기.열기();
      await 쓰기.준비된폼().waitFor();
      await verify('일반 회원으로 로그인해 있다', await 머리.로그아웃버튼().isVisible(), true, { blocker: true });
      await 쓰기.이미지올리기([{ name: '메모.txt', mimeType: 'text/plain', buffer: Buffer.from('텍스트 파일') }]);
      await verify('jpg · png 가 아닌 파일을 올리면 토스트 「jpg, png 파일만 올릴 수 있습니다」가 보인다', await 알림.문구('jpg, png 파일만 올릴 수 있습니다').isVisible(), true);
    });

    await test.step('5MB 를 넘는 png 를 첨부한다', async () => {
      await 쓰기.이미지올리기([{ name: '큰그림.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) }]);
      await verify('5MB 를 넘는 파일을 올리면 토스트 「5MB 이하 파일만 올릴 수 있습니다」가 보인다', await 알림.문구('5MB 이하 파일만 올릴 수 있습니다').isVisible(), true);
    });

    await test.step('png 를 한 장 첨부한다', async () => {
      await 쓰기.이미지올리기([그림('첫째.png')]);
      await 쓰기.미리보기빼기버튼().waitFor();
      await verify('첨부한 이미지가 입력칸 아래에 미리보기로 보인다', await 쓰기.미리보기().isVisible(), true);
    });

    await test.step('미리보기의 X 버튼을 누른다', async () => {
      await verify('이미지를 한 장 첨부했다', await 쓰기.미리보기().count(), 1, { blocker: true });
      await 쓰기.미리보기빼기버튼().click();
      await 쓰기.미리보기빼기버튼().waitFor({ state: 'detached' });
      await verify('미리보기의 X 버튼을 누르면 그 이미지가 빠진다', await 쓰기.미리보기().count(), 0);
    });

    await test.step('png 를 네 장째 첨부한다', async () => {
      await 쓰기.이미지올리기([그림('하나.png'), 그림('둘.png'), 그림('셋.png')]);
      await 쓰기.미리보기순번(2).waitFor();
      await 쓰기.이미지올리기([그림('넷.png')]);
      await verify('네 장째를 올리면 토스트 「이미지는 최대 3장까지 첨부할 수 있습니다」가 보인다', await 알림.문구('이미지는 최대 3장까지 첨부할 수 있습니다').isVisible(), true);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
