import type { GameDriver } from '@platform/kit';

const 세계수 = '/Lumikantle';
const 고기 = '/BossRoomHudCanvas/QuadrantHudRoot/QuadrantHud(Clone)/Block/MeatPill/Num';
const 고양이 = '/Player(Clone)';

async function 있나(game: GameDriver, 주소: string): Promise<boolean> {
  return (await game.find(주소).catch(() => null)) !== null;
}

export async function 스테이지로(game: GameDriver): Promise<{ 들어감: boolean; 누른수: number }> {
  let 누른수 = 0;
  while (!(await 있나(game, 세계수)) && 누른수 < 5) {
    await game.key('Return');
    누른수 += 1;
    await game.waitFor(세계수, { timeoutMs: 4_000 }).catch(() => undefined);
  }
  const 들어감 = await 있나(game, 세계수);
  if (들어감) await game.waitFor(고양이, { timeoutMs: 10_000 }).catch(() => undefined);
  return { 들어감, 누른수 };
}

export async function 고기수(game: GameDriver): Promise<number> {
  return Number(await game.text(고기).catch(() => 'NaN'));
}

export async function 위치(game: GameDriver): Promise<[number, number]> {
  const p = (await game.get(고양이, 'Transform.position')) as number[];
  return [Math.round(p[0] * 10) / 10, Math.round(p[2] * 10) / 10];
}

export async function 걸어가기(game: GameDriver, 목표: [number, number], 한도초 = 6): Promise<{ 닿음: boolean; 자리: [number, number] }> {
  const 끝 = Date.now() + 한도초 * 1000;
  let 앞 = await 위치(game);
  let 멈춘때 = Date.now();
  const 눌린: string[] = [];
  let 비킨수 = 0;
  try {
    for (;;) {
      const 지금 = await 위치(game);
      const dx = 목표[0] - 지금[0];
      const dz = 목표[1] - 지금[1];
      if (Math.abs(dx) < 0.6 && Math.abs(dz) < 0.6) return { 닿음: true, 자리: 지금 };
      if (Math.hypot(지금[0] - 앞[0], 지금[1] - 앞[1]) > 0.3) {
        앞 = 지금;
        멈춘때 = Date.now();
      }
      if (Date.now() > 끝) return { 닿음: false, 자리: 지금 };
      if (Date.now() - 멈춘때 > 800) {
        if (비킨수 >= 2) return { 닿음: false, 자리: 지금 };
        for (const k of 눌린.splice(0)) await game.keyUp(k);
        const 옆 = 비킨수 === 0 ? (dx > 0 ? 'RightArrow' : 'LeftArrow') : (dz > 0 ? 'UpArrow' : 'DownArrow');
        await game.key(옆, { duration: 0.6 });
        비킨수 += 1;
        멈춘때 = Date.now();
        continue;
      }
      const 원함 = [
        ...(Math.abs(dx) >= 0.4 ? [dx > 0 ? 'RightArrow' : 'LeftArrow'] : []),
        ...(Math.abs(dz) >= 0.4 ? [dz > 0 ? 'UpArrow' : 'DownArrow'] : []),
      ];
      for (const k of [...눌린]) {
        if (!원함.includes(k)) {
          await game.keyUp(k);
          눌린.splice(눌린.indexOf(k), 1);
        }
      }
      for (const k of 원함) {
        if (!눌린.includes(k)) {
          await game.keyDown(k);
          눌린.push(k);
        }
      }
    }
  } finally {
    for (const k of 눌린) await game.keyUp(k);
  }
}

export async function 심기(game: GameDriver, 자리들: [number, number][]): Promise<string[]> {
  const 기록: string[] = [];
  for (const 자리 of 자리들) {
    const 감 = await 걸어가기(game, 자리);
    const 앞고기 = await 고기수(game);
    let 뒤고기 = 앞고기;
    for (let i = 0; i < 2 && 뒤고기 === 앞고기; i += 1) {
      await game.key('X');
      await game.key('X');
      const 끝 = Date.now() + 1_500;
      while (뒤고기 === 앞고기 && Date.now() < 끝) 뒤고기 = await 고기수(game);
    }
    기록.push(`${감.자리.join(',')} ${감.닿음 ? '' : '못닿음 '}고기 ${앞고기}→${뒤고기}`);
  }
  return 기록;
}

async function 글(game: GameDriver, 주소: string): Promise<string> {
  return (await game.text(주소).catch(() => '?')).replace(/<[^>]+>/g, '');
}

export async function 다시스테이지로(game: GameDriver): Promise<{ 들어감: boolean; 누른수: number }> {
  let 누른수 = 0;
  while (!(await 있나(game, '/CharSelectLocal UI Canvas')) && 누른수 < 6) {
    await game.key('Return');
    누른수 += 1;
    await game.waitFor('/CharSelectLocal UI Canvas', { timeoutMs: 2_000 }).catch(() => undefined);
  }
  await game.waitFor('/CharSelectLocal UI Canvas', { timeoutMs: 5_000 }).catch(() => undefined);
  const 뒤 = await 스테이지로(game);
  return { 들어감: 뒤.들어감, 누른수: 누른수 + 뒤.누른수 };
}

