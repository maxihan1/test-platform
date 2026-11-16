import { defineCase, test, verify, 폰에파일넣기, type 폰파일 } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/compose-flow.helper.js';
import { 사진붙이고기다리기 } from './helpers/attach-flow.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 파일선택기로첨부 } from './helpers/media.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-227',
  name: '사진 4장을 첨부하면 조각 4개가 보이고 초과 토스트가 뜨지 않는다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  techniques: ['경계값 분석'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    한도안장수: z.number().int().min(1).describe('먼저 첨부할 사진 수 — 4개까지').default(4),
    한도넘는장수: z.number().int().min(2).describe('끝까지 첨부할 사진 수 — 한도보다 하나 많게').default(5),
  }),
  expected: z.object({
    조각수: z.number().int().describe('한도 안에서 보이는 조각 수').default(4),
    토스트: z.string().describe('초과 토스트 글').default('4개의 미디어를 초과해서 첨부할 수 없습니다'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 사진들: 폰파일[] = [];

  try {
    for (let 번 = 0; 번 < params.한도넘는장수; 번 += 1) 사진들.push(await 폰에파일넣기(driver, '사진'));

    await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
      await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
    });

    await test.step('사진 4장을 첨부한다', async () => {
      for (const [순서, 사진] of 사진들.slice(0, params.한도안장수).entries()) {
        await verify('사진이 조각으로 붙는다', await 사진붙이고기다리기(driver, 글쓰기, 사진.이름, 순서 + 1), true, { blocker: true });
      }
      const 조각 = await verify('조각 4개가 보인다', await 글쓰기.조각수(), expected.조각수);
      const 토스트없음 = await verify('초과 토스트가 뜨지 않는다', await 문구가보이나(driver, expected.토스트, 1_000), false);
      await verify('사진 4장을 첨부하면 조각 4개가 보이고 초과 토스트가 뜨지 않는다', 조각 && 토스트없음, true);
    });

    await test.step('사진 5장을 첨부한다', async () => {
      for (const 사진 of 사진들.slice(params.한도안장수, params.한도넘는장수)) {
        await 파일선택기로첨부(driver, 사진.이름);
      }
      await verify('토스트 「4개의 미디어를 초과해서 첨부할 수 없습니다」가 보인다', await 문구가보이나(driver, expected.토스트, 10_000), true);
    });
  } finally {
    for (const 사진 of 사진들) await 사진.지우기();
  }
});
