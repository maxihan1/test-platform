import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험사유 } from './helpers/sanction.helper.js';
import { 새제재걸기, 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-334',
  name: '정지를 걸면 제재 이력의 「시작」이 등록한 시각(분까지)과 같다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  const 사유 = 시험사유('ARO-FN-334');
  let 계정 = 0;
  let 등록전 = 0;
  let 등록후 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정의 제재를 풀어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
    });

    await test.step('대상 계정의 상세 패널을 열어 확인한다', async () => {
      await 화면.상세열기(계정);
      await verify('상세 패널이 열려 있다', await 화면.상세패널.isVisible(), true, { blocker: true });
    });

    await test.step('qa_player2 에 정지를 걸고 상세 패널을 연다', async () => {
      등록전 = Date.now();
      await 새제재걸기(page, 계정, 'SUSPEND', 사유);
      등록후 = Date.now();
      await 화면.상세열기(계정);
      const 시작 = (await 화면.제재시작칸(사유).innerText()).trim();
      const 허용 = [await 화면.시각표기(등록전), await 화면.시각표기(등록후)];
      await verify('정지를 걸면 제재 이력의 「시작」이 등록한 시각(분까지)과 같다', 시작, 허용.includes(시작) ? 시작 : 허용[1]);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
