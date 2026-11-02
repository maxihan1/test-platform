// 목록 밖에서 실행 창을 연다 — 실행 결과 「실패 N건 다시 실행」 · 항목 상세 「입력 값 수정 후 다시 실행」 · 옛 주소 #/cases/:id/run (도메인/실행 §8.10)
// 목록은 줄을 손에 들고 있지만 여기는 tcId 만 안다. 줄과 대상 서버를 읽어 같은 창(RunPickModal)을 띄운다

import { useMemo, useState } from 'react';

import { api, ApiError, type CaseRow, type Platform, type ServiceRow, type User } from './api.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { type 글자표, 지난값글자 } from './pickRun.js';
import { RunPickModal } from './RunPickModal.js';
import { 케이스서비스, 할수있나 } from './role.js';
import { schemaToFields } from './schema.js';
import { Failed, Loading, message, useAsync } from './ui.js';
import { useRunStart } from './useRunStart.js';

type 값들 = Record<string, unknown>;

interface 연것 {
  케이스들: CaseRow[];
  빠진: string[];
  user: User;
  service: ServiceRow | null;
  초기글자: 글자표;
  /** 기준시각 뒤에 저장값이 바뀐 케이스 */
  바뀐저장값: string[];
}

/** 케이스가 선언한 디바이스 가운데 `돌릴` 것만 남긴다. 겹치는 게 없으면 선언 그대로 둔다 — 빈 디바이스로 걸 수는 없다 */
function 디바이스칸(c: CaseRow, 돌릴?: Platform[]): CaseRow {
  if (돌릴 === undefined) return c;
  const 겹침 = c.platforms.filter((p) => 돌릴.includes(p));
  return 겹침.length === 0 ? c : { ...c, platforms: 겹침 };
}

/**
 * @param tcIds 돌릴 것. 한 서비스의 것이어야 한다 — 실행 하나에 서비스가 섞이지 않는다 (SPEC §7)
 * @param 지난값 그 실행에서 쓴 값. 있으면 칸이 그 값으로 열린다(비밀값 칸은 비운다 — pickRun 지난값글자)
 * @param 서버 미리 고를 대상 서버. 다시 실행은 같은 서버가 자연스럽다
 * @param on걸림 걸고 나서. 없으면 onClose 다 — 옛 주소 화면은 닫힘이 목록으로 보내므로 따로 받는다(안 그러면 실행 결과 대신 목록이 뜬다)
 * @param rerunOf 「실패 N건 다시 실행」의 원래 실행. 실으면 서버가 시작 방식을 「실패 다시」로 남긴다 (도메인/실행 §7)
 * @param on걸었다 useRunStart 의 그것 — 실행 기록 결과 칸에서 열었으면 주소를 옮기지 않고 새 실행을 고른다
 * @param 디바이스 케이스마다 돌릴 디바이스. 있으면 그 케이스가 선언한 것 가운데 이것만 담는다 — 실패 다시 실행이 실패한 디바이스만 돌리게
 * @param 기준시각 이 시각 뒤에 저장값이 바뀐 케이스를 창 위에 알린다 — 원래 실행과 다른 값으로 돌 수 있어서다
 */
