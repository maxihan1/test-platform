// 실행 창 (SPEC §8.10). 실행을 거는 곳은 모두 이 창 하나를 연다 — 목록 줄 ▶ · 선택한 N건 · 실패 다시 실행 · 값 바꿔 재실행
// 실제로 거는 것은 이 조각이 하지 않는다 — onRun 을 부르는 데까지다

import { useState } from 'react';

import { ApiError, type CaseRow, type RunRequestItem, type ServiceRow, type User } from './api.js';
import { Form } from './Form.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { type 글자표, 건수재료, 몇건, 실행항목, 안드로이드있나 } from './pickRun.js';
import { 고른서버를적는다, 마지막서버 } from './layout.js';
import { RunLocation } from './RunLocation.js';
import { use닫기묻기, 건수풀이, 반복과알림, 실행버튼들 } from './RunPickFoot.js';
import { 한건머리, use한건 } from './RunPickOne.js';
import { 저장한값줄 } from './RunPickSaved.js';
import { 넘었나, 상한 } from './runPlan.js';
import { use여러건시험, 열주소칸, 시험배지, 시험절차 } from './RunPickTrial.js';
import { toValues } from './schema.js';
import { message, PLATFORM_LABEL } from './ui.js';
import { useRunPickValues } from './useRunPickValues.js';
import { messagesByKey } from './validation.js';

export interface 실행요청 {
  env: string;
  repeat: number;
  notifySlack: boolean;
  /** Android 앱이 하나라도 있을 때만 싣는다. 서버가 없으면 400 이다 */
  location?: 'local';
  items: RunRequestItem[];
}

interface Props {
  /** 돌릴 것. 비활성·결과칩 거르기는 여는 쪽이 이미 했다 */
  케이스들: CaseRow[];
  /** 목록 줄에서 이미 고쳐 둔 값(2026-09-21 ②) · 지난 실행의 값. 칸은 이 글자에서 시작한다 */
  초기글자?: 글자표;
  /** 미리 고를 대상 서버. 그 서비스에 없는 이름이면 고르지 않은 채로 연다 — 기본값은 없다 (SPEC §8.2) */
  초기서버?: string;
  /** 대상 서버 목록과 Slack 칸 여부가 여기 실려 온다 (SPEC §8.2 → §7) */
  service: ServiceRow | null;
  /** 한 건 창의 실행자 이름과 묶음 · 저장값 권한. 없으면 그 칸들을 그리지 않는다 */
  user?: User | null;
  /**
   * 걸었다가 서버가 거절한 사유 한 줄.
   *
   * **칸별이 아니다.** `POST /api/runs` 는 입력값을 명세로 검증하지 않아 `violations` 를 내지 않는다 —
   * 어느 칸인지 서버가 모르므로 지어내지 않고 준 말을 그대로 싣는다.
   * 여기 없으면 사유가 창 뒤에 깔려 사람은 「눌렀는데 아무 일도 안 일어난다」로 겪는다
   */
  사유?: string;
  /** 고른 것 중 무엇이 왜 빠졌는지. 조용히 줄어든 채로 걸지 않는다 */
  안내?: string;
  /** 실행을 걸어 놓고 응답을 기다리는 중. 최대 5000건을 만드는 동안 화면이 침묵하면 안 된다 */
  거는중?: boolean;
  onClose: () => void;
  /** 값을 고쳤다. 아까 거절당한 사유는 더 이상 지금 화면의 사실이 아니다 */
  on값고침?: () => void;
  /** 한 건 창에서 저장값을 바꿨다. 그 케이스를 새로 읽어 「저장값 · 누가 · 언제」를 맞춘다 */
  on다시읽기?: (tcId: string) => void;
  onRun: (요청: 실행요청) => void;
}

