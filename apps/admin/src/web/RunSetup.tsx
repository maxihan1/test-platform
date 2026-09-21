// 실행 설정 화면 (SPEC §8.2). 케이스의 paramSchema·expectedSchema를 읽어 입력 폼을 자동으로 만든다
// 이 플랫폼의 핵심 — 코드를 고치지 않고 값만 바꿔 다시 돌리는 자리다

import { useEffect, useMemo, useState } from 'react';

import { api, ApiError, type CaseRow, type ParamSetRow, type Platform, type ServiceRow, type User } from './api.js';
import { Form } from './Form.js';
import { 넘었나, 상한, 항목수 } from './runPlan.js';
import { initialText, schemaToFields, toValues } from './schema.js';
import { Failed, Loading, message, PLATFORM_LABEL, useAsync } from './ui.js';
import { fieldErrors, messagesByKey } from './validation.js';

const EMPTY: Record<string, string> = {};

interface Props {
  tcId: string;
  /**
   * 맨 위 띠에서 고른 서비스. 대상 서버 목록이 여기 실려 온다 (SPEC §8.2 → §7).
   *
   * **이 케이스의 서비스와 다를 수 있다** — 이 화면을 열어 둔 채 띠에서 다른 서비스로
   * 바꾸면 그렇다. 그때 남의 `env` 로 실행을 걸면 서버가 400 을 내므로 값이 새지는 않지만,
   * 사유를 모르는 오류가 뜬다. 아래에서 `tcId` 접두사와 대조해 미리 막는다
   */
  service: ServiceRow | null;
  /** 실행자는 로그인한 사람이다. 사람이 적게 두면 남의 이름을 적을 수 있다 (SPEC §8.2) */
  user: User;
}

