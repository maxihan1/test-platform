import type { GameDriver } from '@platform/kit';

export const 글자포함 = (범위: string, 문구: string): string => `${범위}//*[contains(@text,${문구})]`;

export const 색벗기기 = (글: string): string => 글.replace(/<\/?[^>]+>/g, '');

export async function 뜨는지(game: GameDriver, 주소: string, timeoutMs = 10_000): Promise<boolean> {
  return game.waitFor(주소, { timeoutMs }).then(
    () => true,
    () => false,
  );
}

export async function 사라지는지(game: GameDriver, 주소: string, timeoutMs = 10_000): Promise<boolean> {
  return game.waitFor(주소, { gone: true, timeoutMs }).then(
    () => true,
    () => false,
  );
}

export async function 있는지(game: GameDriver, 주소: string): Promise<boolean> {
  return (await game.find(주소)) !== null;
}

export async function 줄수(game: GameDriver, 목록: string, 최대 = 60): Promise<number> {
  let 수 = 0;
  while (수 < 최대 && (await game.find(`${목록}/Row[${수}]`)) !== null) 수 += 1;
  return 수;
}

export async function 줄글들(game: GameDriver, 목록: string, 칸: string, 최대 = 60): Promise<string[]> {
  const 수 = await 줄수(game, 목록, 최대);
  const 글들: string[] = [];
  for (let i = 0; i < 수; i += 1) 글들.push(색벗기기(await game.text(`${목록}/Row[${i}]/${칸}`)));
  return 글들;
}

export const 숫자 = (글: string): number => Number(글.replace(/[^0-9]/g, ''));

export const 화면글자 = (문구: string): string => `//*[contains(@text,${문구})]`;