export async function 줍고심기(game: GameDriver, 자리들: [number, number][], 버틸초: number, 먼저심은: string[] = []): Promise<{ 판: string[]; 끝글: string }> {
  const 시작 = Date.now();
  const 판: string[] = [];
  let 순번 = 1;
  let 다음 = 0;
  let 먹일 = 0;
  const 심은: [number, number][] = [];
  const 심긴자리 = (줄: string): void => {
    const m = /^(-?[\d.]+),(-?[\d.]+) .*고기 (\d+)→(\d+)/.exec(줄);
    if (m && Number(m[4]) < Number(m[3])) 심은.push([Number(m[1]), Number(m[2])]);
  };
  for (const 줄 of 먼저심은) 심긴자리(줄);
  const 초 = (): number => Math.round((Date.now() - 시작) / 1000);
  while (Date.now() - 시작 < 버틸초 * 1000) {
    if (await 있나(game, '//*[@name=CeremonyContinueGuide]')) {
      판.push(`${초()}s 끝 연출 점수 ${await 글(game, '//*[@name=ScoreLabel]')}`);
      break;
    }
    const 고기 = await 고기수(game);
    if (고기 >= 5 && 다음 < 자리들.length) {
      const [줄] = await 심기(game, [자리들[다음]]);
      판.push(`${초()}s 웨이브 ${await 글(game, '//*[@name=WaveText]')} 심기 ${줄}`);
      심긴자리(줄);
      다음 += 1;
      continue;
    }
    if (고기 >= 5 && 다음 >= 자리들.length) {
      const 식물들 = await 심긴식물(game);
      if (식물들.length > 0) {
        const 자리 = 식물들[먹일 % 식물들.length];
        먹일 += 1;
        const 줄 = await 보고먹이기(game, 자리);
        판.push(`${초()}s 웨이브 ${await 글(game, '//*[@name=WaveText]')} 먹이 ${자리.join(',')} ${줄}`);
        continue;
      }
    }
    const 떨굼 = (await game.get(`//*[@name=MeatDrop(Clone)][${순번}]`, 'Transform.position').catch(() => null)) as number[] | null;
    if (떨굼 && 떨굼[2] > 23.5 && 떨굼[2] < 42.5) {
      const 감 = await 걸어가기(game, [떨굼[0], 떨굼[2]], 4);
      const 뒤 = await 고기수(game);
      if (뒤 > 고기) {
        판.push(`${초()}s 줍기 ${떨굼[0].toFixed(1)},${떨굼[2].toFixed(1)} 고기 ${고기}→${뒤}`);
        continue;
      }
      if (!감.닿음) 판.push(`${초()}s 못닿음 ${떨굼[0].toFixed(1)},${떨굼[2].toFixed(1)} 멈춘 ${감.자리.join(',')}`);
    }
    순번 = 순번 >= 120 ? 1 : 순번 + 1;
    for (let i = 0; i < 3; i += 1) await game.key('Z');

    if (판.length > 45) 판.shift();
  }
  return { 판, 끝글: `${초()}s 웨이브 ${await 글(game, '//*[@name=WaveText]')} 남은 ${await 글(game, '//*[@name=LeftMonsterText]')} 고기 ${await 고기수(game)}` };
}

export async function 한판(game: GameDriver, 버틸초 = 300): Promise<{ 이김: boolean; 심음: string[]; 판: string[]; 끝: string }> {
  const 들어감 = await 다시스테이지로(game);
  if (!들어감.들어감) return { 이김: false, 심음: ['못 들어감'], 판: [], 끝: '' };
  const 심음 = await 심기(game, [[24.9, 27.1], [34, 34.6], [17.5, 27.1], [7.8, 31.5]]);
  if (await 있나(game, '//*[@name=CeremonyContinueGuide]')) 심음.push('판 중에 끝 표시가 잡힘');
  const 뒤 = await 줍고심기(game, [[28.7, 35.5], [12.6, 35.9], [30.5, 31.5], [12, 35.5], [33, 29], [8.5, 27], [21.5, 28.5], [30, 25.5], [11, 25.5], [5.5, 36]], 버틸초, 심음);
  return { 이김: /승/.test(await 글(game, '//*[@name=Txt]')), 심음, 판: 뒤.판, 끝: 뒤.끝글 };
}

export async function 먹이(game: GameDriver): Promise<string[]> {
  const 기록: string[] = [];
  for (const [이름, 초] of [['C 짧게', 0], ['C 짧게 또', 0], ['C 1초', 1]] as const) {
    const 앞 = await 고기수(game);
    await game.key('C', 초 ? { duration: 초 } : undefined);
    const 끝 = Date.now() + 1_500;
    let 뒤 = 앞;
    while (뒤 === 앞 && Date.now() < 끝) 뒤 = await 고기수(game);
    기록.push(`${이름} 고기 ${앞}→${뒤}`);
  }
  return 기록;
}

