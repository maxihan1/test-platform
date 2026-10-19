// 운영 계정의 사이드바 「설정」 곁에 띄울 가입 신청 대기 수를 읽는 훅

import { useEffect, useState } from 'react';

import { api } from './api.js';

/**
 * 승인을 기다리는 가입 신청 수. 읽지 않는 사람(운영이 아님 · 휴대폰)은 읽지도 않고 0 이다.
 *
 * `current` 가 바뀔 때마다 다시 읽는다 — 설정에서 수락하고 나오면 숫자가 줄어야 한다.
 * 읽기가 실패하면 0 이다. 표시 하나 때문에 오류를 띄우지 않는다
 */
export function use가입대기수(읽나: boolean, current: string): number {
  const [수, set수] = useState(0);

  useEffect(() => {
    if (!읽나) {
      set수(0);
      return;
    }
    let 낡음 = false;
    api
      .settingsUsers()
      .then(({ items }) => {
        if (!낡음) set수(items.filter((it) => it.isApproved === false).length);
      })
      .catch(() => {
        if (!낡음) set수(0);
      });
    return () => {
      낡음 = true;
    };
  }, [읽나, current]);

  return 수;
}
