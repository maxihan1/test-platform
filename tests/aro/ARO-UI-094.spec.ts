import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험계정 } from './helpers/sanction.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 계정번호 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-094',
  name: '유저 표에서 qa_player2 의 「상세」를 누르면 상세 패널이 열리고 주소에 ?id=2 가 붙는다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  let 계정 = 0;
  let 첫제목 = '';

  await test.step('운영자 계정으로 로그인하고 대상 계정의 번호를 읽어 둔다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    계정 = await 계정번호(page, 시험계정);
  });

  await test.step('「유저 · 제재」에서 대상 계정 줄을 확인한다', async () => {
    await 화면.열기(`?q=${시험계정}`);
    await verify('대상 계정 줄에 「상세」 버튼이 보인다', await 화면.줄버튼(시험계정, '상세').isVisible(), true, { blocker: true });
  });

  await test.step('유저 표에서 qa_player2 의 「상세」를 누른다', async () => {
    await 화면.줄버튼(시험계정, '상세').click();
    await 화면.상세제목.waitFor();
    첫제목 = (await 화면.상세제목.innerText()).trim();
    const 열림 = await verify('상세 패널이 열린다', await 화면.상세패널.isVisible(), true);
    const 주소 = await verify('주소에 ?id=2 가 붙는다', new URL(page.url()).searchParams.get('id'), String(계정));
    await verify('유저 표에서 qa_player2 의 「상세」를 누르면 상세 패널이 열리고 주소에 ?id=2 가 붙는다', 열림 && 주소, true);
  });

  await test.step('상세 패널을 닫고 아이디 「qa_player2」를 누른다', async () => {
    await 화면.상세닫기.click();
    await 화면.상세닫힘기다리기();
    await 화면.아이디링크(시험계정).click();
    await 화면.상세열림기다리기();
    await 화면.상세제목.waitFor();
    const 같은패널 = await verify('열린 상세 패널의 머리가 처음 열었던 것과 같다', (await 화면.상세제목.innerText()).trim(), 첫제목);
    const 열림 = await verify('상세 패널이 열려 있다', await 화면.상세패널.isVisible(), true);
    await verify('아이디 링크로도 같은 상세 패널이 열린다', 같은패널 && 열림, true);
  });

  await test.step('?id=2 가 붙은 주소를 새로 고친다', async () => {
    await 화면.새로고침();
    const 떴다 = await 화면.상세제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 제목 = await verify('상세 패널 머리가 다시 그려진다', 떴다, true);
    const 열림 = await verify('상세 패널이 보인다', await 화면.상세패널.isVisible(), true);
    await verify('?id=2 가 붙은 주소를 새로 고쳐도 상세 패널이 열려 있다', 제목 && 열림, true);
  });
});