export function RunSetup({ tcId, service, user }: Props) {
  const found = useAsync<CaseRow>(() => api.caseOf(tcId), [tcId]);
  const saved = useAsync<{ items: ParamSetRow[] }>(() => api.paramSets(tcId), [tcId]);

  const [paramText, setParamText] = useState<Record<string, string>>(EMPTY);
  const [expectedText, setExpectedText] = useState<Record<string, string>>(EMPTY);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [title, setTitle] = useState('');
  // **기본값을 두지 않는다.** 안 고르면 빈 칸이 아니라 틀린 값이 증적에 남는다 (SPEC §8.2)
  const [env, setEnv] = useState('');
  const [repeat, setRepeat] = useState('1');
  const [notifySlack, setNotifySlack] = useState(false);
  const [setName, setSetName] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<{ params: Record<string, string>; expected: Record<string, string> }>(
    { params: EMPTY, expected: EMPTY },
  );
  const [busy, setBusy] = useState(false);

  const row = found.data;
  const paramFields = useMemo(() => (row === null ? [] : schemaToFields(row.paramSchema)), [row]);
  const expectedFields = useMemo(() => (row === null ? [] : schemaToFields(row.expectedSchema)), [row]);

  // 케이스가 도착하면 default 값으로 칸을 채우고, 선언된 디바이스를 전부 고른다 (SPEC §8.2)
  useEffect(() => {
    if (row === null) return;
    setParamText(initialText(schemaToFields(row.paramSchema)));
    setExpectedText(initialText(schemaToFields(row.expectedSchema)));
    setPlatforms(row.platforms);
    setTitle(`${row.tcId} 실행`);
  }, [row]);

  if (found.error !== null) return <Failed error={found.error} />;
  if (row === null) return <Loading />;

  const params = toValues(paramFields, paramText);
  const expected = toValues(expectedFields, expectedText);
  const localErrors = {
    params: fieldErrors(row.paramSchema, params),
    expected: fieldErrors(row.expectedSchema, expected),
  };
  const shown = showErrors
    ? localErrors
    : { params: serverErrors.params, expected: serverErrors.expected };
  const 주소 = service?.envs.find((it) => it.env === env)?.baseUrl ?? null;
  // tcId 접두사가 서비스를 말한다 (SPEC §1). 띠에서 다른 서비스로 바꾸면 어긋난다
  const 다른서비스 = service !== null && !row.tcId.startsWith(`${service.prefix}-`);
  const 만들건수 = 항목수([platforms.length], Number(repeat) || 1);
  const 너무많나 = 넘었나(만들건수);
  const broken = Object.keys(localErrors.params).length + Object.keys(localErrors.expected).length;

  function edit(which: 'params' | 'expected') {
    return (key: string, value: string) => {
      setNotice(null);
      setServerErrors({ params: EMPTY, expected: EMPTY });
      const setter = which === 'params' ? setParamText : setExpectedText;
      setter((prev) => ({ ...prev, [key]: value }));
    };
  }

  function loadSet(id: string) {
    const picked = saved.data?.items.find((item) => String(item.id) === id);
    if (picked === undefined) return;
    // 저장된 값에 없는 칸은 지금 칸의 값을 그대로 둔다. 통째로 갈아끼우면 스키마가 늘었을 때 칸이 빈다
    setParamText((prev) => ({ ...prev, ...textOf(picked.params) }));
    setExpectedText((prev) => ({ ...prev, ...textOf(picked.expected) }));
    setNotice(null);
  }

  // 위의 null 검사로 좁혀진 row를 그대로 쓰려면 화살표여야 한다. function 선언은 끌어올려져 좁힘이 풀린다
  const run = async () => {
    setShowErrors(true);
    if (broken > 0) return;
    if (platforms.length === 0) {
      setNotice('실행할 디바이스를 하나 이상 고르세요.');
      return;
    }
    if (다른서비스) {
      setNotice('이 케이스는 지금 보고 있는 서비스의 것이 아닙니다. 맨 위에서 서비스를 바꾸세요.');
      return;
    }
    if (env === '') {
      // 버튼을 비활성화하지 않는다. 누르면 사유를 보여준다 (SPEC §8.2 · DESIGN.md)
      setNotice('대상 서버를 고르세요. 어느 서버에 쐈는지가 증적의 전제입니다.');
      return;
    }

    setBusy(true);
    try {
      const { runId } = await api.createRun({
        title: title.trim() === '' ? `${row.tcId} 실행` : title.trim(),
        env,
        // 화면이 세는 것과 같은 값을 보낸다. 소수를 그대로 보내면 서버의 z.number().int() 가 400 을 낸다
        repeat: Math.max(1, Math.floor(Number(repeat) || 1)),
        notifySlack,
        items: [{ tcId: row.tcId, platforms, params, expected }],
      });
      window.location.hash = `#/runs/${runId}`;
    } catch (err) {
      setNotice(message(err));
    } finally {
      setBusy(false);
    }
  };

  const saveSet = async () => {
    setShowErrors(true);
    if (setName.trim() === '') {
      setNotice('저장할 이름을 적으세요.');
      return;
    }

    setBusy(true);
    try {
      await api.saveParamSet(row.tcId, { name: setName.trim(), params, expected });
      setSetName('');
      setNotice(`'${setName.trim()}'으로 저장했습니다.`);
      saved.reload();
    } catch (err) {
      // 서버가 칸별 사유를 돌려주면 그 칸 아래에 붙인다 (SPEC §8.2)
      if (err instanceof ApiError && err.violations.length > 0) {
        const byKey = messagesByKey(err.violations);
        setServerErrors({
          params: pick(byKey, paramFields.map((f) => f.key)),
          expected: pick(byKey, expectedFields.map((f) => f.key)),
        });
        setShowErrors(false);
        setNotice('입력값이 명세와 맞지 않습니다.');
      } else {
        setNotice(message(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="bar">
        <div>
          <div className="case-tc">{row.tcId}</div>
          <div className="case-name">{row.name}</div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-h">사전조건</div>
        {row.precondition.length === 0 ? (
          <p className="hint">선언된 사전조건이 없습니다.</p>
        ) : (
          row.precondition.map((line) => (
            <div className="pre" key={line}>
              {line}
            </div>
          ))
        )}
      </div>

      <div className="sec">
        <div className="sec-h">
          <span>입력값</span>
          {saved.data === null || saved.data.items.length === 0 ? null : (
            <select defaultValue="" onChange={(e) => loadSet(e.target.value)}>
              <option value="">저장된 입력값 세트 불러오기</option>
              {saved.data.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <Form
          idPrefix="p"
          fields={paramFields}
          text={paramText}
          errors={shown.params}
          onChange={edit('params')}
        />
        {paramFields.length === 0 ? null : (
          <p className="hint">입력값은 이번 실행 기록에 그대로 저장됩니다.</p>
        )}
      </div>

      <div className="sec">
        <div className="sec-h">기대결과</div>
        <Form
          idPrefix="e"
          fields={expectedFields}
          text={expectedText}
          errors={shown.expected}
          onChange={edit('expected')}
        />
      </div>

      <div className="sec">
        <div className="sec-h">디바이스</div>
        <div className="checks">
          {row.platforms.map((platform) => (
            <label key={platform}>
              <input
                type="checkbox"
                checked={platforms.includes(platform)}
                onChange={(e) =>
                  setPlatforms((prev) =>
                    e.target.checked ? [...prev, platform] : prev.filter((p) => p !== platform),
                  )
                }
              />
              {PLATFORM_LABEL[platform]}
            </label>
          ))}
        </div>
        <div className="field" style={{ marginTop: '10px' }}>
          <label htmlFor="run-env">대상 서버</label>
          <div>
            <select id="run-env" value={env} onChange={(e) => setEnv(e.target.value)}>
              {/* 기본값이 없다. 반드시 고른다 (SPEC §8.2) */}
              <option value="">고르세요</option>
              {(service?.envs ?? []).map((it) => (
                <option key={it.env} value={it.env}>
                  {it.env}
                </option>
              ))}
            </select>
            {/* 고른 뒤 「어디로 쏘는지」를 확인할 자리가 있어야 한다 (SPEC §8.2) */}
            {주소 === null ? null : <span className="env-url">{주소}</span>}
            {다른서비스 ? (
              <div className="err">
                지금 보고 있는 서비스가 {service?.name}인데 이 케이스는 {row.tcId.split('-')[0]} 것입니다.
                맨 위에서 서비스를 바꾸거나 그 서비스의 케이스 목록에서 다시 여세요
              </div>
            ) : service !== null && service.envs.length === 0 ? (
              <div className="err">
                이 서비스에 등록된 대상 서버가 없습니다. 설정에서 추가해야 실행할 수 있습니다
              </div>
            ) : null}
          </div>
        </div>

        <div className="field">
          <label htmlFor="run-by">실행자</label>
          {/* 고칠 수 없는 표시 칸이다. 사람이 적게 두면 남의 이름을 적을 수 있다 (SPEC §8.2) */}
          <div className="val" id="run-by">
            {user.displayName}
          </div>
        </div>

        <div className="field">
          <label htmlFor="run-repeat">반복 횟수</label>
          <div>
            {/* 새로 쓴 테스트가 매번 같은 결과를 내는지 여러 번 돌려 본다.
                실패를 가리려는 자동 재시도와 다르다 (SPEC §3.2 · §5.2) */}
            <input
              type="text"
              id="run-repeat"
              className="narrow"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </div>
        </div>

        {/* 웹훅이 없는 서비스에서는 칸 자체를 그리지 않는다. 흐리게 두지 않는다 (SPEC §8.2 · §8) */}
        {service?.hasSlackWebhook !== true ? null : (
          <div className="field">
            <label htmlFor="run-slack">끝나면 Slack 알리기</label>
            <div>
              <label className="check-inline">
                <input
                  type="checkbox"
                  id="run-slack"
                  checked={notifySlack}
                  onChange={(e) => setNotifySlack(e.target.checked)}
                />
                자리를 뜰 때만 켜세요. 자기 확인용까지 팀 채널에 흘리면 채널이 소음이 됩니다
              </label>
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="run-title">실행 제목</label>
          <div>
            <input type="text" id="run-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="actions">
        <span className="note" style={notice === null ? undefined : { color: 'var(--fail)' }}>
          {notice ?? '입력값을 바꿔 다시 실행해도 코드는 고치지 않습니다.'}
        </span>
        <input
          type="text"
          placeholder="세트 이름"
          value={setName}
          onChange={(e) => setSetName(e.target.value)}
          style={{ width: '140px' }}
        />
        <button className="btn ghost" onClick={() => void saveSet()} disabled={busy}>
          입력값 세트로 저장
        </button>
        {만들건수 <= 1 ? null : (
          <span className={너무많나 ? 'err' : 'hint'}>
            {너무많나
              ? `한 번에 ${String(상한)}건까지 만들 수 있습니다 (지금 ${String(만들건수)}건)`
              : `실행 항목이 ${String(만들건수)}건 생깁니다`}
          </span>
        )}
        {/* 상한은 서버도 같은 것을 본다. 화면만 막으면 직접 찌르는 요청을 못 막는다 (SPEC §8.2) */}
        <button className="btn" onClick={() => void run()} disabled={busy || 너무많나}>
          실행하기
        </button>
      </div>
    </div>
  );
}

function textOf(values: Record<string, unknown>): Record<string, string> {
  const text: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    text[key] = value === null || value === undefined ? '' : String(value);
  }
  return text;
}

function pick(all: Record<string, string>, keys: string[]): Record<string, string> {
  const some: Record<string, string> = {};
  for (const key of keys) {
    const found = all[key];
    if (found !== undefined) some[key] = found;
  }
  return some;
}
