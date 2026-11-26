import { defineCase, defineProcedure, test, verify } from '@platform/kit';

import { 글읽어보기, 글이바뀔때까지, 언어를한국어로, 열린환경설정창, 환경설정창열기 } from './helpers/menu-flow.helper.js';
import { 글읽기 } from './helpers/menu.helper.js';
import { 게임가이드창 } from './pages/guide.page.js';
import { 메인메뉴화면 } from './pages/main-menu.page.js';
import { 환경설정창 } from './pages/setting.page.js';

const 첫화면 = defineCase({
  tcId: 'CGP-FN-202',
  name: '게임을 다시 켜 메인 메뉴가 뜨면 「빠른시작」 · 「튜토리얼」 · 「환경설정」 · 「게임종료」 버튼과 게임 가이드 「Q」 버튼이 보인다',
  platforms: ['windows'],
  smoke: true,
  precondition: ['게임이 켜져 있다'],
  params: null,
  expected: null,
});

const 판번호 = defineCase({
  tcId: 'CGP-FN-205',
  name: '메인 메뉴 왼쪽 아래 판 번호를 읽으면 「v2.1.3」이다',
  platforms: ['windows'],
  precondition: ['메인 메뉴에 있다'],
  params: null,
  expected: null,
});

const 조작안내 = defineCase({
  tcId: 'CGP-FN-211',
  name: '메인 메뉴 아래 조작 안내를 읽으면 「이동」 · 「Enter 선택」 · 「Esc 취소」가 보인다',
  platforms: ['windows'],
  precondition: ['메인 메뉴에 있다'],
  params: null,
  expected: null,
});

const 가이드목차 = defineCase({
  tcId: 'CGP-FN-277',
  name: '메인 메뉴에서 「Q」를 눌러 게임 가이드를 열면 「목차」에 「게임 목표와 규칙」 · 「조작법」 · 「폭탄 던지기」 · 「고기와 식물 키우기」 · 「화면 보기」 · 「식물」 · 「나눔 플레이 경쟁」 일곱 장이 보인다',
  platforms: ['windows'],
  precondition: ['메인 메뉴에 있다'],
  params: null,
  expected: null,
});

const 기본조작 = defineCase({
  tcId: 'CGP-FN-283',
  name: '게임 가이드에서 「기본 조작」 장을 열면 키보드 키가 이동 방향키 · 달리기 Space · 공격 Z · 식물 심기 X · 식물 회복 C · 업그레이드 C · 회수 F · 식물 변경 Q E · 폭탄 Q · 확인 Enter · 취소 Esc · 메뉴 Esc 로 보인다',
  platforms: ['windows'],
  precondition: ['게임 가이드가 열려 있다'],
  params: null,
  expected: null,
});

const 소리줄 = defineCase({
  tcId: 'CGP-FN-265',
  name: '메인 메뉴에서 「환경설정」 창을 열면 「소 리」에 「마스터 볼륨」 · 「배경 음악」 · 「효과음」 조절 막대와 값이 보인다',
  platforms: ['windows'],
  precondition: ['메인 메뉴에 있다'],
  params: null,
  expected: null,
});

const 온라인랭킹 = defineCase({
  tcId: 'CGP-FN-271',
  name: '「환경설정」 창에서 「온라인 랭킹」 칸을 읽으면 「온라인 랭킹에 기록 등록」 켜고 끄기가 보인다',
  platforms: ['windows'],
  precondition: ['「환경설정」 창이 열려 있다'],
  params: null,
  expected: null,
});

const 언어 = defineCase({
  tcId: 'CGP-FN-268',
  name: '「환경설정」 창에서 「언 어」 오른쪽 버튼을 누르면 메인 메뉴 글이 다른 언어로 바뀐다',
  platforms: ['windows'],
  precondition: ['「환경설정」 창이 열려 있다'],
  params: null,
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-001',
  name: '메인 메뉴 — 첫 화면부터 게임 가이드 · 환경설정까지',
  platforms: ['windows'],
  precondition: [],
  cases: [첫화면, 판번호, 조작안내, 가이드목차, 기본조작, 소리줄, 온라인랭킹, 언어],
});

