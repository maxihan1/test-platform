import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 할일화면 } from './pages/todo.page.js';

export const spec = defineCase({
  tcId: 'DEMO-UI-030',
  name: '할 일 목록 버튼 반응',
  precondition: ['할 일 목록에 완료한 「우유 사기」와 끝내지 않은 「빵 사기」가 있다'],
  params: z.object({
    done: z.string().min(1).describe('완료로 바꿀 할 일 — 앞뒤 공백 없는 글자').default('우유 사기'),
    active: z.string().min(1).describe('끝내지 않은 채 둘 할 일 — 앞뒤 공백 없는 글자, 완료로 바꿀 할 일과 다르게').default('빵 사기'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 할일화면(page);

  await test.step('할 일 화면을 열고 「우유 사기」와 「빵 사기」를 더한 뒤 「우유 사기」를 완료로 바꾼다', async () => {
    await 화면.열기();
    await 화면.적고엔터(params.done);
    await 화면.적고엔터(params.active);
    await 화면.완료누르기(params.done);
  });

  await test.step('완료한 할 일 한 건과 끝내지 않은 할 일 한 건을 확인한다', async () => {
    await 화면.완료지우기.waitFor();
    await verify('남은 개수 칸에 「1 item left」가 보인다', await 화면.남은개수.innerText(), '1 item left', { blocker: true });
  });

  await test.step('보기 링크 「Active」를 누른다', async () => {
    await 화면.보기고르기('Active');
    await 화면.줄(params.done).waitFor({ state: 'detached' });
    await verify('할 일 목록에서 「Active」를 누르면 보기 링크 「Active」가 고른 표시로 바뀐다', await 화면.고른보기인가('Active'), true);
  });

  await test.step('보기 링크 「Completed」를 누른다', async () => {
    await 화면.보기고르기('Completed');
    await 화면.줄(params.active).waitFor({ state: 'detached' });
    await verify('할 일 목록에서 「Completed」를 누르면 보기 링크 「Completed」가 고른 표시로 바뀐다', await 화면.고른보기인가('Completed'), true);
  });

  await test.step('보기 링크 「All」을 누른다', async () => {
    await 화면.보기고르기('All');
    await 화면.줄(params.active).waitFor();
    await verify('할 일 목록에서 「All」을 누르면 보기 링크 「All」이 고른 표시로 바뀐다', await 화면.고른보기인가('All'), true);
  });

  await test.step('「빵 사기」의 완료 표시를 누른다', async () => {
    await 화면.완료누르기(params.active);
    await 화면.남은개수글('0 items left').waitFor();
    await verify('할 일 목록에서 「빵 사기」의 완료 표시를 누르면 완료 표시가 켜진다', await 화면.완료표시(params.active).isChecked(), true);
    await 화면.완료누르기(params.active);
    await 화면.남은개수글('1 item left').waitFor();
  });

  await test.step('「Mark all as complete」를 누른다', async () => {
    await 화면.모두완료누르기();
    await 화면.남은개수글('0 items left').waitFor();
    await verify('할 일 목록에서 「Mark all as complete」를 누르면 「Mark all as complete」가 켜진다', await 화면.모두완료.isChecked(), true);
    await 화면.모두완료누르기();
    await 화면.남은개수글('2 items left').waitFor();
  });

  await test.step('「빵 사기」를 두 번 누른다', async () => {
    await 화면.이름두번누르기(params.active);
    await 화면.고치는줄(params.active).waitFor();
    await verify('할 일 목록에서 「빵 사기」를 두 번 누르면 고치기 칸이 열린다', await 화면.고치기칸.isVisible(), true);
    await 화면.고치기칸키('Escape');
    await 화면.고치기칸.waitFor({ state: 'hidden' });
  });

  await test.step('「빵 사기」 줄에 마우스를 올린다', async () => {
    await 화면.줄에마우스(params.active);
    await verify('할 일 목록에서 「빵 사기」 줄에 마우스를 올리면 지우기(×) 버튼이 보인다', await 화면.지우기버튼(params.active).isVisible(), true);
  });
});
