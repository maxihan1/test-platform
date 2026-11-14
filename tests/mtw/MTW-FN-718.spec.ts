import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { type 새계정, 확인된새계정만들기 } from './helpers/signup.helper.js';
import { 외관설정화면 } from './pages/appearance-preferences.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-718',
  name: '새 계정으로 외관 설정을 열면 표시 없는 항목은 모두 꺼져 있다',
  precondition: ['가입하고 관리자가 이메일 확인을 마친 새 계정이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

const 켜짐표시항목 = ['오늘의 유행 보이기', '숨겨진 미디어에 대해 그라디언트 표시', '게시물을 삭제하기 전 경고하기', '대체텍스트가 없는 미디어를 포함하여 게시하기 전 경고'];

test(spec, async ({ page, params }) => {
  const 설정 = new 외관설정화면(page);
  let 계정: 새계정 | undefined;

  await test.step('새 계정을 만들고 관리자가 이메일 확인을 마친다', async () => {
    계정 = await 확인된새계정만들기(page, params.adminId, params.adminPassword);
  });

  await test.step('새 계정으로 로그인해 있는지 확인한다', async () => {
    await 로그인하기(page, 계정?.이메일, 계정?.암호);
    await 설정.열기();
    await verify('외관 설정 화면에 「변경 사항을 저장」이 보인다', await 설정.틀.저장.isVisible(), true, { blocker: true });
  });

  await test.step('새 계정으로 외관 설정을 연다', async () => {
    await verify('새 계정으로 외관 설정을 열면 표시 없는 항목은 모두 꺼져 있다', await 설정.켜진항목(켜짐표시항목), '');
    const 유행 = await verify('「오늘의 유행 보이기」가 켜져 있다', await 설정.오늘의유행.isChecked(), true);
    const 그라디언트 = await verify('「숨겨진 미디어에 대해 그라디언트 표시」가 켜져 있다', await 설정.그라디언트.isChecked(), true);
    const 삭제경고 = await verify('「게시물을 삭제하기 전 경고하기」가 켜져 있다', await 설정.삭제전경고.isChecked(), true);
    const 대체텍스트 = await verify('「대체텍스트가 없는 미디어를 포함하여 게시하기 전 경고」가 켜져 있다', await 설정.대체텍스트경고.isChecked(), true);
    await verify(
      '켜짐으로 표시한 「오늘의 유행 보이기」 · 「숨겨진 미디어에 대해 그라디언트 표시」 · 「게시물을 삭제하기 전 경고하기」 · 「대체텍스트가 없는 미디어를 포함하여 게시하기 전 경고」는 켜져 있다',
      유행 && 그라디언트 && 삭제경고 && 대체텍스트,
      true,
    );
  });
});
