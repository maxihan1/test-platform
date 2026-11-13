import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험계정 } from './helpers/sanction.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 계정번호, 계정상세읽기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-096',
  name: '상세 패널 머리에 「qa_player2」 · #2 · 이메일 · 상태 칩 · 「닫기」가 보인다',
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
  let 이메일 = '';

  await test.step('운영자 계정으로 로그인하고 대상 계정의 번호와 이메일을 읽어 둔다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    계정 = await 계정번호(page, 시험계정);
    이메일 = (await 계정상세읽기(page, 계정)).email;
  });

  await test.step('「유저 · 제재」에서 대상 계정의 상세 패널을 확인한다', async () => {
    await 화면.상세열기(계정);
    await verify('상세 패널이 열려 있다', await 화면.상세패널.isVisible(), true, { blocker: true });
  });

  await test.step('qa_player2 상세 패널을 연다', async () => {
    const 머리글 = await verify('머리에 「qa_player2」 · #2 · 이메일이 보인다', (await 화면.상세제목.innerText()).replace(/\s+/g, ' ').trim(), `${시험계정} #${String(계정)} · ${이메일}`);
    const 칩 = await verify('머리에 상태 칩이 보인다', (await 화면.상세머리칩들.allInnerTexts()).length > 0, true);
    const 닫기 = await verify('머리에 「닫기」 버튼이 보인다', await 화면.상세닫기.isVisible(), true);
    await verify('상세 패널 머리에 「qa_player2」 · #2 · 이메일 · 상태 칩 · 「닫기」가 보인다', 머리글 && 칩 && 닫기, true);
  });

  await test.step('「캐릭터 N」 표 머리를 본다', async () => {
    const 소제목 = await verify('「캐릭터 N」 소제목이 보인다', (await 화면.상세소제목들.allInnerTexts()).some((x) => /^캐릭터 \d+$/.test(x.trim())), true);
    const 열 = await verify('열이 차례로 「번호」 · 「이름」 · 「레벨」 · 「직업」 · 「종족」 · 「위치」 · 「재화」 · 「소지 아이템」 · 「마지막 저장」이다', await 화면.열이름(화면.캐릭터표), '번호, 이름, 레벨, 직업, 종족, 위치, 재화, 소지 아이템, 마지막 저장');
    await verify('「캐릭터 N」 표에 열 「번호」 · 「이름」 · 「레벨」 · 「직업」 · 「종족」 · 「위치」 · 「재화」 · 「소지 아이템」 · 「마지막 저장」이 보인다', 소제목 && 열, true);
  });

  await test.step('「제재 이력 N」 표 머리를 본다', async () => {
    const 소제목 = await verify('「제재 이력 N」 소제목이 보인다', (await 화면.상세소제목들.allInnerTexts()).some((x) => /^제재 이력 \d+$/.test(x.trim())), true);
    const 열 = await verify('열이 차례로 「종류」 · 「사유」 · 「시작」 · 「끝」 · 「상태」 · 「처리」다', await 화면.열이름(화면.제재표), '종류, 사유, 시작, 끝, 상태, 처리');
    await verify('「제재 이력 N」 표에 열 「종류」 · 「사유」 · 「시작」 · 「끝」 · 「상태」 · 「처리」가 보인다', 소제목 && 열, true);
  });
});
