import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글쓴이정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 보이는이름들 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-160',
  name: '글쓰기 화면이 보기 편하게 구성되어 보인다',
  held: '판정 불가 — 「보기 편하게」를 잴 기준이 기획서에 없다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: z.object({
    구성: z.string().describe('글쓰기 화면에 보여야 할 칸과 버튼 이름(쉼표로 이은 것)'),
  }),
});

test(spec, async ({ page, expected }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
    });

    await test.step('로그인했는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
    });

    await test.step('글쓰기 화면을 연다', async () => {
      await 쓰기.열기();
      await 쓰기.준비될때까지();
      await verify(
        '글쓰기 화면이 보기 편하게 구성되어 보인다',
        await 보이는이름들({
          분류: 쓰기.분류,
          제목: 쓰기.제목칸,
          본문: 쓰기.본문칸,
          '이미지 첨부': 쓰기.이미지칸,
          '임시 저장': 쓰기.임시저장,
          취소: 쓰기.취소,
          등록: 쓰기.등록,
        }),
        expected.구성,
      );
    });
  } finally {
    await 정리.모두하기();
  }
});
