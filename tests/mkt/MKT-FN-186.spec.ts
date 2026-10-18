import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 토스트 } from './components/toast.component.js';
import { 로그인요청 } from './helpers/account.helper.js';
import { gif만들기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 글쓰기화면 } from './pages/write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-186',
  name: 'gif 이미지를 첨부하면 토스트 「jpg, png 파일만 올릴 수 있습니다」가 나온다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 알림 = new 토스트(page);

  await test.step('회원으로 로그인하고 글쓰기 화면을 연다', async () => {
    await 방해창막기(page);
    await 로그인요청(page.request, params.loginId ?? '', params.loginPassword ?? '');
    await 쓰기.열기();
  });

  await test.step('회원으로 로그인해 글쓰기 화면이 열렸는지 확인한다', async () => {
    await 쓰기.머리글.로그인꼴일때까지();
    await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 쓰기.머리글.로그아웃버튼.count(), 1, { blocker: true });
    await verify('글쓰기 화면 제목 「글쓰기」가 보인다', await 쓰기.글쓰기제목.isVisible(), true, { blocker: true });
  });

  await test.step('글쓰기 화면에서 gif 이미지를 첨부한다', async () => {
    await 쓰기.이미지붙이기([{ name: '움직임.gif', mimeType: 'image/gif', buffer: gif만들기() }]);
    await verify('gif 이미지를 첨부하면 토스트 「jpg, png 파일만 올릴 수 있습니다」가 나온다', await (await 알림.아무거나뜰때까지()).innerText(), 'jpg, png 파일만 올릴 수 있습니다');
  });
});