export function RunPickModal({ 케이스들, service, 초기글자, 초기서버, user, 사유, 안내, 거는중, onClose, on값고침, on다시읽기, onRun }: Props) {
  const t = use말();
  const 언어 = use언어();
  // **기본값을 두지 않는다.** 안 고르면 빈 칸이 아니라 틀린 값이 증적에 남는다 (SPEC §8.2).
  // 여는 쪽이 준 서버(실패 다시 실행 — 그 실행의 서버)와 이 서비스에서 마지막에 고른 서버는 사람이 이미 고른 값이다
  // 넘겨받은 서버가 서비스에서 지워졌으면 빈 칸이다 — 원래 실행과 다른 서버가 말없이 골라지면 안 된다
  const [env, setEnv] = useState(() =>
    초기서버 !== undefined
      ? service?.envs.some((it) => it.env === 초기서버) === true ? 초기서버 : ''
      : service === null ? '' : 마지막서버(service.prefix, service.envs),
  );
  const [repeat, setRepeat] = useState('1');
  const [notifySlack, setNotifySlack] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // 칸 아래 사유를 언제 보일까. 치는 동안 빨간 글이 따라다니면 다 적기도 전에 틀렸다고 말한다
  const [오류보임, set오류보임] = useState(false);
  // 값 칸을 편 케이스(여러 건은 접힌 채 시작한다). 저절로 접지 않는다 — 고치는 도중 사유가 사라졌다고 칸이 닫히면 안 된다 (도메인/실행 §8.10)
  const [펼친, set펼친] = useState<ReadonlySet<string>>(new Set());
  const 뒤집기 = (tcId: string) => set펼친((전) => new Set(전.has(tcId) ? [...전].filter((it) => it !== tcId) : [...전, tcId]));

  /** 사람이 뭔가 손댔다. 방금 누른 것에 대한 답과 옛 사유를 함께 치운다 */
  function 손댐() {
    setNotice(null);
    on값고침?.();
  }

  const 값 = useRunPickValues(케이스들, 초기글자, 손댐);
  const 닫기 = use닫기묻기(값.고쳤나, onClose);
  const 한건 = 케이스들.length === 1 ? 케이스들[0]! : null;
  const 하나 = use한건(한건);
  // 한 건이면 사람이 고른 디바이스로 돈다. 여러 건이면 케이스가 선언한 것을 전부 쓴다 (SPEC §8.10)
  const 돌릴것 = 한건 === null ? 케이스들 : [{ ...한건, platforms: 하나.디바이스 }];

  // 보내는 값과 같은 규칙으로 센다. 소수를 그대로 세면 화면 건수와 실제 항목 수가 갈린다
  const 반복수 = Math.max(1, Math.floor(Number(repeat) || 1));
  const 건수 = 몇건(돌릴것, 반복수);
  const 너무많나 = 넘었나(건수);
  const android = 안드로이드있나(돌릴것);
  const 주소 = service?.envs.find((it) => it.env === env)?.baseUrl ?? null;
  // 「▶ 시험해 보기」 — 기록 없이 한 건씩 차례로 (도메인/실행 §8.10)
  const 시험 = use여러건시험({ 케이스들: 돌릴것, 고친값: 값.고친값, 대상주소: 주소, 알림: setNotice });
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
      ? t('한 번에 {상한}건까지 만들 수 있습니다 (지금 {지금}건)', { 상한, 지금: 건수 })
      : (사유 ?? 건수풀이(t, 건수재료(돌릴것), 반복수, 건수)));
  const 빨갛나 = notice !== null || 너무많나 || 사유 !== undefined;

  /** 서버가 칸별 사유를 주면 그 칸 아래에 붙인다. 아니면 창의 한 줄로 (SPEC §8.2) */
  function 저장실패(err: unknown) {
    if (err instanceof ApiError && err.violations.length > 0) {
      set오류보임(false);
      값.set서버오류(messagesByKey(err.violations));
      setNotice(t('입력값이 명세와 맞지 않습니다.'));
    } else {
      setNotice(message(err, 언어));
    }
  }

  /** 고친 칸이 명세와 맞나. 안 맞으면 칸 아래 사유를 보이고 거짓 — 실행 · 테스트 실행이 같은 검사를 거친다 (§8.10) */
  function 값이맞나(): boolean {
    set오류보임(true);
    if (Object.keys(값.오류).length === 0) return true;
    set펼친((전) => new Set([...전, ...Object.keys(값.오류)]));
    setNotice(t('입력값이 명세와 맞지 않습니다.'));
    return false;
  }

  function 실행() {
    if (!값이맞나()) return;
    if (한건 !== null && 하나.디바이스.length === 0) {
      setNotice(t('실행할 디바이스를 하나 이상 고르세요.'));
      return;
    }
    if (env === '') {
      // 버튼을 비활성화하지 않는다. 누르면 사유를 보여준다 (SPEC §8.2 · DESIGN.md)
      setNotice(t('대상 서버를 고르세요. 증적에는 어느 서버에서 실행했는지가 꼭 남아야 합니다.'));
      return;
    }
    onRun({
      env,
      // 화면이 세는 것과 같은 값을 보낸다. 소수를 그대로 보내면 서버의 z.number().int() 가 400 을 낸다
      repeat: 반복수,
      notifySlack,
      ...(android ? { location: 'local' as const } : {}),
      items: 실행항목(돌릴것, 값.고친값),
    });
  }

  return (
    <Modal
      제목={t('실행할 케이스 {건수}건', { 건수: 케이스들.length })}
      onClose={닫기.요청}
      넓게
      바깥눌러닫기={false}
      버튼={
        닫기.묻나 ? 닫기.줄 : (
        <>
          {/* 사유도 건수도 말풍선이 아니라 화면 줄이다. 오류는 실패 글자색(--fail-text)으로 적는다 (DESIGN.md 원칙 1 오류 예외) */}
          <span className="note" role="status" style={빨갛나 ? { color: 'var(--fail-text)' } : undefined}>
            {줄}
          </span>
          <button className="btn ghost" onClick={닫기.요청}>
            {t('취소')}
          </button>
          <실행버튼들
            on시험={() => { if (값이맞나()) 시험.누름(); }}
            on실행={실행}
            실행막힘={너무많나}
            거는중={거는중 === true}
          />
        </>
        )
      }
    >
      <div className="mhead">
        <label htmlFor="pick-env">{t('대상 서버')}</label>
        <select id="pick-env" value={env} onChange={(e) => { 손댐(); setEnv(e.target.value); if (service !== null) 고른서버를적는다(service.prefix, e.target.value); }}>
          {/* 기본값이 없다. 반드시 고른다 (SPEC §8.2) */}
          <option value="">{t('고르세요')}</option>
          {(service?.envs ?? []).map((it) => (
            <option key={it.env} value={it.env}>
              {it.env}
            </option>
          ))}
        </select>
        {/* 고른 뒤 「어디로 쏘는지」를 확인할 자리가 있어야 한다 (SPEC §8.2) */}
        {주소 === null ? null : <span className="addr">{주소}</span>}
        {service !== null && service.envs.length === 0 ? (
          <span className="err">{t('이 서비스에 등록된 대상 서버가 없습니다. 설정에서 추가해야 실행할 수 있습니다')}</span>
        ) : null}
      </div>
      <RunLocation android={android} />
      {한건 === null ? null : (
        <한건머리
          케이스={한건}
          디바이스={하나.디바이스}
          on디바이스={(다음) => { 손댐(); 하나.set디바이스(다음); }}
          실행자={user?.displayName ?? null}
        />
      )}

      {/* 고른 것이 왜 줄었는지. 제목의 건수만 보면 어디서 사라졌는지 아무 데도 안 적힌다 */}
      {안내 === undefined ? null : <div className="mnote">{안내}</div>}

      {/* 여기만 스크롤한다. 머리와 바닥은 고정이다 (SPEC §8.10) */}
      <div className="picked">
        {돌릴것.map((c) => {
          const 칸 = 값.칸들.get(c.tcId);
          // 값이 없는 케이스는 그 사실을 글로 적는다. 빈 자리를 남기면 「안 불러왔나」로 읽힌다
          const 값있나 = (칸?.params.length ?? 0) + (칸?.expected.length ?? 0) > 0;
          const 시험줄 = 시험.줄들[c.tcId];

          return (
            <div key={c.tcId}>
              <div className="prow">
                <span className="id">{c.tcId}</span>
                <span className="nm">{c.name}</span>
                {/* 여러 건이면 디바이스는 케이스가 선언한 것을 전부 쓴다. 여기서 고르지 않는다 (SPEC §8.10) */}
                <span className="dev">{c.platforms.map((p) => PLATFORM_LABEL[p]).join(' · ')}</span>
                <시험배지 줄={시험줄} />
                {/* 여러 건이면 값을 접어 두고 이 단추로 편다 — 「실행」을 가깝게 둔다 (도메인/실행 §8.10 · styles.css) */}
                {한건 !== null || !값있나 ? null : (
                  <button type="button" className="btn small ghost prow-fold" aria-expanded={펼친.has(c.tcId)} onClick={() => 뒤집기(c.tcId)}>
                    {t('값')}
                  </button>
                )}
              </div>
              {한건 !== null && 시험줄?.종류 === 'done' ? <시험절차 결과={시험줄.결과} /> : null}
              {!값있나 || 칸 === undefined ? (
                <p className="prow-none">{t('선언된 입력값이 없습니다. 그대로 실행됩니다')}</p>
              ) : (
                <div className={펼친.has(c.tcId) ? 'prow-edit open' : 'prow-edit'}>
                  {칸.params.length === 0 ? null : (
                    <Form
                      idPrefix={`p-${c.tcId}`}
                      fields={칸.params}
                      text={값.글자of(c.tcId, 'params')}
                      errors={값.칸오류(c.tcId, 'params', 오류보임)}
                      onChange={값.고치기(c.tcId, 'params')}
                    />
                  )}
                  {칸.expected.length === 0 ? null : (
                    <Form
                      idPrefix={`e-${c.tcId}`}
                      fields={칸.expected}
                      text={값.글자of(c.tcId, 'expected')}
                      errors={값.칸오류(c.tcId, 'expected', 오류보임)}
                      onChange={값.고치기(c.tcId, 'expected')}
                    />
                  )}
                </div>
              )}
              {한건 === null || !값있나 ? null : (
                <저장한값줄
                  케이스={한건}
                  user={user ?? null}
                  // 안 고친 칸도 보이는 값 그대로 저장한다. 고친 것만 싣으면 「이 값으로」가 빈 값을 저장한다
                  값={{
                    params: toValues(칸?.params ?? [], 값.글자of(c.tcId, 'params')),
                    expected: toValues(칸?.expected ?? [], 값.글자of(c.tcId, 'expected')),
                  }}
                  on불러오기={(글자) => 값.불러오기(c.tcId, 글자)}
                  on다시읽기={() => on다시읽기?.(c.tcId)}
                  on실패={저장실패}
                />
              )}
            </div>
          );
        })}
      </div>

      <반복과알림
        repeat={repeat}
        on반복={(값) => { 손댐(); setRepeat(값); }}
        slack칸={service?.hasSlackWebhook === true}
        notifySlack={notifySlack}
        onSlack={setNotifySlack}
      />
      <열주소칸 값={시험.열주소} 오류={시험.주소오류} onChange={시험.바꾸기} />
    </Modal>
  );
}