export async function 회수(game: GameDriver): Promise<string> {
  const 앞 = await 고기수(game);
  await game.key('F');
  const 끝 = Date.now() + 3_000;
  let 뒤 = 앞;
  while (뒤 === 앞 && Date.now() < 끝) 뒤 = await 고기수(game);
  return `F 고기 ${앞}→${뒤}`;
}

export async function 제자리심기(game: GameDriver): Promise<string[]> {
  return await 심기(game, [await 위치(game)]);
}

const 식물종류 = ['Blaster', 'Mushroom', 'Poisoner', 'RedFlower', 'Sniper'];

export async function 심긴식물주소들(game: GameDriver): Promise<string[]> {
  const 주소들: string[] = [];
  for (const 종류 of 식물종류) {
    for (let 레벨 = 1; 레벨 <= 5; 레벨 += 1) {
      const 틀 = `/PooledObjectsRoot/${종류}_Level${레벨}/${종류}_Level${레벨}(Clone)`;
      const 하나 = await game.find(틀).then(
        (f) => (f === null ? 0 : 1),
        () => 2,
      );
      if (하나 === 1) 주소들.push(틀);
      if (하나 !== 2) continue;
      for (let 순번 = 0; 순번 < 12; 순번 += 1) {
        if ((await game.find(`${틀}[${순번}]`).catch(() => null)) === null) break;
        주소들.push(`${틀}[${순번}]`);
      }
    }
  }
  return 주소들;
}

export async function 심긴식물(game: GameDriver): Promise<[number, number][]> {
  const 자리: [number, number][] = [];
  for (const 주소 of await 심긴식물주소들(game)) {
    const p = (await game.get(주소, 'Transform.position').catch(() => null)) as number[] | null;
    if (p) 자리.push([Math.round(p[0] * 10) / 10, Math.round(p[2] * 10) / 10]);
  }
  return 자리;
}

async function 보고먹이기(game: GameDriver, 식물: [number, number]): Promise<string> {
  const 감 = await 걸어가기(game, [식물[0] - 1.3, 식물[1]], 4);
  await game.key('RightArrow', { duration: 0.08 });
  const 앞 = await 고기수(game);
  for (let i = 0; i < 2; i += 1) await game.key('C', { duration: 1 });
  const 끝 = Date.now() + 1_500;
  while (Date.now() < 끝 && (await 고기수(game)) === 앞) await game.find(고기);
  return `${감.닿음 ? '' : '못닿음 '}고기 ${앞}→${await 고기수(game)} ${await 글(game, '//*[@name=MeatText]')}`;
}

export async function 하나심고멈춤(game: GameDriver): Promise<{ 심음: string[]; 고양이: [number, number] }> {
  const 들어감 = await 다시스테이지로(game);
  if (!들어감.들어감) return { 심음: ['못 들어감'], 고양이: [0, 0] };
  const 심음 = await 심기(game, [[24.9, 27.1]]);
  return { 심음, 고양이: await 위치(game) };
}

export async function 거리먹이(game: GameDriver, 식물: [number, number], 떨어짐: [number, number][], 바라보기 = false): Promise<string[]> {
  const 기록: string[] = [];
  for (const [ox, oz] of 떨어짐) {
    const 감 = await 걸어가기(game, [식물[0] + ox, 식물[1] + oz], 5);
    if (바라보기) {
      const 키 = Math.abs(ox) >= Math.abs(oz) ? (ox > 0 ? 'LeftArrow' : 'RightArrow') : oz > 0 ? 'DownArrow' : 'UpArrow';
      await game.key(키, { duration: 0.08 });
    }
    const 앞 = await 고기수(game);
    await game.key('C', { duration: 1 });
    const 끝 = Date.now() + 1_500;
    let 뒤 = 앞;
    while (뒤 === 앞 && Date.now() < 끝) 뒤 = await 고기수(game);
    기록.push(`떨어짐 ${ox},${oz} 선 자리 ${감.자리.join(',')} 고기 ${앞}→${뒤} ${await 글(game, '//*[@name=MeatText]')}`);
  }
  return 기록;
}

export async function 이어하기(game: GameDriver, 버틸초 = 300): Promise<{ 이김: boolean; 판: string[]; 끝: string }> {
  const 뒤 = await 줍고심기(game, [[34, 34.6], [24.9, 27.1], [17.5, 27.1], [7.8, 31.5], [28.7, 31.4], [12.6, 35.9], [29, 36], [12, 31.5], [33, 29], [8.5, 27], [21.5, 28.5], [30, 25.5], [11, 25.5], [5.5, 36]], 버틸초);
  return { 이김: /승/.test(await 글(game, '//*[@name=Txt]')), 판: 뒤.판, 끝: 뒤.끝글 };
}
