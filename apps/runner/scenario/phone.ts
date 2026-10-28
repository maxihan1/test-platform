// 앱 · 게임 단계가 같이 쓰는 폰 연결 하나 — 첫 앱 단계가 부를 때 열고 시나리오 끝(미룬 뒷정리 뒤)에 닫는다. 단계 사이에 앱을 다시 켜지 않는다 (SPEC 도메인/시나리오 §3.7 결정 16)

import type { ScenarioPhone, ScenarioPhoneOpener } from '@platform/kit/scenario';
import type { DeviceInfo } from '@platform/kit';

import { 남김 } from './parts.js';

export interface 폰자리 {
  얻기(): Promise<ScenarioPhone>;
  닫기(): Promise<void>;
}

// 여는 일은 kit 이 한다. 고정 spec 은 kit 을 값으로 못 불러, 앱 케이스 파일을 import 한 뒤 등록부에서 꺼낸다(wire.ts 폰꺼냄)
export function 새폰자리(
  꺼낸다: () => ScenarioPhoneOpener | undefined,
  env: Record<string, string | undefined>,
  기기를적는다: (device: DeviceInfo) => void,
): 폰자리 {
  // 여는 중인 약속을 쥔다 — 첫 앱 단계가 한도에 걸려 떠나도 연결은 뒤늦게 열린다. 끝에 그것까지 닫아야 팜 폰이 안 붙들린다
  let 여는중: Promise<ScenarioPhone> | undefined;
  let 여는것: ScenarioPhoneOpener | undefined;
  return {
    얻기() {
      if (여는중 !== undefined) return 여는중;
      여는것 = 꺼낸다();
      if (여는것 === undefined) {
        return Promise.reject(new Error('앱 · 게임 단계 케이스가 폰 연결을 올리지 않았다 — 그 케이스가 android 를 선언했는지 본다'));
      }
      여는중 = 여는것.open(env).then((폰) => {
        if (폰.device !== undefined) 기기를적는다(폰.device);
        return 폰;
      });
      return 여는중;
    },
    async 닫기() {
      if (여는중 === undefined || 여는것 === undefined) return;
      // 못 열었으면 닫을 것이 없다 — 그 오류는 그 단계의 실패로 이미 남았다
      const 폰 = await 여는중.catch(() => undefined);
      if (폰 === undefined) return;
      // 못 닫아도 판정은 그대로다. 러너가 연결 번호 파일로 다시 닫는다
      await 여는것.close(폰).catch(남김('폰 연결을 닫지 못했다'));
    },
  };
}
