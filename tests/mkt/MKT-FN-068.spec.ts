import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 작은이미지, 큰이미지 } from './helpers/board.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-068',
  name: '5MB 이미지를 첨부하면 미리보기가 보인다',
  platforms: ['desktop'],
  precondition: ['회원으로 글쓰기 화면을 열었다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 글쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);

  await test.step('회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 방해막기(page);
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await 글쓰기.열기();
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    await verify('글쓰기 화면 제목이 「글쓰기」 이다', await 글쓰기.화면제목.innerText(), '글쓰기', { blocker: true });
  });

  await test.step('5MB png 이미지를 첨부한다', async () => {
    await 글쓰기.이미지넣기([큰이미지('five.png', 5 * 1024 * 1024)]);
    await 글쓰기.이미지빼기버튼.first().waitFor();
    await verify('5MB 이미지를 첨부하면 미리보기가 보인다', await 글쓰기.미리보기들.count(), 1);
  });

  await test.step('5MB 를 넘는 png 이미지를 첨부한다', async () => {
    const 전 = await 글쓰기.미리보기들.count();
    await 글쓰기.이미지넣기([큰이미지('over.png', 5 * 1024 * 1024 + 1)]);
    await 알림.모두.first().waitFor();
    await verify(
      '5MB 를 넘는 이미지를 첨부하면 토스트 「5MB 이하 파일만 올릴 수 있습니다」 가 보이고 미리보기가 늘지 않는다',
      { 토스트: await 알림.모두.allInnerTexts(), 늘어난미리보기: (await 글쓰기.미리보기들.count()) - 전 },
      { 토스트: ['5MB 이하 파일만 올릴 수 있습니다'], 늘어난미리보기: 0 },
    );
  });

  await test.step('png 이미지 3장을 첨부한다', async () => {
    await 글쓰기.열기();
    await 글쓰기.이미지넣기(['a', 'b', 'c'].map((이름) => 작은이미지(`${이름}.png`)));
    await 글쓰기.이미지빼기버튼.nth(2).waitFor();
    await verify('이미지 3장을 첨부하면 미리보기 3개가 보인다', await 글쓰기.미리보기들.count(), 3);
  });

  await test.step('네 번째 png 이미지를 첨부한다', async () => {
    await 글쓰기.이미지넣기([작은이미지('d.png')]);
    await 알림.모두.first().waitFor();
    await verify(
      '네 번째 이미지를 첨부하면 토스트 「이미지는 최대 3장까지 첨부할 수 있습니다」 가 보이고 미리보기는 3개다',
      { 토스트: await 알림.모두.allInnerTexts(), 미리보기: await 글쓰기.미리보기들.count() },
      { 토스트: ['이미지는 최대 3장까지 첨부할 수 있습니다'], 미리보기: 3 },
    );
  });
});