export function RunWindow({
  tcIds,
  지난값,
  서버,
  onClose,
  on걸림 = onClose,
  rerunOf,
  디바이스,
  기준시각,
  on걸었다,
}: {
  tcIds: string[];
  지난값?: Record<string, { params: 값들; expected: 값들 }>;
  서버?: string;
  onClose: () => void;
  on걸림?: () => void;
  rerunOf?: number;
  디바이스?: Record<string, Platform[]>;
  기준시각?: string;
  on걸었다?: (runId: number) => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const 걸기 = useRunStart(on걸었다);
  // 저장값을 바꿔 새로 읽은 케이스. 여러 건 창도 줄마다 저장한다 (도메인/실행 §8.10)
  const [다시, set다시] = useState<Record<string, CaseRow>>({});
  const [읽기오류, set읽기오류] = useState<string | undefined>(undefined);
  const 열기 = useAsync<연것>(async () => {
    // ponytail: 케이스마다 한 번씩 읽는다(같이 보낸다). 실패가 수백 건인 실행이 생기면 목록 통로에 tcId 거르개를 연다
    // 카탈로그에 없는 번호(404)는 비활성처럼 빼고 알린다 — 작성 반영 때 중복으로 뺀 새 케이스는 파일째 지워져 카탈로그에 안 든다
    const 읽기 = (tcId: string) => api.caseOf(tcId).catch((err: unknown) => (err instanceof ApiError && err.status === 404 ? tcId : Promise.reject(err)));
    const [받은, { user }] = await Promise.all([Promise.all(tcIds.map(읽기)), api.me()]);
    const 읽은 = 받은.filter((c): c is CaseRow => typeof c !== 'string');
    const 없는 = 받은.filter((c): c is string => typeof c === 'string');
    // 띠가 아니라 tcId 접두사가 서비스를 말한다 — 알림 주소로 와서 띠가 다른 서비스여도 그 실행의 서버를 고른다
    const 접두사 = 케이스서비스(tcIds[0] ?? '');
    const 초기글자: 글자표 = {};
    for (const c of 읽은) {
      const 값 = 지난값?.[c.tcId];
      if (값 === undefined) continue;
      초기글자[c.tcId] = {
        params: 지난값글자(schemaToFields(c.paramSchema, c.savedInput?.params, c.savedInput?.savedSecrets.params), 값.params),
        expected: 지난값글자(schemaToFields(c.expectedSchema, c.savedInput?.expected, c.savedInput?.savedSecrets.expected), 값.expected),
      };
    }
    const 기준 = 기준시각 === undefined ? null : new Date(기준시각).getTime();
    return {
      // 비활성은 스캔이 코드에서 지웠다고 본 케이스라 서버가 400 을 낸다. 빼고 그 사실을 창에 적는다
      케이스들: 읽은.filter((c) => c.isActive).map((c) => 디바이스칸(c, 디바이스?.[c.tcId])),
      바뀐저장값:
        기준 === null
          ? []
          : 읽은
              .filter((c) => {
                const 저장 = c.savedInput?.savedAt;
                return c.isActive && 저장 !== undefined && new Date(저장).getTime() > 기준;
              })
              .map((c) => c.tcId),
      빠진: [...읽은.filter((c) => !c.isActive).map((c) => c.tcId), ...없는],
      user,
      service: user.services.find((it) => it.prefix === 접두사) ?? null,
      초기글자,
    };
  }, [tcIds.join(',')]);

  // 저장값을 바꾼 케이스만 새로 읽은 것으로 갈아 낀다. 그릴 때마다 새 배열이면 창의 칸 계산이 매번 다시 돈다
  const 케이스들 = useMemo(
    () => (열기.data === null ? [] : 열기.data.케이스들.map((c) => 다시[c.tcId] ?? c)),
    [열기.data, 다시],
  );

  const 닫기 = (
    <button className="btn ghost" onClick={onClose}>
      {t('닫기')}
    </button>
  );
  if (열기.error !== null || 열기.data === null) {
    return (
      <Modal 제목={t('실행')} onClose={onClose} 버튼={닫기}>
        {열기.error !== null ? <Failed error={열기.error} /> : <Loading />}
      </Modal>
    );
  }
  const 연 = 열기.data;
  // 여는 쪽이 이미 실행 칸을 보지만 옛 주소는 아무나 칠 수 있다 — 버튼만 서고 서버가 403 을 내는 창을 열지 않는다
  const 못한다 = !할수있나(연.user, 케이스서비스(tcIds[0] ?? ''), '실행');
  if (못한다 || 연.케이스들.length === 0) {
    return (
      <Modal 제목={t('실행')} onClose={onClose} 버튼={닫기}>
        <p>{못한다 ? t('실행 권한이 있어야 고치고 돌릴 수 있습니다') : t('실행할 케이스가 없습니다. 고른 것이 전부 비활성이거나 걸러졌습니다')}</p>
      </Modal>
    );
  }

  const 안내들 = [
    읽기오류,
    연.빠진.length === 0 ? undefined : t('비활성이거나 없어 뺀 케이스 {목록}', { 목록: 연.빠진.join(', ') }),
    연.바뀐저장값.length === 0 ? undefined : t('실행 뒤에 저장값이 바뀐 케이스 {목록} — 실패 때와 다른 값으로 돕니다', { 목록: 연.바뀐저장값.join(', ') }),
  ].filter((글): 글 is string => 글 !== undefined);
  const 안내글 = 안내들.length === 0 ? undefined : 안내들.join(' · ');

  return (
    <RunPickModal
      케이스들={케이스들}
      초기글자={연.초기글자}
      초기서버={서버}
      service={연.service}
      user={연.user}
      사유={걸기.사유}
      안내={안내글}
      거는중={걸기.거는중}
      onClose={onClose}
      원래실행={rerunOf}
      on값고침={걸기.사유지우기}
      on다시읽기={(tcId) => {
        // 저장은 이미 됐다. 다시 읽기만 실패하면 「저장값 · 누가 · 언제」가 옛것이라는 사실을 창에 적는다
        set읽기오류(undefined);
        api.caseOf(tcId).then((새) => set다시((전) => ({ ...전, [tcId]: 새 })), (err: unknown) => set읽기오류(message(err, 언어)));
      }}
      onRun={(요청) => void 걸기.걸기(rerunOf === undefined ? 요청 : { ...요청, rerunOf }).then((됨) => { if (됨) on걸림(); })}
    />
  );
}
