import type { GameDriver } from '@platform/kit';

export const 빠른시작버튼 = '/MainMenu UI Canvas/Buttons/QuickStartBtn';
const 인원수제목 = '/MainMenu UI Canvas/PlayerCountPanel/Title';
const 참가창 = '/MainMenu UI Canvas/ControllerRegistrationPanel/Window';
const 메뉴가이드 = '/MainMenu UI Canvas/GuideBook';
const 메뉴설정 = '/MainMenu UI Canvas/SettingPanel';
const 메뉴설정닫기 = '/MainMenu UI Canvas/SettingPanel/SettingExitBtn';
const 판화면 = '/BossRoomHudCanvas';
const 일시정지메인메뉴 = '/BossRoomHudCanvas/PauseRootPanel/PauseWindow/ButtonsLayout/ToMainBtn';
const 일시정지설정닫기 = '/BossRoomHudCanvas/PauseRootPanel/SettingPanel/SettingExitBtn';
const 일시정지가이드 = '/BossRoomHudCanvas/PauseRootPanel/GuideBook';
const 끝계속 = '/BossRoomHudCanvas/EndingUIRoot/EndingUI/CeremonyContinueGuide';
const 결과창 = '/BossRoomHudCanvas/EndingUIRoot/EndingUI/RivalryResult';
const 캐릭터선택 = '/CharSelectLocal UI Canvas';
const 알림창 = '/CharSelectLocal UI Canvas/popup';
const 알림확인 = '/CharSelectLocal UI Canvas/popup/Btn/Confirm';

export const 글뽑기 = (글: string): string => 글.replace(/<[^>]+>/g, '').trim();

export async function 있나(game: GameDriver, 주소: string): Promise<boolean> {
  return (await game.find(주소).catch(() => null)) !== null;
}

export async function 화면안에있나(game: GameDriver, 주소: string): Promise<boolean> {
  const 찾음 = await game.find(주소).catch(() => null);
  if (찾음 === null) return false;
  const y = 찾음.rect === undefined ? 찾음.y : 찾음.rect[1] + 찾음.rect[3] / 2;
  return y !== undefined && y >= 0 && y <= (찾음.screen?.[1] ?? 1080);
}

export async function 글읽기(game: GameDriver, 주소: string): Promise<string> {
  return 글뽑기(await game.text(주소));
}

export async function 뜰때까지(game: GameDriver, 주소: string, 한도ms = 10_000): Promise<boolean> {
  return await game.waitFor(주소, { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 사라질때까지(game: GameDriver, 주소: string, 한도ms = 10_000): Promise<boolean> {
  return await game.waitFor(주소, { gone: true, timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 로딩중인가(game: GameDriver): Promise<boolean> {
  return Number(await game.get('/LoadingScreen', 'CanvasGroup.alpha').catch(() => 0)) > 0;
}

export async function 로딩끝날때까지(game: GameDriver, 한도ms = 30_000): Promise<void> {
  if (!(await 로딩중인가(game))) return;
  await game.waitForValue('/LoadingScreen', 'CanvasGroup.alpha', 0, { timeoutMs: 한도ms }).catch(() => undefined);
}

export async function 메인메뉴만떠있나(game: GameDriver): Promise<boolean> {
  if (!(await 있나(game, 빠른시작버튼))) return false;
  if (await 있나(game, 인원수제목)) return false;
  if (await 있나(game, 참가창)) return false;
  if (await 있나(game, 메뉴가이드)) return false;
  return !(await 화면안에있나(game, 메뉴설정));
}

async function 한걸음물러서기(game: GameDriver): Promise<void> {
  if (await 로딩중인가(game)) {
    await 로딩끝날때까지(game);
    return;
  }
  if (await 있나(game, 판화면)) {
    if (await 있나(game, 일시정지설정닫기)) return await game.click(일시정지설정닫기);
    if (await 있나(game, 일시정지가이드)) return await game.key('Escape');
    if (await 있나(game, 일시정지메인메뉴)) {
      await game.click(일시정지메인메뉴);
      await 뜰때까지(game, 빠른시작버튼, 30_000);
      return;
    }
    if ((await 있나(game, 끝계속)) || (await 있나(game, 결과창))) {
      await game.key('Return');
      await 뜰때까지(game, 캐릭터선택, 5_000);
      return;
    }
    await game.key('Escape');
    await 뜰때까지(game, 일시정지메인메뉴, 3_000);
    return;
  }
  if (await 있나(game, 캐릭터선택)) {
    if (await 있나(game, 알림확인)) {
      await game.click(알림확인);
      await 뜰때까지(game, 빠른시작버튼, 30_000);
      return;
    }
    await game.key('Escape');
    await 뜰때까지(game, 알림창, 2_000);
    return;
  }
  if (await 화면안에있나(game, 메뉴설정)) return await game.click(메뉴설정닫기);
  await game.key('Escape');
  await 뜰때까지(game, 빠른시작버튼, 2_000);
}

export async function 메인메뉴로(game: GameDriver): Promise<void> {
  for (let 번 = 0; 번 < 14; 번 += 1) {
    if (await 메인메뉴만떠있나(game)) return;
    await 한걸음물러서기(game);
  }
  await game.restart();
  await game.waitFor(빠른시작버튼, { timeoutMs: 120_000 });
}