test(procedure, async ({ game }) => {
  await test.cleanup('환경설정 언어를 「한국어」로 되돌린다', async () => {
    await 언어를한국어로(game);
  });

  await test.case(첫화면, async () => {
    await test.step('게임을 다시 켜 메인 메뉴를 연다', async () => {
      const 메뉴 = await 메인메뉴화면.다시켜서열기(game);
      const 빠른시작 = await verify('「빠른시작」 버튼이 보인다', await 글읽어보기(() => 메뉴.글(메인메뉴화면.버튼글.빠른시작)), '빠른시작');
      const 튜토리얼 = await verify('「튜토리얼」 버튼이 보인다', await 글읽어보기(() => 메뉴.글(메인메뉴화면.버튼글.튜토리얼)), '튜토리얼');
      const 환경설정 = await verify('「환경설정」 버튼이 보인다', await 글읽어보기(() => 메뉴.글(메인메뉴화면.버튼글.환경설정)), '환경설정');
      const 게임종료 = await verify('「게임종료」 버튼이 보인다', await 글읽어보기(() => 메뉴.글(메인메뉴화면.버튼글.게임종료)), '게임종료');
      const 가이드 = await verify('게임 가이드 「Q」 버튼이 보인다', await 글읽어보기(() => 메뉴.글(메인메뉴화면.가이드버튼글)), 'Q');
      await verify(
        '게임을 다시 켜 메인 메뉴가 뜨면 「빠른시작」 · 「튜토리얼」 · 「환경설정」 · 「게임종료」 버튼과 게임 가이드 「Q」 버튼이 보인다',
        빠른시작 && 튜토리얼 && 환경설정 && 게임종료 && 가이드,
        true,
      );
    });
  });

  await test.case(판번호, async () => {
    await test.step('메인 메뉴 왼쪽 아래 판 번호를 읽는다', async () => {
      const 메뉴 = await 메인메뉴화면.열기(game);
      await verify('메인 메뉴 왼쪽 아래 판 번호를 읽으면 「v2.1.3」이다', await 글읽어보기(() => 메뉴.글(메인메뉴화면.판번호)), 'v2.1.3');
    });
  });

  await test.case(조작안내, async () => {
    await test.step('메인 메뉴 아래 조작 안내를 읽는다', async () => {
      const 메뉴 = await 메인메뉴화면.열기(game);
      const 안내 = 메인메뉴화면.안내글;
      const 이동 = await verify('「이동」이 보인다', await 글읽어보기(() => 메뉴.글(안내.이동)), '이동');
      const 선택 = await verify(
        '「Enter 선택」이 보인다',
        `${await 글읽어보기(() => 메뉴.글(안내.선택키))} ${await 글읽어보기(() => 메뉴.글(안내.선택))}`,
        'Enter 선택',
      );
      const 취소 = await verify(
        '「Esc 취소」가 보인다',
        `${await 글읽어보기(() => 메뉴.글(안내.취소키))} ${await 글읽어보기(() => 메뉴.글(안내.취소))}`,
        'Esc 취소',
      );
      await verify('메인 메뉴 아래 조작 안내를 읽으면 「이동」 · 「Enter 선택」 · 「Esc 취소」가 보인다', 이동 && 선택 && 취소, true);
    });
  });

  await test.case(가이드목차, async () => {
    await test.step('메인 메뉴에서 「Q」를 눌러 게임 가이드를 연다', async () => {
      const 메뉴 = await 메인메뉴화면.열기(game);
      await 메뉴.가이드누르기();
      const 가이드 = await 게임가이드창.기다리기(game);
      const 목차 = await verify('「목차」가 보인다', await 글읽어보기(() => 가이드.목차띠글()), '목차');
      const 장 = await verify(
        '목차에 일곱 장의 제목이 보인다',
        await 글읽어보기(() => 가이드.장제목들()),
        '게임 목표와 규칙 · 조작법 · 폭탄 던지기 · 고기와 식물 키우기 · 화면 보기 · 식물 · 나눔 플레이 경쟁',
      );
      await verify(
        '메인 메뉴에서 「Q」를 눌러 게임 가이드를 열면 「목차」에 「게임 목표와 규칙」 · 「조작법」 · 「폭탄 던지기」 · 「고기와 식물 키우기」 · 「화면 보기」 · 「식물」 · 「나눔 플레이 경쟁」 일곱 장이 보인다',
        목차 && 장,
        true,
      );
    });
  });

  await test.case(기본조작, async () => {
    await test.step('게임 가이드에서 「기본 조작」 장을 연다', async () => {
      const 가이드 = await 게임가이드창.기다리기(game);
      await verify('「기본 조작」 장이 보인다', await 가이드.기본조작열기(), true);
      const 이동 = await verify('「이동」 줄이 보인다', await 글읽어보기(() => 가이드.이동줄글()), '이동');
      const 키들 = await verify(
        '달리기부터 메뉴까지 키가 보인다',
        await 글읽어보기(() => 가이드.기본조작키들()),
        '달리기 Space · 공격 Z · 식물 심기 X · 식물 회복 C · 업그레이드 C · 회수 F · 식물 변경 Q E · 폭탄 Q · 확인 Enter · 취소 Esc · 메뉴 Esc',
      );
      await verify(
        '게임 가이드에서 「기본 조작」 장을 열면 키보드 키가 이동 방향키 · 달리기 Space · 공격 Z · 식물 심기 X · 식물 회복 C · 업그레이드 C · 회수 F · 식물 변경 Q E · 폭탄 Q · 확인 Enter · 취소 Esc · 메뉴 Esc 로 보인다',
        이동 && 키들,
        true,
      );
    });
  });

  await test.case(소리줄, async () => {
    await test.step('메인 메뉴에서 「환경설정」 창을 연다', async () => {
      const 창 = await 환경설정창열기(game);
      const 배치 = await game.layout(환경설정창.창);
      await verify('「환경설정」 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
      const 제목 = await verify('「소 리」가 보인다', await 글읽어보기(() => 창.글(환경설정창.소리제목)), '소 리');
      const 마스터글 = await verify('「마스터 볼륨」이 보인다', await 글읽어보기(() => 창.소리줄글('Master')), '마스터 볼륨');
      const 마스터막대 = await verify('「마스터 볼륨」 조절 막대가 보인다', await 창.소리막대있나('Master'), true);
      const 마스터값 = await verify('「마스터 볼륨」 값이 보인다', (await 글읽어보기(() => 창.소리줄값('Master'))) !== '', true);
      const 배경글 = await verify('「배경 음악」이 보인다', await 글읽어보기(() => 창.소리줄글('Bgm')), '배경 음악');
      const 배경막대 = await verify('「배경 음악」 조절 막대가 보인다', await 창.소리막대있나('Bgm'), true);
      const 배경값 = await verify('「배경 음악」 값이 보인다', (await 글읽어보기(() => 창.소리줄값('Bgm'))) !== '', true);
      const 효과글 = await verify('「효과음」이 보인다', await 글읽어보기(() => 창.소리줄글('Sfx')), '효과음');
      const 효과막대 = await verify('「효과음」 조절 막대가 보인다', await 창.소리막대있나('Sfx'), true);
      const 효과값 = await verify('「효과음」 값이 보인다', (await 글읽어보기(() => 창.소리줄값('Sfx'))) !== '', true);
      await verify(
        '메인 메뉴에서 「환경설정」 창을 열면 「소 리」에 「마스터 볼륨」 · 「배경 음악」 · 「효과음」 조절 막대와 값이 보인다',
        제목 && 마스터글 && 마스터막대 && 마스터값 && 배경글 && 배경막대 && 배경값 && 효과글 && 효과막대 && 효과값,
        true,
      );
    });
  });

  await test.case(온라인랭킹, async () => {
    await test.step('「환경설정」 창에서 「온라인 랭킹」 칸을 읽는다', async () => {
      const 창 = await 열린환경설정창(game);
      const 등록글 = await verify('「온라인 랭킹에 기록 등록」이 보인다', await 글읽어보기(() => 창.글(환경설정창.랭킹등록글)), '온라인 랭킹에 기록 등록');
      const 켜기 = await verify('켜고 끄기가 보인다', await 창.랭킹켜기있나(), true);
      await verify('「환경설정」 창에서 「온라인 랭킹」 칸을 읽으면 「온라인 랭킹에 기록 등록」 켜고 끄기가 보인다', 등록글 && 켜기, true);
    });
  });

  await test.case(언어, async () => {
    await test.step('「환경설정」 창에서 「언 어」 오른쪽 버튼을 누른다', async () => {
      const 창 = await 열린환경설정창(game);
      const 앞 = await 글읽어보기(async () => await 글읽기(game, 메인메뉴화면.버튼글.빠른시작));
      await 창.언어바꾸기('오른쪽');
      const 뒤 = await 글이바뀔때까지(game, 메인메뉴화면.버튼글.빠른시작, 앞);
      await verify('「환경설정」 창에서 「언 어」 오른쪽 버튼을 누르면 메인 메뉴 글이 다른 언어로 바뀐다', 뒤 !== 앞, true);
    });
  });
});
