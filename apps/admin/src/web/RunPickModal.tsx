// 여러 건 실행 확인 모달 (SPEC §8.10). 목록에서 고른 것을 걸기 전에 한 번 보여주고 값을 고치게 한다
// 실제로 거는 것은 이 조각이 하지 않는다 — onRun 을 부르는 데까지다

import { useMemo, useState } from 'react';

import type { CaseRow, RunRequestItem, ServiceRow } from './api.js';
import { Form } from './Form.js';
import { Modal } from './Modal.js';
import { type 고친값표, 몇건, 실행항목 } from './pickRun.js';
import { 넘었나, 상한 } from './runPlan.js';
import { type Field, initialText, schemaToFields, toValues } from './schema.js';
import { PLATFORM_LABEL } from './ui.js';

export interface 실행요청 {
  env: string;
  repeat: number;
  notifySlack: boolean;
  items: RunRequestItem[];
}

interface Props {
  /** 목록에서 고른 것. 비활성·결과칩 거르기는 pickRun 의 담을것이 이미 했다 */
  케이스들: CaseRow[];
  /** 대상 서버 목록과 Slack 칸 여부가 여기 실려 온다 (SPEC §8.2 → §7) */
  service: ServiceRow | null;
  /**
   * 걸었다가 서버가 거절한 사유 한 줄.
   *
   * **칸별이 아니다.** `POST /api/runs` 는 입력값을 명세로 검증하지 않아 `violations` 를 내지 않는다 —
   * 어느 칸인지 서버가 모르므로 지어내지 않고 준 말을 그대로 싣는다.
   * 여기 없으면 사유가 모달 뒤에 깔려 사람은 「눌렀는데 아무 일도 안 일어난다」로 겪는다
   */
  사유?: string;
  onClose: () => void;
  onRun: (요청: 실행요청) => void;
}

/** 케이스마다 고쳐 넣은 글자. **편 적 없는 케이스는 여기 아예 없다** — 코드의 기본값으로 돈다 (SPEC §8.10) */
type 글자표 = Record<string, { params: Record<string, string>; expected: Record<string, string> } | undefined>;

const 오류없음: Record<string, string> = {};

