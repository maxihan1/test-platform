import { defineCase, test, verify, 폰에파일넣기, type 폰파일 } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/compose-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 파일선택기로첨부 } from './helpers/media.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-230',
  name: '99MB 영상을 첨부하면 업로드 제한 토스트가 뜨지 않는다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    한도바이트: z.number().int().min(1).describe('업로드 한도 바이트 수 — 99MB').default(103809024),
  }),
  expected: z.object({
    토스트: z.string().describe('업로드 제한 토스트 글').default('파일은 업로드 제한인 99 MB를 초과합니다'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 영상들: 폰파일[] = [];

  try {
    const 한도영상 = await 폰에파일넣기(driver, '영상', { 크기: params.한도바이트 });
    영상들.push(한도영상);
    const 넘는영상 = await 폰에파일넣기(driver, '영상', { 크기: params.한도바이트 + 1 });
    영상들.push(넘는영상);

    await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
      await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
    });

    await test.step('99MB 영상을 첨부한다', async () => {
      await verify('파일 선택기에서 99MB 영상을 골라 선택기가 닫힌다', await 파일선택기로첨부(driver, 한도영상.이름), true, { blocker: true });
      await verify('99MB 영상을 첨부하면 업로드 제한 토스트가 뜨지 않는다', await 문구가보이나(driver, expected.토스트, 3_000), false);
      await verify('영상 조각이 한 개 보인다', await 글쓰기.조각수가될때까지(1), true, { blocker: true });
      await 글쓰기.조각제거();
      await verify('영상 조각이 지워진다', await 글쓰기.조각수가될때까지(0), true, { blocker: true });
    });

    await test.step('99MB 를 넘는 영상을 첨부한다', async () => {
      await verify('파일 선택기에서 99MB 를 넘는 영상을 골라 선택기가 닫힌다', await 파일선택기로첨부(driver, 넘는영상.이름), true, { blocker: true });
      await verify('토스트 「파일은 업로드 제한인 99 MB를 초과합니다」가 보인다', await 문구가보이나(driver, expected.토스트, 10_000), true);
    });
  } finally {
    for (const 영상 of 영상들) await 영상.지우기();
  }
});
