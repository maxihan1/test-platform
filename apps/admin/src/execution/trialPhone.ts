// 케이스 테스트 실행의 팜 폰 길 — 누른 사람 토큰으로 빈 폰을 잡고 돌린 뒤 놓는다. trialRoutes.ts 가 300줄을 넘어 떼어 냈다
// 옛 꼴 케이스(케이스 1건짜리 목록)와 프로시저가 같은 길을 탄다 (도메인/실행 §3.2 「테스트 모드」 · 「테스트 프로시저 실행」)

import type { ExecuteRequest, ExecuteResponse } from '@platform/kit';

import { 깔앞앱파일, 깔앱파일 } from './buildFile.js';
import { 거를패키지, 팜주소, 팜폰으로, 폰Chrome으로 } from './farm.js';
import { 사람팜토큰 } from './farmToken.js';

/** 러너에 안 보내고 닫을 때의 답 */
export type 못감함수 = (까닭: string, stack?: string) => ExecuteResponse;
export type 폰화면함수 = (url: string | undefined, 이름?: string) => void;

// 러너가 끊긴 실행에 주는 모양과 같다 — 화면이 이 글자로 「중단」을 가른다
export const 중단글 = 'ABORTED';

/**
 * Android 앱 · 게임 — 정식 실행과 같은 길로 누른 사람 토큰으로 팜 빈 폰을 잡고 놓는다(러너 §5.2 「디바이스 팜 접속 방식」).
 * 앱 파일은 폰을 잡기 전에 정한다 — 스토어 앱(패키지 이름)이면 그 앱이 깔린 폰만 잡아야 해서다(러너 §5.2 「플레이스토어 앱 — 패키지 이름」).
 * 올린 빌드의 서명 주소는 1~2시간 유효라 폰을 잡는 몇 초가 넉넉하다 (도메인/실행 §3.11).
 * 'chrome' 이면 모바일 웹이라 그 폰 Chrome 에서 돈다 (도메인/실행 §3.2 「모바일 웹 실행 위치」)
 */
export async function 팜폰에서돌린다(
  요청: ExecuteRequest,
  사람: string,
  앱재료: { serviceId: number; env: string; appPath: string | null } | 'chrome',
  폰화면: 폰화면함수,
  보내기: (body: ExecuteRequest) => Promise<ExecuteResponse>,
  멈췄나: () => boolean,
  못감: 못감함수,
): Promise<ExecuteResponse> {
  const 팜 = 팜주소();
  // 받은 뒤 서버를 다시 띄우며 값을 지웠을 때뿐이다 — 통로가 FARM_OFF 로 먼저 거절한다
  if (팜 === undefined) return 못감('이 서버에는 Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않습니다');
  let 토큰: string | undefined;
  try {
    토큰 = await 사람팜토큰(사람);
  } catch (err) {
    return 못감('누른 사람의 Device VISION 토큰을 찾지 못했습니다', err instanceof Error ? err.message : String(err));
  }
  let app: string | null = null;
  let 앞: string | null = null;
  if (앱재료 !== 'chrome') {
    try {
      app = await 깔앱파일(앱재료.serviceId, 앱재료.env, 앱재료.appPath);
    } catch (err) {
      return 못감(err instanceof Error ? err.message : String(err));
    }
    // 정식 실행과 같이 앞 빌드도 싣는다 — 옛판에서올리기 케이스를 테스트 실행으로도 돌린다 (도메인/러너 §5.2 「범용 앱 부품」 APP-F3-08).
    // 못 읽으면 빼고 돌린다 — 앞 빌드를 안 쓰는 케이스까지 미실행으로 닫지 않는다. 쓰는 케이스는 부품이 「앞 빌드가 없다」로 던진다
    앞 = await 깔앞앱파일(앱재료.serviceId, 앱재료.env).catch((err: unknown) => {
      console.error(`[trial] 앞 빌드를 못 읽었다: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    });
  }
  // 토큰 · 앱 파일을 고르는 사이에 중단했으면 폰을 잡지 않는다. 잡는 중에 중단하면 잡은 뒤 보내기가 한 번 더 보고 놓는다
  if (멈췄나()) return 못감(중단글);
  const 못잡음 = (까닭: string): ExecuteResponse => 못감(까닭);
  const 결과 =
    앱재료 === 'chrome'
      ? await 폰Chrome으로(
          팜,
          async (칸, 화면, 이름) => {
            if (화면 !== undefined) 폰화면(화면, 이름);
            return 보내기({ ...요청, ...칸 });
          },
          못잡음,
          토큰,
        )
      : await 팜폰으로(
          팜,
          async (udid, 화면, 이름) => {
            if (화면 !== undefined) 폰화면(화면, 이름);
            return 보내기({ ...요청, udid, ...(토큰 !== undefined && { farmToken: 토큰 }), ...(app !== null && { app }), ...(앞 !== null && { previousApp: 앞 }) });
          },
          못잡음,
          undefined,
          undefined,
          undefined,
          토큰,
          거를패키지(app),
        );
  // 팜폰으로 가 폰을 놓고 돌아왔다 — 결과를 적기 전 틈에 닫힌 링크를 내지 않는다
  폰화면(undefined);
  return 결과;
}
