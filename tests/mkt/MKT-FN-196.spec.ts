import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 토스트 } from './components/toast.component.js';
import { 로그인요청 } from './helpers/account.helper.js';
import { 기본본문 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자 } from './helpers/data.helper.js';
import { 글쓰기화면 } from './pages/write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-196',
  name: '임시 저장본이 있으면 확인 창 「임시 저장된 글이 있습니다. 불러올까요?」가 뜬다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 글쓰기에서 임시 저장을 해 두었다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 알림 = new 토스트(page);
  const 제목 = 고유글자('불러올 제목');

  await test.step('회원으로 로그인하고 글쓰기 화면에서 임시 저장을 해 둔다', async () => {
    await 방해창막기(page);
    await 로그인요청(page.request, params.loginId ?? '', params.loginPassword ?? '');
    await 쓰기.열기();
    await 쓰기.채우기({ 분류: '자유', 제목, 본문: 기본본문 });
    await 쓰기.임시저장.click();
    await 알림.아무거나뜰때까지();
  });

  await test.step('임시 저장본이 남았는지 확인한다', async () => {
    await 쓰기.머리글.로그인꼴일때까지();
    await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 쓰기.머리글.로그아웃버튼.count(), 1, { blocker: true });
    await verify('임시 저장본이 이 브라우저 저장소에 있다', await 쓰기.임시저장본제목읽기(), 제목, { blocker: true });
  });

  await test.step('글쓰기 화면을 다시 연다', async () => {
    const 확인창글 = await 쓰기.확인창을처리하며열기('dismiss');
    await verify('임시 저장본이 있으면 확인 창 「임시 저장된 글이 있습니다. 불러올까요?」가 뜬다', 확인창글, '임시 저장된 글이 있습니다. 불러올까요?');
  });

  await test.step('확인 창에서 「확인」을 누른다', async () => {
    await 쓰기.확인창을처리하며열기('accept');
    await verify('불러오기 확인 창에서 「확인」을 누르면 임시 저장한 제목과 본문이 채워진다', [await 쓰기.제목칸.inputValue(), await 쓰기.본문칸.inputValue()], [제목, 기본본문]);
  });
});
