// 목록 밖에서 실행 창을 연다 — 실행 결과 「실패 N건 다시 실행」 · 항목 상세 「값 바꿔 재실행」 · 옛 주소 #/cases/:id/run (도메인/실행 §8.10)
// 목록은 줄을 손에 들고 있지만 여기는 tcId 만 안다. 줄과 대상 서버를 읽어 같은 창(RunPickModal)을 띄운다

import { useMemo, useState } from 'react';

import { api, type CaseRow, type ServiceRow, type User } from './api.js';
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
}

/**
 * @param tcIds 돌릴 것. 한 서비스의 것이어야 한다 — 실행 하나에 서비스가 섞이지 않는다 (SPEC §7)
 * @param 지난값 그 실행에서 쓴 값. 있으면 칸이 그 값으로 열린다(비밀값 칸은 비운다 — pickRun 지난값글자)
 * @param 서버 미리 고를 대상 서버. 다시 실행은 같은 서버가 자연스럽다
 * @param on걸림 걸고 나서. 없으면 onClose 다 — 옛 주소 화면은 닫힘이 목록으로 보내므로 따로 받는다(안 그러면 실행 결과 대신 목록이 뜬다)
 */
export function RunWindow({
  tcIds,
  지난값,
  서버,
  onClose,
  on걸림 = onClose,
}: {
  tcIds: string[];
  지난값?: Record<string, { params: 값들; expected: 값들 }>;
  서버?: string;
  onClose: () => void;
  on걸림?: () => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const 걸기 = useRunStart();
  const [다시, set다시] = useState<CaseRow | null>(null);
  const [읽기오류, set읽기오류] = useState<string | undefined>(undefined);
  const 열기 = useAsync<연것>(async () => {
    // ponytail: 케이스마다 한 번씩 읽는다(같이 보낸다). 실패가 수백 건인 실행이 생기면 목록 통로에 tcId 거르개를 연다
    const [읽은, { user }] = await Promise.all([Promise.all(tcIds.map((tcId) => api.caseOf(tcId))), api.me()]);
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
    return {
      // 비활성은 스캔이 코드에서 지웠다고 본 케이스라 서버가 400 을 낸다. 빼고 그 사실을 창에 적는다
      케이스들: 읽은.filter((c) => c.isActive),
      빠진: 읽은.filter((c) => !c.isActive).map((c) => c.tcId),
      user,
      service: user.services.find((it) => it.prefix === 접두사) ?? null,
      초기글자,
    };
  }, [tcIds.join(',')]);

  // 저장값을 바꾼 한 건만 새로 읽은 것으로 갈아 낀다. 그릴 때마다 새 배열이면 창의 칸 계산이 매번 다시 돈다
  const 케이스들 = useMemo(
    () => (열기.data === null ? [] : 열기.data.케이스들.map((c) => (c.tcId === 다시?.tcId ? 다시 : c))),
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

  return (
    <RunPickModal
      케이스들={케이스들}
      초기글자={연.초기글자}
      초기서버={서버}
      service={연.service}
      user={연.user}
      사유={걸기.사유}
      안내={읽기오류 ?? (연.빠진.length === 0 ? undefined : t('비활성이라 뺀 케이스 {목록}', { 목록: 연.빠진.join(', ') }))}
      거는중={걸기.거는중}
      onClose={onClose}
      on값고침={걸기.사유지우기}
      on다시읽기={(tcId) => {
        // 저장은 이미 됐다. 다시 읽기만 실패하면 「저장값 · 누가 · 언제」가 옛것이라는 사실을 창에 적는다
        set읽기오류(undefined);
        api.caseOf(tcId).then(set다시, (err: unknown) => set읽기오류(message(err, 언어)));
      }}
      onRun={(요청) => void 걸기.걸기(요청).then((됨) => { if (됨) on걸림(); })}
    />
  );
}
