// 게임 항목의 단계 · 실패 스크린샷과 실패 증적 두 파일(오브젝트 목록 · 게임 오류) — game.ts 에서 떼어 냈다 (도메인/게임 §3.10 「실행 결과」)

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Game } from 'control-cli';

import { runDir, saveShot } from './artifacts.js';
import type { 게임오류 } from './game.js';
import { FARM_EVIDENCE_DIR, GAME_ERRORS_FILE, GAME_TREE_FILE } from './protocol.js';

const 글 = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** 윈도우 PC 항목의 단계 · 실패 스크린샷 — Appium 이 없어 게임이 프레임 끝에서 찍은 화면을 쓴다 (공통/3-공유계약 「윈도우 PC 게임」) */
export function captureGame(game: Game, seq: number): Promise<string | undefined> {
  return saveShot(seq, async (path) => writeFile(path, await game.screenshot('png')));
}

/**
 * 통과 못 한 항목의 두 파일을 팜 증적 폴더에 둔다 — 화면 영상 · logcat 과 같은 「받기」 줄에 뜬다.
 * 오브젝트 목록은 케이스가 쓰는 주소(경로) 그대로라 「이름이 바뀌었나 · 창이 안 열렸나」를 바로 본다. 무엇이 실패해도 던지지 않는다 — 이미 난 판정을 덮지 않는다
 */
// since — E2E 시나리오는 단계 사이에 게임을 다시 켜지 않아, 그 단계가 시작할 때 받아 둔 last 를 넘겨 그 단계 몫만 남긴다 (도메인/시나리오 §3.7 결정 16)
// 안정화 — 정기 실행(PLATFORM_STABILITY=1)이면 통과 항목도 오류 파일을 남긴다. 통과면 오브젝트 목록은 빼고 Exception 만 남기고,
// 오류가 없어도 머리 줄만 있는 파일을 만든다 — 안정화 집계가 「못 읽음」과 「없음」을 가른다 (도메인/안정화 §3.15 결정 3 · 「집계」 분모)
// 다시켜기전오류를꺼낸다 — 케이스 도중 game.restart() 앞 게임의 오류. 있으면 앞 게임 것은 since 뒤만, 그 뒤 게임 것은 전부 합친다
export async function 게임증적을남긴다(game: Game & { 다시켜기전오류를꺼낸다?(): 게임오류[][] }, runId: string, historyId: string, since = 0, 안정화?: { 통과: boolean }): Promise<void> {
  // 내 컴퓨터 테스트 실행은 admin 이 이 폴더를 못 본다
  if (runId === '0') return;
  const { flatten } = await import('control-cli');
  const 폴더 = join(runDir(runId, historyId), FARM_EVIDENCE_DIR);
  const 남긴다 = async (이름: string, 만든다: () => Promise<string | null>): Promise<void> => {
    try {
      const 내용 = await 만든다();
      if (내용 === null) return;
      await mkdir(폴더, { recursive: true });
      await writeFile(join(폴더, 이름), 내용);
    } catch (err) {
      console.error(`[kit] 게임 증적 ${이름} 을 남기지 못했다: ${글(err)}`);
    }
  };
  if (안정화?.통과 !== true) await 남긴다(GAME_TREE_FILE, async () => {
    const t = await game.tree();
    const 줄들 = flatten(t.tree).map(
      (e) => `${e.path}${e.node.text === undefined ? '' : ` ${JSON.stringify(e.node.text)}`}${e.node.interactable === false ? ' 잠김' : ''}`,
    );
    return [`# 장면 ${t.scene} · 화면 ${t.screen[0]}×${t.screen[1]} · 켜진 오브젝트 ${줄들.length}개`, ...줄들, ''].join('\n');
  });
  // 항목마다 앱을 끄고 다시 켜서(app.ts 앱을켠다 — 게임 연결은 noReset) 0 부터 읽으면 이 케이스 동안의 것만 온다. 없으면 파일을 안 만든다(안정화는 머리 줄만)
  await 남긴다(GAME_ERRORS_FILE, async () => {
    const 앞 = game.다시켜기전오류를꺼낸다?.() ?? [];
    // 다시 켰으면 지금 게임은 번호가 1 부터라 since 로 거르면 앞 줄이 빠진다 — 지금 게임 것은 처음부터 읽는다
    const r = await game.errors(앞.length > 0 ? 0 : since);
    const 모은 = [...앞.flatMap((목록, i) => (i === 0 ? 목록.filter((e) => e.seq > since) : 목록)), ...r.errors];
    const 오류 = 안정화?.통과 === true ? 모은.filter((e) => e.type === 'Exception') : 모은;
    if (오류.length === 0 && 안정화 === undefined) return null;
    const 머리 = [
      안정화?.통과 === true ? `# 게임 Exception ${오류.length}개 — 통과 항목이라 Exception 만 남겼습니다` : `# 게임 오류 ${오류.length}개`,
      ...(r.dropped ? [`# 앞의 ${r.dropped}개는 게임이 들고 있는 수(200)를 넘겨 밀려났습니다`] : []),
      ...(r.restarted || 앞.length > 0 ? ['# 케이스 도중 게임이 다시 켜졌습니다'] : []),
    ];
    // 시각은 SDK 0.7 부터 오는 UTC occurredAt 을 앞세운다 — 안정화 집계가 단계를 맞춘다. 메시지는 한 줄로 접어 다음 줄부터가 스택이 되게 한다
    return [...머리, ...오류.map((e) => `\n#${e.seq} ${e.occurredAt ?? e.time} ${e.type}: ${e.message.replace(/\s*\n\s*/g, ' ')}\n${e.stack}`), ''].join('\n');
  });
}
