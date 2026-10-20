// 통과하지 못한 android 항목의 팜 증적(화면 영상 · logcat)을 실행 폴더로 받는다 (SPEC 러너 §5.2 「디바이스 팜 접속 방식」)

import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import type { ItemStatus } from '@platform/kit';
import { APPIUM_SESSION_ID_FILE, FARM_EVIDENCE_DIR, runDir } from '@platform/kit';
import { farmArtifacts } from 'appium-cli';

const 알림 = (말: string, err: unknown): void =>
  console.error(`[runner] ${말}: ${err instanceof Error ? err.message : String(err)}`);

/**
 * 연결이 닫힌 뒤에 부른다 — 팜은 닫힌 연결의 것만 내준다. 영상 한 조각이 100MB 를 넘어 통과 항목은 받지 않는다.
 * 무엇이 실패해도 던지지 않는다 — 이미 admin 에 답한 판정은 바뀌지 않고, 증적이 없을 뿐이다
 */
export async function 팜증적을받는다(runId: number, historyId: number, status: ItemStatus): Promise<void> {
  const 폴더 = runDir(String(runId), String(historyId));
  const idFile = join(폴더, APPIUM_SESSION_ID_FILE);
  let sessionId: string;
  try {
    sessionId = (await readFile(idFile, 'utf8')).trim();
  } catch (err) {
    // 연결을 못 열었으면 파일이 없다
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') 알림('팜 증적을 받을 연결 번호를 읽지 못했다', err);
    return;
  }
  const raw = process.env.PLATFORM_APPIUM_URL;
  try {
    // 케이스 테스트 실행(runId 0)은 내 컴퓨터 러너라 admin 이 이 폴더를 못 본다
    if (runId === 0 || status === 'PASS' || sessionId === '' || raw === undefined || raw === '') return;
    const 받을곳 = join(폴더, FARM_EVIDENCE_DIR);
    try {
      const { errors } = await farmArtifacts(raw, sessionId, 받을곳);
      // 팜이 녹화를 못 했어도 받은 것(logcat 등)은 둔다
      if (errors.length > 0) console.error(`[runner] 팜이 증적 일부를 만들지 못했다: ${errors.join(' · ')}`);
    } catch (err) {
      // 팜이 아닌 Appium 은 이 주소가 없다(404). 반쯤 받은 파일이 온전한 영상처럼 화면에 뜨지 않게 폴더째 지운다
      알림('팜 증적을 받지 못했다', err);
      await rm(받을곳, { recursive: true, force: true }).catch((e: unknown) => 알림('반쯤 받은 팜 증적을 지우지 못했다', e));
    }
  } finally {
    await rm(idFile, { force: true }).catch((err: unknown) => 알림('팜 증적 연결 번호 파일을 지우지 못했다', err));
  }
}