export function RunPickModal({ 케이스들, service, 사유, onClose, onRun }: Props) {
  // **기본값을 두지 않는다.** 안 고르면 빈 칸이 아니라 틀린 값이 증적에 남는다 (SPEC §8.2)
  const [env, setEnv] = useState('');
  const [repeat, setRepeat] = useState('1');
  const [notifySlack, setNotifySlack] = useState(false);
  const [펼친, set펼친] = useState<string | null>(null);
  const [글자, set글자] = useState<글자표>({});
  const [notice, setNotice] = useState<string | null>(null);

  const 칸들 = useMemo(
    () =>
      new Map<string, { params: Field[]; expected: Field[] }>(
        케이스들.map((c) => [
          c.tcId,
          { params: schemaToFields(c.paramSchema), expected: schemaToFields(c.expectedSchema) },
        ]),
      ),
    [케이스들],
  );

  const 고친값 = useMemo<고친값표>(() => {
    const 표: 고친값표 = {};
    for (const [tcId, text] of Object.entries(글자)) {
      const 칸 = 칸들.get(tcId);
      if (text === undefined || 칸 === undefined) continue;
      표[tcId] = {
        params: toValues(칸.params, text.params),
        expected: toValues(칸.expected, text.expected),
      };
    }
    return 표;
  }, [글자, 칸들]);

  const 건수 = 몇건(케이스들, Number(repeat) || 1);
  const 너무많나 = 넘었나(건수);
  const 주소 = service?.envs.find((it) => it.env === env)?.baseUrl ?? null;
  /**
   * 한 줄이 넷을 겸한다 — 방금 누른 것에 대한 답 · 버튼을 죽인 이유 · **걸었다 거절당한 사유** · 건수 안내.
   *
   * 사유는 안내를 이긴다. 실패한 직후에는 `notice` 가 비어 있고 상한도 안 넘은 상태라
   * (안 그랬으면 애초에 안 걸렸다) **거절당한 그 순간 사유가 늘 보인다.**
   * 대신 위 둘까지 덮지는 않는다 — 옛 사유가 버튼이 죽은 이유를 가리면
   * 「왜 안 눌리는지」를 읽을 자리가 사라진다 (DESIGN.md 접근성 기준).
   */
  const 줄 =
    notice ??
    (너무많나
      ? `한 번에 ${String(상한)}건까지 만들 수 있습니다 (지금 ${String(건수)}건)`
      : (사유 ?? `실행 항목이 ${String(건수)}건 생깁니다`));
  const 빨갛나 = notice !== null || 너무많나 || 사유 !== undefined;

  function 펴기(tcId: string) {
    set펼친((전) => (전 === tcId ? null : tcId));
    // 처음 펼 때만 코드의 기본값으로 칸을 채운다. 다시 펴면 아까 고친 글자가 그대로 있어야 한다
    set글자((전) => {
      if (전[tcId] !== undefined) return 전;
      const 칸 = 칸들.get(tcId);
      return {
        ...전,
        [tcId]: { params: initialText(칸?.params ?? []), expected: initialText(칸?.expected ?? []) },
      };
    });
  }

  function 고치기(tcId: string, which: 'params' | 'expected') {
    return (key: string, value: string) => {
      setNotice(null);
      set글자((전) => {
        const 지금 = 전[tcId] ?? { params: {}, expected: {} };
        return { ...전, [tcId]: { ...지금, [which]: { ...지금[which], [key]: value } } };
      });
    };
  }

  function 실행() {
    if (env === '') {
      // 버튼을 비활성화하지 않는다. 누르면 사유를 보여준다 (SPEC §8.2 · DESIGN.md)
      setNotice('대상 서버를 고르세요. 어느 서버에 쐈는지가 증적의 전제입니다.');
      return;
    }
    onRun({
      env,
      // 화면이 세는 것과 같은 값을 보낸다. 소수를 그대로 보내면 서버의 z.number().int() 가 400 을 낸다
      repeat: Math.max(1, Math.floor(Number(repeat) || 1)),
      notifySlack,
      items: 실행항목(케이스들, 고친값),
    });
  }

  return (
    <Modal
      제목={`실행할 케이스 ${String(케이스들.length)}건`}
      onClose={onClose}
      버튼={
        <>
          {/* 사유도 건수도 말풍선이 아니라 화면 줄이다. 오류는 --fail 로 적는다 (DESIGN.md) */}
          <span className="note" role="status" style={빨갛나 ? { color: 'var(--fail)' } : undefined}>
            {줄}
          </span>
          <button className="btn ghost" onClick={onClose}>
            취소
          </button>
          {/* 상한은 서버도 같은 것을 본다. 화면만 막으면 직접 찌르는 요청을 못 막는다 (SPEC §8.2) */}
          <button className="btn" onClick={실행} disabled={너무많나}>
            실행하기
          </button>
        </>
      }
    >
      <div className="mhead">
        <label htmlFor="pick-env">대상 서버</label>
        <select id="pick-env" value={env} onChange={(e) => { setNotice(null); setEnv(e.target.value); }}>
          {/* 기본값이 없다. 반드시 고른다 (SPEC §8.2) */}
          <option value="">고르세요</option>
          {(service?.envs ?? []).map((it) => (
            <option key={it.env} value={it.env}>
              {it.env}
            </option>
          ))}
        </select>
        {/* 고른 뒤 「어디로 쏘는지」를 확인할 자리가 있어야 한다 (SPEC §8.2) */}
        {주소 === null ? null : <span className="addr">{주소}</span>}
      </div>

      {/* 여기만 스크롤한다. 머리와 바닥은 고정이다 (SPEC §8.10) */}
      <div className="picked">
        {케이스들.map((c) => {
          const 칸 = 칸들.get(c.tcId);
          // 펼 것이 없으면 접개를 두지 않는다. 눌러도 빈 자리가 나오는 버튼은 고장으로 보인다 (SPEC §8.10)
          const 펼것 = (칸?.params.length ?? 0) + (칸?.expected.length ?? 0) > 0;
          const 열림 = 펼친 === c.tcId;

          return (
            <div key={c.tcId}>
              <div className="prow">
                <span className="id">{c.tcId}</span>
                <span className="nm">{c.name}</span>
                {/* 디바이스는 케이스가 선언한 것을 전부 쓴다. 여기서 고르지 않는다 (SPEC §8.10) */}
                <span className="dev">{c.platforms.map((p) => PLATFORM_LABEL[p]).join(' · ')}</span>
                {펼것 ? (
                  // 같은 글자의 버튼이 줄마다 있어 어느 케이스 것인지를 이름에 싣는다
                  <button className="edit" aria-label={`${c.tcId} 값 고치기`} onClick={() => { 펴기(c.tcId); }}>
                    값 고치기
                  </button>
                ) : (
                  <span />
                )}
              </div>
              {열림 && 칸 !== undefined ? (
                <div className="prow-edit">
                  {칸.params.length === 0 ? null : (
                    <Form
                      idPrefix={`p-${c.tcId}`}
                      fields={칸.params}
                      text={글자[c.tcId]?.params ?? {}}
                      // 칸별 사유는 서버가 400 으로 돌려준다. 그것을 받는 자리는 실행을 거는 쪽이다
                      errors={오류없음}
                      onChange={고치기(c.tcId, 'params')}
                    />
                  )}
                  {칸.expected.length === 0 ? null : (
                    <Form
                      idPrefix={`e-${c.tcId}`}
                      fields={칸.expected}
                      text={글자[c.tcId]?.expected ?? {}}
                      errors={오류없음}
                      onChange={고치기(c.tcId, 'expected')}
                    />
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mfoot">
        <label htmlFor="pick-repeat">반복</label>
        {/* 새로 쓴 테스트가 매번 같은 결과를 내는지 여러 번 돌려 본다 (SPEC §3.2 · §5.2) */}
        <input
          type="text"
          id="pick-repeat"
          value={repeat}
          onChange={(e) => { setNotice(null); setRepeat(e.target.value); }}
        />
        {/* 웹훅이 없는 서비스에서는 칸 자체를 그리지 않는다. 흐리게 두지 않는다 (SPEC §8.2) */}
        {service?.hasSlackWebhook !== true ? null : (
          <label className="check-inline" htmlFor="pick-slack">
            <input
              type="checkbox"
              id="pick-slack"
              checked={notifySlack}
              onChange={(e) => { setNotifySlack(e.target.checked); }}
            />
            끝나면 Slack 알리기
          </label>
        )}
      </div>
    </Modal>
  );
}
