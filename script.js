const appState = {
    viewDate: new Date(),
    maintViewDate: new Date(),
    fuelViewDate: new Date(),
    miscViewDate: new Date(),
    selectedDateKey: null,
    activeLogId: 'main',
    workData: loadWorkDataForLog('main'),
    previousPage: 'main',
    isOffSelected: false,
    currentTempMaintItems: [],
    currentTempCallDetails: [],
    currentTempFuelItems: [],
    currentTempMiscItems: [],
    isDetailReportView: false,
    currentDetailClientFilter: 'ALL',
    calendarCells: [],
    confirmCallback: null
};

// 기존 변수명과의 호환성을 위한 참조 바인딩 (다른 함수들의 대규모 수정 최소화)
let viewDate = appState.viewDate;
let maintViewDate = appState.maintViewDate;
let fuelViewDate = appState.fuelViewDate;
let miscViewDate = appState.miscViewDate;
let selectedDateKey = appState.selectedDateKey;
let activeLogId = appState.activeLogId;
let workData = appState.workData;
let previousPage = appState.previousPage;
let isOffSelected = appState.isOffSelected;
let currentTempMaintItems = appState.currentTempMaintItems;
let currentTempCallDetails = appState.currentTempCallDetails;
let currentTempFuelItems = appState.currentTempFuelItems;
let currentTempMiscItems = appState.currentTempMiscItems;
// 고정노선 "상하차지 사용" 켰을 때, 오늘 이 날짜에 노선별로 몇 번 눌렀는지(routeId -> count)
// 임시로 들고 있다가 autoSaveWorkRecord()가 workData[selectedDateKey].fixedRouteCounts로
// 반영한다. currentTempCallDetails 등과 같은 패턴이다.
let currentTempFixedRouteCounts = {};
let isDetailReportView = appState.isDetailReportView;
let currentDetailClientFilter = appState.currentDetailClientFilter;
const calendarCells = appState.calendarCells;
let confirmCallback = appState.confirmCallback;
let driverConnectionReturnPage = 'main';
let activeLinkedDriverId = '';
let toastHideTimer = null;
const activeSaveActions = new Set();
const backgroundSaveStates = new Map();
// 하단 저장 상태 표시기(save-status-indicator)가 "저장실패"로 보여줄, 아직 재시도에
// 성공하지 못한 백그라운드 저장 키 목록. flushBackgroundSave가 성공/재시도 시작 때마다
// 지우고, 실패할 때마다 채운다.
const failedBackgroundSaveKeys = new Set();

async function runSaveAction(button, actionKey, action) {
    if (typeof action !== 'function') return false;
    const key = actionKey || action.name || 'save-action';
    if (activeSaveActions.has(key)) return false;

    activeSaveActions.add(key);
    const canUpdateButton = button && typeof button === 'object' && 'disabled' in button;
    const wasDisabled = canUpdateButton ? button.disabled : false;
    const previousAriaBusy = canUpdateButton ? button.getAttribute?.('aria-busy') : null;

    if (canUpdateButton) {
        button.disabled = true;
        button.classList?.add('save-action-loading');
        button.setAttribute?.('aria-busy', 'true');
    }

    try {
        await Promise.resolve().then(action);
        return true;
    } catch (error) {
        console.error(`${key} 저장 실패:`, error);
        showRetryableSaveError(error, () => runSaveAction(button, key, action));
        return false;
    } finally {
        activeSaveActions.delete(key);
        if (canUpdateButton) {
            button.disabled = wasDisabled;
            button.classList?.remove('save-action-loading');
            if (previousAriaBusy === null || previousAriaBusy === undefined) button.removeAttribute?.('aria-busy');
            else button.setAttribute?.('aria-busy', previousAriaBusy);
        }
    }
}

function queueBackgroundSave(actionKey, action, delay = 320) {
    if (typeof action !== 'function') return;
    const key = actionKey || action.name || 'background-save';
    const state = backgroundSaveStates.get(key) || { timer: null, running: false, runningPromise: null, nextAction: null };
    state.nextAction = action;
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => flushBackgroundSave(key), Math.max(0, delay));
    backgroundSaveStates.set(key, state);
    updateSaveStatusIndicator();
}

async function flushBackgroundSave(actionKey) {
    const state = backgroundSaveStates.get(actionKey);
    if (!state) return;
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
    if (state.running) {
        await state.runningPromise;
        if (backgroundSaveStates.has(actionKey)) return flushBackgroundSave(actionKey);
        return;
    }

    const action = state.nextAction;
    state.nextAction = null;
    if (!action) {
        backgroundSaveStates.delete(actionKey);
        updateSaveStatusIndicator();
        return;
    }

    state.running = true;
    state.runningPromise = Promise.resolve().then(action);
    // 이번 시도가 실패든 성공이든, 재시도가 다시 시작됐다는 뜻이므로 일단 "저장실패" 표시는
    // 내리고 스피너로 되돌린다(성공하면 그대로 사라지고, 다시 실패하면 아래 catch에서 다시 켠다).
    failedBackgroundSaveKeys.delete(actionKey);
    updateSaveStatusIndicator();
    try {
        await state.runningPromise;
    } catch (error) {
        console.error(`${actionKey} 자동 저장 실패:`, error);
        failedBackgroundSaveKeys.add(actionKey);
        showToastMessage(getSaveErrorMessage(error, true, actionKey), { duration: 7000 });
    } finally {
        state.running = false;
        state.runningPromise = null;
        if (state.nextAction) state.timer = setTimeout(() => flushBackgroundSave(actionKey), 0);
        else backgroundSaveStates.delete(actionKey);
        updateSaveStatusIndicator();
    }
}

async function flushAllBackgroundSaves() {
    while (backgroundSaveStates.size) {
        await Promise.all([...backgroundSaveStates.keys()].map(flushBackgroundSave));
    }
}

// 하단 네비게이션 바로 위에 떠 있는 저장 상태 표시기(#saveStatusIndicator). 평소엔 완전히
// 숨어 있다가, 백그라운드 저장(queueBackgroundSave 계열: 앱 설정/개인정보/운행기록 클라우드
// 동기화 등)이 대기·진행 중일 때만 조용히 스피너를 띄우고, 저장이 끝나면 바로 사라진다.
// 실패해서 재시도가 필요한 항목이 하나라도 있으면(failedBackgroundSaveKeys) 스피너 대신
// "저장실패" 문구로 바뀐다 — 이때 구체적으로 뭐가 실패했는지는 이 표시기가 아니라 토스트
// (getSaveErrorMessage)에서 안내한다.
function updateSaveStatusIndicator() {
    const el = document.getElementById('saveStatusIndicator');
    if (!el) return;
    const saving = backgroundSaveStates.size > 0;
    const failed = !saving && failedBackgroundSaveKeys.size > 0;
    el.classList.toggle('is-visible', saving || failed);
    el.classList.toggle('is-failed', failed);
}

// 오프라인 상태에서 저장이 실패해도(디바운스 타이머가 아직 남아있는 경우) 온라인으로
// 복귀하는 즉시 대기 중인 백그라운드 저장을 다시 시도한다. 이미 실패해서 큐에서 빠진
// 항목까지 되살리지는 못하지만(다음 편집 때 diff로 자연스럽게 재시도됨), 아직 대기 중인
// 저장은 온라인 복귀를 몇 분씩 기다리지 않고 즉시 반영된다.
window.addEventListener('online', () => {
    flushAllBackgroundSaves().catch(error => {
        console.error('온라인 복귀 후 대기 중인 저장 재시도 실패:', error);
    });
});

// 개인정보/운행기록을 입력하면 로컬(localStorage)에는 즉시 동기로 저장되지만, 클라우드
// 반영은 320~600ms 디바운스 타이머가 지난 뒤에야 실행된다. 문제는 이 타이머가 setTimeout
// 기반이라, 사용자가 입력 직후 앱을 백그라운드로 보내거나(다른 앱 전환, 화면 끄기) 탭을
// 완전히 닫으면 — 특히 모바일 브라우저는 백그라운드 탭의 타이머를 강하게 지연시키거나
// 아예 실행을 멈춘다 — 그 타이머가 영영 실행되지 않아 로컬엔 저장된 값이 클라우드에는
// 한 번도 반영되지 못하는 문제가 있었다(실제로 "완전히 종료하지 않으면 최종 저장이 안 된다"
// 는 형태로 보고됨). 로컬 값 자체는 항상 안전하지만, 다른 기기에서 로그인하거나 이 기기의
// 저장공간이 지워지면 그 사이 클라우드에 못 올라간 변경분이 사라진 것처럼 보인다.
//
// visibilitychange(탭이 백그라운드로 전환되는 시점)와 pagehide(실제 종료/이동 시점)에 남아있는
// 모든 배경 저장을 즉시 flush해서, 타이머가 지연되기 전에 최대한 빨리 실제로 반영되게 한다.
// beforeunload는 모바일에서 신뢰도가 낮아 pagehide를 함께 쓴다.
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        flushAllBackgroundSaves().catch(error => {
            console.error('화면 전환 시 대기 중인 저장 반영 실패:', error);
        });
    }
});
window.addEventListener('pagehide', () => {
    flushAllBackgroundSaves().catch(() => {});
});

class RequestTimeoutError extends Error {
    constructor(message = '서버 응답 시간이 초과되었습니다.') {
        super(message);
        this.name = 'RequestTimeoutError';
        this.code = 'REQUEST_TIMEOUT';
    }
}

async function executeApiRequest(requestFactory, { timeoutMs = 10000 } = {}) {
    if (typeof requestFactory !== 'function') throw new TypeError('요청 함수가 필요합니다.');
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    let timeoutId = null;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            controller?.abort();
            reject(new RequestTimeoutError());
        }, Math.max(1000, timeoutMs));
    });

    try {
        return await Promise.race([
            Promise.resolve().then(() => requestFactory({ signal: controller?.signal })),
            timeoutPromise
        ]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

// queueBackgroundSave의 actionKey만 보고 "무엇이" 저장 안 됐는지 사람이 읽을 수 있는 말로
// 바꾼다. 토스트 문구에서 "자동 저장에 실패했습니다"처럼 뭉뚱그리지 않고, 실제로 뭘 다시
// 저장해야 하는지 구체적으로 안내하기 위함이다. 매핑에 없는(내부용) 키는 빈 문자열을 반환해
// 기존처럼 일반 문구로 자연스럽게 대체된다.
function getSaveKeySubject(actionKey) {
    if (actionKey === 'settings') return '앱 설정';
    if (actionKey === 'personal-info') return '개인정보';
    if (actionKey === 'billing-settings') return '정산 설정';
    if (actionKey === 'supabase-settings-sync') return '앱 설정/개인정보(클라우드 동기화)';
    if (typeof actionKey === 'string' && actionKey.indexOf('supabase-workdata-sync-') === 0) return '운행 기록(클라우드 동기화)';
    return '';
}

function getSaveErrorMessage(error, isAutomatic = false, actionKey = '') {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const timedOut = error?.code === 'REQUEST_TIMEOUT'
        || error?.name === 'RequestTimeoutError'
        || error?.name === 'AbortError';
    const subject = getSaveKeySubject(actionKey);
    const label = subject ? `${subject} ` : '';
    if (offline) return `${label}${isAutomatic ? '자동 저장' : '저장'}하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.`;
    if (timedOut) return `${label}서버 응답이 늦어 ${isAutomatic ? '자동 저장' : '저장'}을 완료하지 못했습니다. 다시 시도해 주세요.`;
    return `${label}${isAutomatic ? '자동 저장' : '저장'} 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.`;
}

function showRetryableSaveError(error, retryCallback) {
    showConfirmModal(getSaveErrorMessage(error), retryCallback, {
        title: '저장 실패',
        cancelLabel: '닫기',
        confirmLabel: '다시 시도',
        tone: 'primary'
    });
}

// 금액 만 단위 축약 표기 헬퍼
function formatFareShort(amount) {
    if (amount >= 10000) {
        let man = Math.round(amount / 10000);
        return `${man}만`;
    }
    return `${amount.toLocaleString()}원`;
}

// 설정 데이터 핸들러
function getUserSettings() {
    return JSON.parse(localStorage.getItem('userSettings')) || {};
}

// 예전엔 "고정노선의 고정 거래처/단가/파렛트"가 앱설정에 메인/기사차량별로 따로 있었는데,
// 이제 거래처 등록 화면에서 거래처 하나에 지정한다(§거래처 등록 개편, saveClient가 계정
// 전체에서 항상 최대 1곳만 켜지도록 보장한다). 메인/기사차량 구분 없이 이 거래처 하나를
// 그대로 쓴다 — 나중에 차량별로 따로 두고 싶어지면 client 쪽에 스코프 필드 하나만 추가하면
// 되는 구조라 되돌리기 쉽다.
function getFixedRouteClient(settings) {
    return (settings.clients || []).find(client => client.fixedRouteLinked) || null;
}

function getActiveLogSettings() {
    const settings = getUserSettings();
    if (activeLogId === 'main') return settings;

    return {
        ...settings,
        inputMode: settings.subInputMode,
        fixedOn: settings.subFixedOn,
        callDetailOn: settings.subCallDetailOn,
        paymentOn: settings.subPaymentOn,
        timeOn: settings.subTimeOn,
        platformOn: settings.subPlatformOn,
        distanceOn: settings.subDistanceOn,
        cargoTonnageOn: settings.hasOwnProperty('subCargoTonnageOn') ? settings.subCargoTonnageOn : true,
        runCountToggle: settings.subRunCountToggle,
        runCountPresets: settings.subRunCountPresets
    };
}
function setUserSettings(settings) {
    localStorage.setItem('userSettings', JSON.stringify(settings));
    scheduleNormalizedEntitySync();
    if (typeof scheduleSupabaseSettingsSync === 'function') scheduleSupabaseSettingsSync();
}

const NORMALIZED_SCHEMA_VERSION = 1;
const NORMALIZED_ENTITY_KEYS = Object.freeze({
    meta: 'normalizedSchemaMeta',
    users: 'entityUsers',
    vehicles: 'entityVehicles',
    dailyLogs: 'entityDailyLogs',
    transportDetails: 'entityTransportDetails',
    maintenanceRecords: 'entityMaintenanceRecords',
    fuelRecords: 'entityFuelRecords',
    miscExpenseRecords: 'entityMiscExpenseRecords',
    clients: 'entityClients',
    taxInvoices: 'entityTaxInvoices'
});

// FNV-1a를 서로 다른 시드/승수로 두 번 돌려 32비트 해시 두 조각(총 64비트, 16자리 hex)을 이어붙인다.
// 입력이 같으면 항상 같은 출력(결정론적)이며, 결과 공간이 기존 32비트(약 43억) 대비 크게 넓어진다.
// randomUUID 등 비결정적 값은 buildNormalizedEntitySnapshot()의 재실행 시 같은 레코드가 중복 생성되므로 쓰지 않는다.
function createNormalizedId(prefix, ...parts) {
    const source = parts.map(part => String(part ?? '')).join('|');

    const hashWithSeed = (seed, multiplier) => {
        let hash = seed;
        for (let index = 0; index < source.length; index += 1) {
            hash ^= source.charCodeAt(index);
            hash = Math.imul(hash, multiplier);
        }
        // 마무리 믹싱(avalanche) 라운드: 두 해시 절반이 비슷한 입력에서도 서로 잘 갈리도록 보강
        hash ^= hash >>> 16;
        hash = Math.imul(hash, 0x85ebca6b);
        hash ^= hash >>> 13;
        hash = Math.imul(hash, 0xc2b2ae35);
        hash ^= hash >>> 16;
        return (hash >>> 0).toString(16).padStart(8, '0');
    };

    const high = hashWithSeed(2166136261, 16777619);
    const low = hashWithSeed(0x9e3779b9, 0x5bd1e995);
    return `${prefix}_${high}${low}`;
}

function getNormalizedUserId() {
    const storedId = localStorage.getItem('normalizedUserId');
    if (storedId) return storedId;
    const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID().replace(/-/g, '')
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    const userId = `usr_${randomPart}`;
    localStorage.setItem('normalizedUserId', userId);
    return userId;
}

function parseEntityNumber(value) {
    const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
}

function getNormalizedVehicleSources(settings) {
    const cars = Array.isArray(settings.cars) ? settings.cars : [];
    const sources = new Map();
    const mainCar = cars.find(car => car?.type === 'main') || {
        number: settings.carNumber || 'main',
        tonnage: settings.carTonnage || '',
        type: 'main'
    };

    sources.set('main', { logId: 'main', storageKey: 'workData', car: mainCar });
    cars.filter(car => car?.type === 'sub' && car.number).forEach(car => {
        sources.set(car.number, { logId: car.number, storageKey: `workData_${car.number}`, car });
    });

    for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith('workData_')) continue;
        const logId = key.slice('workData_'.length);
        if (!logId || sources.has(logId)) continue;
        sources.set(logId, {
            logId,
            storageKey: key,
            car: { number: logId, tonnage: '', type: 'sub', archived: true }
        });
    }
    return [...sources.values()];
}

function buildNormalizedEntitySnapshot() {
    const settings = getUserSettings();
    const userId = getNormalizedUserId();
    const clients = Array.isArray(settings.clients) ? settings.clients : [];
    const clientEntities = clients.filter(client => client && typeof client === 'object').map((client, index) => ({
        ...client,
        id: createNormalizedId('cli', userId, client.companyName || index),
        userId,
        displayOrder: index
    }));
    const clientIdByName = new Map(clientEntities.map(client => [client.companyName, client.id]));

    const vehicleSources = getNormalizedVehicleSources(settings);
    const vehicleEntities = [];
    const vehicleIdByLogId = new Map();
    const vehicleIdByNumber = new Map();
    vehicleSources.forEach(({ logId, car }, index) => {
        const { personalInfo, ...vehicleFields } = car || {};
        const vehicleId = createNormalizedId('veh', userId, logId);
        const entity = {
            ...vehicleFields,
            id: vehicleId,
            userId,
            legacyLogId: logId,
            number: car?.number || (logId === 'main' ? '' : logId),
            type: car?.type || (logId === 'main' ? 'main' : 'sub'),
            displayOrder: index,
            driverLegalName: personalInfo?.name || '',
            driverBusinessNumber: personalInfo?.bizNumber || '',
            driverBankName: personalInfo?.bank || '',
            driverAccountNumber: personalInfo?.account || ''
        };
        vehicleEntities.push(entity);
        vehicleIdByLogId.set(logId, vehicleId);
        if (entity.number) vehicleIdByNumber.set(entity.number, vehicleId);
    });

    const dailyLogs = [];
    const transportDetails = [];
    const maintenanceRecords = [];
    const fuelRecords = [];
    const miscExpenseRecords = [];

    vehicleSources.forEach(({ logId, storageKey }) => {
        const vehicleId = vehicleIdByLogId.get(logId);
        const sourceData = readWorkDataStorage(storageKey);
        Object.keys(sourceData).sort().forEach(workDate => {
            const rawRecord = sourceData[workDate] === 'off'
                ? { isOff: true }
                : sourceData[workDate];
            if (!rawRecord || typeof rawRecord !== 'object' || Array.isArray(rawRecord)) return;

            const {
                callDetails = [],
                maintItems = [],
                fuelItems = [],
                miscItems = [],
                ...dailyFields
            } = rawRecord;
            const dailyLogId = createNormalizedId('day', userId, vehicleId, workDate);
            dailyLogs.push({
                ...dailyFields,
                id: dailyLogId,
                userId,
                vehicleId,
                workDate,
                fixedCount: parseEntityNumber(rawRecord.fixedCount),
                palletCount: parseEntityNumber(rawRecord.palletCount)
            });

            (Array.isArray(callDetails) ? callDetails : []).forEach((detail, index) => {
                const safeDetail = detail && typeof detail === 'object' ? detail : {};
                transportDetails.push({
                    ...safeDetail,
                    id: createNormalizedId('trp', dailyLogId, 'detail', index),
                    dailyLogId,
                    userId,
                    vehicleId,
                    clientId: clientIdByName.get(safeDetail.client) || null,
                    workDate,
                    sequence: index,
                    sourceType: 'transport_detail',
                    fareAmount: parseEntityNumber(safeDetail.fare),
                    distanceKm: parseEntityNumber(safeDetail.distanceKm),
                    insuranceFeeAmount: parseEntityNumber(safeDetail.insuranceFee)
                });
            });

            (Array.isArray(maintItems) ? maintItems : []).forEach((item, index) => {
                const safeItem = item && typeof item === 'object' ? item : {};
                maintenanceRecords.push({
                    ...safeItem,
                    id: createNormalizedId('mnt', dailyLogId, index),
                    dailyLogId,
                    userId,
                    vehicleId,
                    workDate,
                    sequence: index,
                    costAmount: parseEntityNumber(safeItem.fare),
                    mileageKm: parseEntityNumber(safeItem.mileage)
                });
            });

            (Array.isArray(fuelItems) ? fuelItems : []).forEach((item, index) => {
                const safeItem = item && typeof item === 'object' ? item : {};
                fuelRecords.push({
                    ...safeItem,
                    id: createNormalizedId('ful', dailyLogId, index),
                    dailyLogId,
                    userId,
                    vehicleId,
                    workDate,
                    sequence: index,
                    costAmount: parseEntityNumber(safeItem.cost),
                    subsidyAmount: parseEntityNumber(safeItem.subsidy),
                    volumeLiter: parseEntityNumber(safeItem.liter),
                    mileageKm: parseEntityNumber(safeItem.mileage)
                });
            });

            (Array.isArray(miscItems) ? miscItems : []).forEach((item, index) => {
                const safeItem = item && typeof item === 'object' ? item : {};
                miscExpenseRecords.push({
                    ...safeItem,
                    id: createNormalizedId('msc', dailyLogId, index),
                    dailyLogId,
                    userId,
                    vehicleId,
                    workDate,
                    sequence: index,
                    costAmount: parseEntityNumber(safeItem.fare)
                });
            });
        });
    });

    const taxInvoiceEntities = getTaxInvoiceRecords().map((invoice, index) => {
        const safeInvoice = invoice && typeof invoice === 'object' ? invoice : {};
        const legacyId = safeInvoice.id || `${safeInvoice.flow || 'sales'}|${safeInvoice.monthKey || ''}|${safeInvoice.partyKey || index}`;
        return {
            ...safeInvoice,
            id: createNormalizedId('tax', userId, legacyId),
            legacyId,
            userId,
            vehicleId: vehicleIdByNumber.get(safeInvoice.carNumber) || null,
            clientId: clientIdByName.get(safeInvoice.clientName) || null,
            supplyAmount: parseEntityNumber(safeInvoice.supplyAmount),
            taxAmount: parseEntityNumber(safeInvoice.taxAmount),
            totalAmount: parseEntityNumber(safeInvoice.totalAmount)
        };
    });

    const userEntity = {
        id: userId,
        accountType: settings.accountType || '',
        name: settings.userName || '',
        phone: settings.userPhone || '',
        businessName: settings.bizName || '',
        businessNumber: settings.bizNumber || '',
        businessAddress: settings.bizAddress || '',
        businessType: settings.bizType || '',
        businessItem: settings.bizItem || '',
        businessEmail: settings.bizEmail || '',
        bankName: settings.bankName || '',
        accountNumber: settings.accountNumber || ''
    };
    const generatedAt = new Date().toISOString();
    const entities = {
        users: [userEntity],
        vehicles: vehicleEntities,
        dailyLogs,
        transportDetails,
        maintenanceRecords,
        fuelRecords,
        miscExpenseRecords,
        clients: clientEntities,
        taxInvoices: taxInvoiceEntities
    };
    const meta = {
        schemaVersion: NORMALIZED_SCHEMA_VERSION,
        generatedAt,
        source: 'legacy-local-storage-mirror',
        legacyCompatibility: true,
        relations: {
            vehicles: 'userId -> users.id',
            dailyLogs: 'vehicleId -> vehicles.id',
            transportDetails: 'dailyLogId -> dailyLogs.id',
            maintenanceRecords: 'dailyLogId -> dailyLogs.id',
            fuelRecords: 'dailyLogId -> dailyLogs.id',
            miscExpenseRecords: 'dailyLogId -> dailyLogs.id',
            taxInvoices: 'vehicleId -> vehicles.id, clientId -> clients.id'
        },
        counts: Object.fromEntries(Object.entries(entities).map(([key, value]) => [key, value.length]))
    };
    return { meta, ...entities };
}

function syncNormalizedEntityStore() {
    const snapshot = buildNormalizedEntitySnapshot();
    const writes = new Map([
        [NORMALIZED_ENTITY_KEYS.meta, snapshot.meta],
        [NORMALIZED_ENTITY_KEYS.users, snapshot.users],
        [NORMALIZED_ENTITY_KEYS.vehicles, snapshot.vehicles],
        [NORMALIZED_ENTITY_KEYS.dailyLogs, snapshot.dailyLogs],
        [NORMALIZED_ENTITY_KEYS.transportDetails, snapshot.transportDetails],
        [NORMALIZED_ENTITY_KEYS.maintenanceRecords, snapshot.maintenanceRecords],
        [NORMALIZED_ENTITY_KEYS.fuelRecords, snapshot.fuelRecords],
        [NORMALIZED_ENTITY_KEYS.miscExpenseRecords, snapshot.miscExpenseRecords],
        [NORMALIZED_ENTITY_KEYS.clients, snapshot.clients],
        [NORMALIZED_ENTITY_KEYS.taxInvoices, snapshot.taxInvoices]
    ]);
    const previousValues = new Map([...writes.keys()].map(key => [key, localStorage.getItem(key)]));
    try {
        writes.forEach((value, key) => localStorage.setItem(key, JSON.stringify(value)));
    } catch (error) {
        previousValues.forEach((value, key) => {
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key, value);
        });
        throw error;
    }
    return snapshot;
}

function scheduleNormalizedEntitySync() {
    queueBackgroundSave('normalized-entities', syncNormalizedEntityStore, 180);
}

function getNormalizedEntitySnapshot() {
    const read = (key, fallback) => {
        try {
            const value = JSON.parse(localStorage.getItem(key) || 'null');
            return value ?? fallback;
        } catch (error) {
            return fallback;
        }
    };
    return {
        meta: read(NORMALIZED_ENTITY_KEYS.meta, { schemaVersion: NORMALIZED_SCHEMA_VERSION }),
        users: read(NORMALIZED_ENTITY_KEYS.users, []),
        vehicles: read(NORMALIZED_ENTITY_KEYS.vehicles, []),
        dailyLogs: read(NORMALIZED_ENTITY_KEYS.dailyLogs, []),
        transportDetails: read(NORMALIZED_ENTITY_KEYS.transportDetails, []),
        maintenanceRecords: read(NORMALIZED_ENTITY_KEYS.maintenanceRecords, []),
        fuelRecords: read(NORMALIZED_ENTITY_KEYS.fuelRecords, []),
        miscExpenseRecords: read(NORMALIZED_ENTITY_KEYS.miscExpenseRecords, []),
        clients: read(NORMALIZED_ENTITY_KEYS.clients, []),
        taxInvoices: read(NORMALIZED_ENTITY_KEYS.taxInvoices, [])
    };
}

function isOwnerAccountType(type) {
    return type === 'owner_driver';
}

function getDriverSettlementModeMeta(mode) {
    const modes = {
        company: { label: '회사 정산', description: '회사가 거래처에 매출 계산서를 발행하고 기사 계산서를 수취합니다.' },
        driver_direct: { label: '기사 직접 정산', description: '기사가 거래처에 직접 발행하고 회사는 기사에게 수수료 계산서를 발행합니다.' },
        employee: { label: '직원 기사', description: '회사가 거래처에 발행하며 기사 계산서는 만들지 않습니다.' },
        none: { label: '계산서 미사용', description: '이 기사차량 운행분은 계산서 자동 생성에서 제외합니다.' }
    };
    return modes[mode] || modes.company;
}

function getEffectiveDriverSettlementMode(car, settings = getUserSettings()) {
    const selected = car?.settlementMode || 'default';
    return selected === 'default' ? (settings.defaultDriverSettlementMode || 'company') : selected;
}

// ========== 로그인/회원가입 3뷰 라우팅 ==========
// 구 "첫 시작 사용자 유형 선택"(accountTypePage) 화면은 앱 진입 흐름에서 완전히 제거됐다 —
// 차주/소속 기사 선택은 이제 회원가입 화면(authSignupView) 안의 탭으로 통합된다. 로그인
// 페이지는 항상 authIntroView(선택 화면)로 시작하고, 한 번에 반드시 1개 뷰만 보인다.
function showLocalLoginPage() {
    hideAllPages();
    document.body.classList.add('account-flow-active');
    document.getElementById('loginPage')?.classList.remove('hidden');
    showAuthSubView('intro');
}

// intro/login/signup 3개 뷰 중 하나만 보이게 전환하는 단일 함수.
function showAuthSubView(view) {
    const introView = document.getElementById('authIntroView');
    const loginView = document.getElementById('authLoginView');
    const signupView = document.getElementById('authSignupView');

    introView?.classList.toggle('hidden', view !== 'intro');
    loginView?.classList.toggle('hidden', view !== 'login');
    signupView?.classList.toggle('hidden', view !== 'signup');

    if (view === 'login') {
        // 로그인 화면에 들어올 때마다 입력값을 비워서 이전 시도의 흔적이 남지 않게 한다.
        const nameInput = document.getElementById('loginUserName');
        const phoneInput = document.getElementById('loginUserPhone');
        const passwordInput = document.getElementById('loginPassword');
        if (nameInput) nameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (passwordInput) passwordInput.value = '';
        updateLoginButtonState();
    } else if (view === 'signup') {
        switchSignupRole(currentSignupRole || 'owner_driver');
        const nameInput = document.getElementById('signupName');
        const phoneInput = document.getElementById('signupPhone');
        const pwInput = document.getElementById('signupPw');
        const pwConfirmInput = document.getElementById('signupPwConfirm');
        const inviteInput = document.getElementById('signupInviteCode');
        if (nameInput) nameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (pwInput) pwInput.value = '';
        if (pwConfirmInput) pwConfirmInput.value = '';
        if (inviteInput) inviteInput.value = '';
        updateSignupButtonState();
    }
}

// 회원가입 화면의 차주/소속 기사 탭 전환.
let currentSignupRole = 'owner_driver';
function switchSignupRole(role) {
    currentSignupRole = (role === 'employed_driver') ? 'employed_driver' : 'owner_driver';
    document.querySelectorAll('.auth-role-tab').forEach(tab => {
        const isTarget = tab.dataset.role === currentSignupRole;
        tab.classList.toggle('active', isTarget);
        tab.setAttribute('aria-checked', String(isTarget));
    });

    const subText = document.getElementById('signupRoleSubtitle');
    const inviteRow = document.getElementById('signupInviteBlock');
    if (currentSignupRole === 'owner_driver') {
        if (subText) subText.textContent = '본인 차량 일지 및 기사를 관리해요.';
        if (inviteRow) inviteRow.classList.add('hidden');
    } else {
        if (subText) subText.textContent = '초대 코드나 전화번호로 사장님과 연결해요.';
        if (inviteRow) inviteRow.classList.remove('hidden');
    }
    updateSignupButtonState();
}

function openForgotPwModal() {
    showConfirmModal(
        '비밀번호를 분실하셨나요?\n\n소속 기사님의 경우 사장님을 통해 임시 비밀번호를 재발급받으실 수 있습니다.\n기타 문의는 고객센터 1:1 문의를 이용해 주세요.',
        null,
        { title: '비밀번호 찾기', confirmLabel: '확인', cancelLabel: '닫기', tone: 'primary' }
    );
}

// [비회원으로 시작하기] — Supabase 계정을 만들지 않고 로컬에서만 앱을 사용한다.
// accountType(차주/소속기사)은 앱 전역의 아주 많은 로직(isOwnerAccountType 등)이 전제로
// 삼는 값이라 빈 채로 두지 않는다 — 이제 accountTypePage가 없어 별도 선택 화면으로
// 보낼 수 없으므로, 별도 선택 없이 기본값(차주)으로 시작하고 필요하면 나중에 마이페이지에서
// 정식 가입/역할을 다시 정할 수 있게 한다.
function startGuestMode() {
    const settings = getUserSettings();
    settings.accountType = settings.accountType || 'owner_driver';
    settings.driverType = settings.driverType || settings.accountType;
    settings.isLoggedIn = false;
    settings.onboardingCompleted = true;
    // isLoggedIn:false만으로는 "아직 로그인 전인 새 설치"와 "의도적으로 비회원을 선택함"을
    // 구분할 수 없다 — 이 플래그가 없으면 새로고침할 때마다(부팅 로직이 isLoggedIn이 false인
    // 사용자를 로그인 화면으로 보내므로) 매번 다시 "비회원으로 시작하기"를 눌러야 한다.
    settings.guestMode = true;
    setUserSettings(settings);
    document.body.classList.remove('account-flow-active');
    if (typeof loadSettings === 'function') loadSettings();
    updateAccountRoleUI();
    showToastMessage('비회원 모드로 시작합니다. 언제든 마이페이지에서 로그인할 수 있어요.');
    showMain();
}

// ---------- 로그인 화면 ----------
function updateLoginButtonState() {
    const name = document.getElementById('loginUserName')?.value.trim() || '';
    const phoneDigits = document.getElementById('loginUserPhone')?.value.replace(/\D/g, '') || '';
    const password = document.getElementById('loginPassword')?.value || '';
    const btn = document.getElementById('loginSubmitBtn');
    if (btn) btn.disabled = !name || phoneDigits.length < 10 || password.length < 6;
}

async function executeLoginAction() {
    const name = document.getElementById('loginUserName')?.value.trim() || '';
    const phone = document.getElementById('loginUserPhone')?.value.trim() || '';
    const password = document.getElementById('loginPassword')?.value || '';
    if (!name || phone.replace(/\D/g, '').length < 10) {
        showToastMessage('이름과 휴대전화 번호를 확인해 주세요.');
        return;
    }
    if (password.length < 6) {
        showToastMessage('비밀번호는 6자 이상 입력해 주세요.');
        return;
    }

    let authUser = null;
    if (typeof getSupabaseClient === 'function') {
        const email = phoneToFakeEmail(phone);
        const { data, error } = await supabaseSignIn(email, password);
        if (error) { showToastMessage(getSupabaseAuthErrorMessage(error)); return; }
        authUser = data?.user || null;
        if (authUser && typeof markSupabaseAccountEverCreated === 'function') markSupabaseAccountEverCreated();
    }

    // 로그인은 항상 "이미 계정이 있는" 기존 유저의 재접속이다 — 서버에 저장된 accountType/
    // 사업자정보 등을 그대로 복원한다(로컬에 남아있던 값으로 덮어쓰지 않는다).
    if (authUser && typeof hydrateFromSupabaseAndMigrate === 'function') {
        try {
            await hydrateFromSupabaseAndMigrate();
        } catch (error) {
            console.error('Supabase 데이터 동기화 실패(로컬 데이터로 계속 진행합니다):', error);
        }
    }

    const settings = getUserSettings();
    settings.userName = name;
    settings.userPhone = phone;
    settings.isLoggedIn = true;
    settings.onboardingCompleted = true;
    settings.guestMode = false;
    setUserSettings(settings);

    loadSettings();
    updateAccountRoleUI();
    renderSubCarMenu();
    showToastMessage('로그인되었습니다.');

    // 미연동 소속기사 안내는 더 이상 1.5초 뒤 스쳐 지나가는 토스트로 띄우지 않는다 — 로그인
    // 직후 잠깐 보이고 사라져서 놓치기 쉬웠다. 이제 알림 패널(getEmployerLinkNotificationItem)에
    // 연동되기 전까지 계속 남아있으면서, 눌러서 바로 연동 화면으로 갈 수 있다. showMain()이
    // 곧바로 updateOverdueNotification()을 통해 뱃지에 반영해 준다.
    showMain();
}

// ---------- 회원가입 화면 ----------
function updateSignupButtonState() {
    const name = document.getElementById('signupName')?.value.trim() || '';
    const phoneDigits = document.getElementById('signupPhone')?.value.replace(/\D/g, '') || '';
    const pw = document.getElementById('signupPw')?.value || '';
    const pwConfirm = document.getElementById('signupPwConfirm')?.value || '';
    const inviteDigits = document.getElementById('signupInviteCode')?.value.replace(/\D/g, '') || '';

    // 초대코드는 "소속 기사"일 때만, 그것도 선택 입력이다 — 아예 안 써도 되지만(가입 후
    // 나중에 연결해도 됨), 일부만 입력한 채로는 진행하지 못하게 막는다.
    const inviteFilledPartially = currentSignupRole === 'employed_driver' && inviteDigits.length > 0 && inviteDigits.length < 6;
    const pwOk = pw.length >= 6 && pw === pwConfirm;

    const btn = document.getElementById('signupSubmitBtn');
    if (btn) btn.disabled = !name || phoneDigits.length < 10 || !pwOk || inviteFilledPartially;
}

async function executeSignupAction() {
    const name = document.getElementById('signupName')?.value.trim() || '';
    const phone = document.getElementById('signupPhone')?.value.trim() || '';
    const pw = document.getElementById('signupPw')?.value || '';
    const pwConfirm = document.getElementById('signupPwConfirm')?.value || '';
    const inviteCode = currentSignupRole === 'employed_driver' ? (document.getElementById('signupInviteCode')?.value.trim() || '') : '';

    if (!name || phone.replace(/\D/g, '').length < 10) {
        showToastMessage('이름과 휴대전화 번호를 확인해 주세요.');
        return;
    }
    if (pw.length < 6) {
        showToastMessage('비밀번호는 6자 이상 입력해 주세요.');
        return;
    }
    if (pw !== pwConfirm) {
        showToastMessage('비밀번호 확인이 일치하지 않습니다.');
        return;
    }
    if (inviteCode && !/^\d{6}$/.test(inviteCode)) {
        showToastMessage('초대코드는 6자리 숫자로 입력해 주세요.');
        return;
    }

    const settings = getUserSettings();
    settings.accountType = currentSignupRole;
    settings.driverType = currentSignupRole;
    setUserSettings(settings);
    updateAccountRoleUI();

    // 여기서는 오직 "계정 생성"만 처리한다 — 기사 연결(redeemDriverInviteCode)은 가입이
    // 완전히 끝난 뒤 별도 단계로 시도하며, 그 단계가 실패해도 이미 만든 계정은 절대
    // 되돌리지 않는다.
    let authUser = null;
    if (typeof getSupabaseClient === 'function') {
        const email = phoneToFakeEmail(phone);
        const { data, error } = await supabaseSignUp(email, pw);
        if (error) { showToastMessage(getSupabaseAuthErrorMessage(error)); return; }
        authUser = data?.user || null;
        if (authUser) await ensureProfileRow(authUser.id, currentSignupRole, name, phone);
        if (authUser && typeof markSupabaseAccountEverCreated === 'function') markSupabaseAccountEverCreated();
    }

    // Supabase 데이터 로드 + (기존 로컬 데이터가 있다면) 1회 마이그레이션. 반드시 "신규 유저
    // 여부" 판별보다 먼저 실행해야 새 기기에서 가입하는 기존 로컬 데이터 보유자를 신규 유저로
    // 오인해 온보딩 마법사를 불필요하게 다시 띄우지 않는다.
    // allowLocalMigration: true — 방금 이 기기에서 회원가입했으므로, 그 전까지 비회원(게스트)
    // 상태로 입력해 둔 로컬 데이터는 확실히 이 사람 본인 것이다(로그인과 달리, 남의 계정에
    // 잘못 덧씌워질 위험이 없다).
    if (authUser && typeof hydrateFromSupabaseAndMigrate === 'function') {
        try {
            await hydrateFromSupabaseAndMigrate({ allowLocalMigration: true });
        } catch (error) {
            console.error('Supabase 데이터 동기화 실패(로컬 데이터로 계속 진행합니다):', error);
        }
    }

    const settingsAfterHydration = getUserSettings();
    settingsAfterHydration.userName = name;
    settingsAfterHydration.userPhone = phone;
    settingsAfterHydration.accountType = currentSignupRole;
    settingsAfterHydration.driverType = currentSignupRole;
    // "신규 유저"는 hydrate 이후에도 onboardingCompleted가 전혀 없던 경우만이다 — 이 기기에
    // 이미 온보딩을 마친 로컬 기록(예: 이 업데이트 이전부터 쓰던 기존 유저의 첫 클라우드
    // 가입)이 있다면 온보딩을 다시 띄우지 않는다.
    const isNewUser = !settingsAfterHydration.hasOwnProperty('onboardingCompleted');

    settingsAfterHydration.isLoggedIn = true;
    settingsAfterHydration.onboardingCompleted = true;
    settingsAfterHydration.guestMode = false;
    setUserSettings(settingsAfterHydration);

    loadSettings();
    updateAccountRoleUI();
    renderSubCarMenu();

    if (currentSignupRole === 'employed_driver' && /^\d{6}$/.test(inviteCode)) {
        try {
            await performEmployedDriverConnect(inviteCode);
            showToastMessage('가입 및 사장님 연결이 모두 완료되었습니다.');
        } catch (error) {
            console.error('회원가입 직후 기사 연동 실패(계정 생성 자체는 완료됨):', error);
            showToastMessage(`${getDriverLinkErrorMessage(error)} 마이페이지 > 소속 연결에서 다시 시도할 수 있어요.`);
        }
    } else {
        showToastMessage('회원가입이 완료되었습니다.');
    }

    // 신규 유저는 3문항 온보딩 마법사를 먼저 보여주고, 마법사 완료 시점에 showMain()을 호출한다.
    // (드물게) 이미 온보딩을 마친 기존 로컬 데이터를 들고 처음 가입하는 경우는 마법사를
    // 건너뛰고 바로 메인으로 이동한다.
    if (isNewUser) {
        openOnboardingWizard();
    } else {
        showMain();
    }
}

// ========== 신규 유저용 온보딩 마법사 ==========
let onboardingWizardState = null;

// 계정 유형/차량 등록 상태에 따라 이번 마법사에서 보여줄 스텝 순서를 계산한다.
// (운행방식 → 결제여부 → 선택항목 → 차량등록[이미 메인 차량이 있으면 생략] → 정산방식[소속기사면 생략])
function getOnboardingStepSequence(settings) {
    const hasMainCar = (settings.cars || []).some(c => c.type === 'main');
    const isEmployedDriver = settings.accountType === 'employed_driver';
    const seq = [1, 2, 3];
    // 소속 기사는 메인 차량을 직접 입력하지 않는다 — openCarModal('main')과 동일한 이유로,
    // 반드시 차주와의 연동(초대코드)을 통해서만 채워져야 한다. 연동에 성공하면
    // applyEmployerAutoFilledInfo()가 이미 이 스텝이 열리기 전에 메인 차량을 채워 넣으므로
    // hasMainCar가 true가 되어 자연히 건너뛴다 — 아직 연동 전(또는 연동 자동입력이
    // 실패)이라도 이 스텝에서 임의의 차량번호를 직접 입력하게 두면, 나중에 실제로 연동됐을
    // 때 그 차량과 별개인 "가짜" 차량이 남아 운행기록이 갈라지는 문제로 이어진다.
    if (!hasMainCar && !isEmployedDriver) seq.push(4);
    if (!isEmployedDriver) seq.push(5);
    return seq;
}

function getDefaultOnboardingWizardState() {
    const settings = getUserSettings();
    return {
        step: 1,
        stepSequence: getOnboardingStepSequence(settings), // 마법사 시작 시점에 고정 (진행 중 변경되지 않음)
        workStyle: null,      // 'fixed' | 'call' | 'both'
        palletOn: false,
        paymentOn: null,      // true | false
        timeOn: false,
        cargoTonnageOn: false,
        platformOn: false,
        distanceOn: false,
        settlementMode: null  // 'company' | 'driver_direct' | 'employee' | 'none' | null(건너뛰기)
    };
}

// 풀스크린 온보딩 페이지(#onboardingPage)를 연다. 회원가입 직후에만 호출된다
// (executeSignupAction 참고). 이전 실행에서 남은 active 표시가 있을 수 있으니 초기화한다 —
// step4(차량 등록)의 카드는 토글이 아니라 항상 강조돼야 하는 단일 버튼이라 제외한다.
function openOnboardingWizard() {
    onboardingWizardState = getDefaultOnboardingWizardState();

    document.querySelectorAll('#onboardingStep1 .onboarding-card-btn, #onboardingStep2 .onboarding-card-btn, #onboardingStep3 .onboarding-card-btn, #onboardingStep5 .onboarding-card-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('onboardingPalletCard')?.classList.add('hidden');
    const palletToggle = document.getElementById('onboardingPalletToggle');
    if (palletToggle) palletToggle.checked = false;
    const carNumInput = document.getElementById('onboardingCarNumber');
    const carTonInput = document.getElementById('onboardingCarTonnage');
    if (carNumInput) carNumInput.value = '';
    if (carTonInput) carTonInput.value = '';

    hideAllPages();
    document.body.classList.add('account-flow-active');
    document.getElementById('onboardingPage')?.classList.remove('hidden');

    showOnboardingWizardStep(onboardingWizardState.stepSequence[0]);
}

function showOnboardingWizardStep(step) {
    if (!onboardingWizardState) return;
    onboardingWizardState.step = step;

    [1, 2, 3, 4, 5].forEach(n => {
        document.getElementById(`onboardingStep${n}`)?.classList.toggle('hidden', n !== step);
    });

    const seq = onboardingWizardState.stepSequence;
    const idx = seq.indexOf(step);

    // 1단계(idx === 0)에서는 뒤로갈 곳이 없으니 숨기고, 2단계부터 노출한다.
    document.getElementById('onboardingBackBtn')?.classList.toggle('hidden', idx <= 0);

    const counter = document.getElementById('onboardingStepCounter');
    if (counter) counter.textContent = `${idx + 1}/${seq.length}`;

    const nextBtn = document.getElementById('onboardingNextBtn');
    if (nextBtn) {
        nextBtn.textContent = (idx === seq.length - 1) ? '완료하기' : '다음';
        // Step1: 근무방식 선택 여부, Step2: 수금관리 선택 여부, Step4: 차량번호 2자 이상
        // 입력 여부가 있어야 "다음"이 활성화된다(건너뛰기는 이 조건과 무관하게 항상 가능).
        // 그 외 스텝(선택항목/정산방식)은 전부 선택 사항이라 항상 진행 가능하다.
        if (step === 1) nextBtn.disabled = !onboardingWizardState.workStyle;
        else if (step === 2) nextBtn.disabled = onboardingWizardState.paymentOn === null;
        else if (step === 4) updateOnboardingStep4State();
        else nextBtn.disabled = false;
    }
}

function selectOnboardingWorkStyle(value, btnEl) {
    if (!onboardingWizardState) return;
    onboardingWizardState.workStyle = value;
    document.querySelectorAll('#onboardingStep1 .onboarding-card-btn').forEach(btn => btn.classList.toggle('active', btn === btnEl));

    // 고정노선이 하나라도 포함된 방식(정해진 노선 / 둘 다)일 때만 파렛트 회수 여부를 물어본다.
    const showPallet = value === 'fixed' || value === 'both';
    document.getElementById('onboardingPalletCard')?.classList.toggle('hidden', !showPallet);
    if (!showPallet) {
        onboardingWizardState.palletOn = false;
        const palletToggle = document.getElementById('onboardingPalletToggle');
        if (palletToggle) palletToggle.checked = false;
    }

    const nextBtn = document.getElementById('onboardingNextBtn');
    if (nextBtn) nextBtn.disabled = false;
}

function toggleOnboardingPallet(checked) {
    if (!onboardingWizardState) return;
    onboardingWizardState.palletOn = checked;
}

// 상단 뒤로가기(<) — 현재 스텝 시퀀스 기준으로 바로 이전 스텝으로 돌아간다. 1단계에서는
// 버튼 자체가 숨겨져 있어 호출되지 않는다.
function goBackOnboardingStep() {
    if (!onboardingWizardState) return;
    const seq = onboardingWizardState.stepSequence;
    const idx = seq.indexOf(onboardingWizardState.step);
    if (idx > 0) {
        showOnboardingWizardStep(seq[idx - 1]);
    }
}

function selectOnboardingPayment(value, btnEl) {
    if (!onboardingWizardState) return;
    onboardingWizardState.paymentOn = value;
    document.querySelectorAll('#onboardingStep2 .onboarding-card-btn').forEach(btn => btn.classList.toggle('active', btn === btnEl));
    const nextBtn = document.getElementById('onboardingNextBtn');
    if (nextBtn) nextBtn.disabled = false;
}

// Step3(선택 항목)은 다중 선택 카드 — 클릭할 때마다 켜고 끈다.
function toggleOnboardingOptionCard(field, btnEl) {
    if (!onboardingWizardState) return;
    onboardingWizardState[field] = !onboardingWizardState[field];
    btnEl.classList.toggle('active', onboardingWizardState[field]);
}

// Step4(차량 등록) - 모달을 띄우지 않고 화면 안 입력란에 바로 차량번호/톤수를 입력받는다.
// 차량번호가 2글자 이상이어야 "다음"이 활성화된다(건너뛰기는 언제든 가능). 실제 저장은
// finishOnboardingWizard()가 이 스텝을 지나갈 때(다음으로 진행하거나 마법사를 끝낼 때) 한
// 번에 처리한다.
function updateOnboardingStep4State() {
    const carNum = document.getElementById('onboardingCarNumber')?.value.trim() || '';
    const nextBtn = document.getElementById('onboardingNextBtn');
    if (nextBtn) nextBtn.disabled = carNum.length < 2;
}

// Step5(정산 방식, 차주 계정만 노출)
function selectOnboardingSettlementMode(value, btnEl) {
    if (!onboardingWizardState) return;
    onboardingWizardState.settlementMode = value;
    document.querySelectorAll('#onboardingStep5 .onboarding-card-btn').forEach(btn => btn.classList.toggle('active', btn === btnEl));
}

// 현재 스텝에서 다음 스텝으로 진행하거나, 더 이상 스텝이 없으면 마법사를 완료 처리한다.
// "다음"과 "건너뛰기 >"가 공유하는 단일 진행 함수다 — 진행 가능 여부(다음 버튼 disabled)는
// showOnboardingWizardStep()이 이미 걸러주므로, 여기서는 그냥 다음으로 넘어가기만 한다.
function advanceOnboardingStep() {
    if (!onboardingWizardState) return;
    const seq = onboardingWizardState.stepSequence;
    const idx = seq.indexOf(onboardingWizardState.step);
    if (idx === -1 || idx >= seq.length - 1) {
        finishOnboardingWizard();
    } else {
        showOnboardingWizardStep(seq[idx + 1]);
    }
}

function skipCurrentOnboardingStep() {
    advanceOnboardingStep();
}

function finishOnboardingWizard() {
    if (!onboardingWizardState) return;

    const isFixed = onboardingWizardState.workStyle === 'fixed' || onboardingWizardState.workStyle === 'both';
    const isCall = onboardingWizardState.workStyle === 'call' || onboardingWizardState.workStyle === 'both';

    const settings = getUserSettings();
    settings.fixedOn = isFixed;
    settings.callDetailOn = isCall;
    // 파렛트 회수는 이제 거래처 등록 화면에서 거래처별로 설정한다(§거래처 등록 개편) —
    // 온보딩 시점엔 아직 거래처를 안 만들었을 수 있어서 여기서 값을 저장할 곳이 없다.
    settings.paymentOn = !!onboardingWizardState.paymentOn;
    settings.timeOn = !!onboardingWizardState.timeOn;
    settings.cargoTonnageOn = !!onboardingWizardState.cargoTonnageOn;
    settings.platformOn = !!onboardingWizardState.platformOn;
    settings.distanceOn = !!onboardingWizardState.distanceOn;
    if (onboardingWizardState.settlementMode) {
        settings.defaultDriverSettlementMode = onboardingWizardState.settlementMode;
    }

    // Step4(차량 등록) 인라인 입력값 저장. 이 스텝 자체가 "메인 차량이 아직 없을 때만"
    // stepSequence에 포함되므로(getOnboardingStepSequence), 여기 도달했다는 것 자체가
    // 마법사 시작 시점엔 메인 차량이 없었다는 뜻이다 — 그래도 saveCarFromModal()과 동일하게
    // 기존 메인 차량이 있으면 새로 만들지 않고 그 차량을 갱신한다(방어적 처리).
    const carNum = document.getElementById('onboardingCarNumber')?.value.trim();
    const carTon = document.getElementById('onboardingCarTonnage')?.value.trim() || '';
    if (carNum) {
        if (!Array.isArray(settings.cars)) settings.cars = [];
        const mainCar = settings.cars.find(c => c.type === 'main');
        if (mainCar) {
            mainCar.number = carNum;
            mainCar.tonnage = carTon;
        } else {
            settings.cars.unshift({ type: 'main', number: carNum, tonnage: carTon });
        }
    }

    settings.onboardingCompleted = true;
    setUserSettings(settings);

    onboardingWizardState = null;

    loadSettings();
    showMain();
}

function updateAccountRoleUI() {
    const settings = getUserSettings();
    const ownerRole = isOwnerAccountType(settings.accountType);
    document.getElementById('employedDriverLinkCard')?.classList.toggle('hidden', settings.accountType !== 'employed_driver');
    // 마이페이지의 "연결 관리" 바로가기 — 예전엔 차주에게만 보였고, 소속기사는 이 항목이
    // 아예 없어서 개인정보 화면까지 들어가야만 소속 연결 카드를 찾을 수 있었다. 차주와
    // 동일하게 마이페이지에서 바로 접근하도록 두 역할 모두에게 보여주고, 라벨만 역할에 맞게
    // 바꾼다 — showDriverConnectionManagement()가 이미 역할에 따라 알맞은 화면(차주: 기사
    // 연동 관리 페이지 / 소속기사: 개인정보의 소속 연결 카드)으로 안내해 준다.
    const driverConnectionLink = document.getElementById('myPageDriverConnectionLink');
    if (driverConnectionLink) {
        driverConnectionLink.classList.remove('hidden');
        const label = driverConnectionLink.querySelector('span');
        if (label) label.textContent = ownerRole ? '기사연동관리' : '소속 연결 관리';
    }
    // 소속 연결 카드가 사업자정보 카드 자리를 대신 채우면서(아래 applyPersonalInfoRoleUI)
    // 두 계정 종류 모두 카드 4개(정보1/정보2/연결또는사업자/계정)로 맞춰져 계정 카드 번호는
    // 이제 역할과 무관하게 항상 '04'다.
    const accountCardNumber = document.getElementById('personalAccountCardNumber');
    if (accountCardNumber) accountCardNumber.textContent = '04';

    const loginButton = document.getElementById('personalLoginBtn');
    const logoutButton = document.getElementById('personalLogoutBtn');
    loginButton?.classList.toggle('hidden', !!settings.isLoggedIn);
    logoutButton?.classList.toggle('hidden', !settings.isLoggedIn);
    renderEmployedDriverLinkState();
    applyPersonalInfoRoleUI(settings.accountType);
}

// 계정 종류에 따라 개인정보 화면의 카드 구성을 바꾼다.
// - 차주(owner_driver): 기존과 동일하게 사업자정보 카드를 그대로 보여준다.
// - 소속기사(employed_driver): 회사 사업자정보 카드를 숨기고(입력/수정 자체를 막음),
//   "대표자·연락처" 카드를 기사 본인 정보 중심 문구로 바꿔서 재사용한다.
// 중요: bizName 등 입력란은 DOM에서 "숨기기"만 할 뿐 제거하지 않는다 — loadSettings()가
// 화면을 열 때마다 그 값을 그대로 채워 넣으므로, 숨겨진 채로 commitPersonalInfo()가 실행돼도
// 기존 값(차주에게서 자동반영된 사업자정보 포함)이 그대로 왕복 저장될 뿐 손실되지 않는다.
function applyPersonalInfoRoleUI(accountType) {
    const isEmployedDriver = accountType === 'employed_driver';

    document.getElementById('bizInfoCard')?.classList.toggle('hidden', isEmployedDriver);

    const contactTitle = document.getElementById('contactCardTitle');
    const contactDesc = document.getElementById('contactCardDesc');
    const userNameLabel = document.getElementById('userNameLabel');
    const contactIcon = document.getElementById('contactCardIcon');
    const settlementIcon = document.getElementById('settlementCardIcon');

    if (contactTitle) contactTitle.textContent = isEmployedDriver ? '기사 정보' : '대표자 · 연락처';
    if (contactDesc) contactDesc.textContent = isEmployedDriver ? '본인 기본 정보' : '대표자 기본 정보';
    if (userNameLabel) userNameLabel.textContent = isEmployedDriver ? '이름' : '성명 (대표자)';
    if (contactIcon) contactIcon.textContent = isEmployedDriver ? '01' : '02';
    if (settlementIcon) settlementIcon.textContent = isEmployedDriver ? '02' : '03';
}

function showConfirmModal(msg, callback, options = {}) {
    const modal = document.getElementById('confirmModal');
    const title = document.getElementById('confirmModalTitle');
    const cancelButton = document.getElementById('confirmModalCancelBtn');
    const confirmButton = document.getElementById('confirmModalConfirmBtn');
    document.getElementById('confirmModalText').innerText = msg;
    if (title) title.textContent = options.title || '경고';
    if (cancelButton) cancelButton.textContent = options.cancelLabel || '취소';
    if (confirmButton) confirmButton.textContent = options.confirmLabel || '확인';
    modal.dataset.tone = options.tone || 'danger';
    confirmCallback = callback;
    modal.classList.remove('hidden');
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.add('hidden');
    delete modal.dataset.tone;
    confirmCallback = null;
}

function executeConfirm() {
    if (confirmCallback) confirmCallback();
    closeConfirmModal();
}

function getShortCarNum(carNum) {
    if (!carNum || carNum === 'main') return carNum;
    const match = carNum.match(/\d{4}$/); 
    return match ? match[0] : carNum; 
}

function updateTransportSettingsUI() {
    const settings = getUserSettings();
    const cars = settings.cars || [];
    const hasActiveSubLog = cars.some(car => car.type === 'sub' && car.logEnabled);
    const mainTitle = document.getElementById('mainSettingsTitle');
    
    if (hasActiveSubLog) {
        if(mainTitle) mainTitle.innerText = '메인 운행 일지 설정';
    } else {
        if(mainTitle) mainTitle.innerText = '운행 일지 설정';
    }
}

function renderSubCarMenu() {
    const container = document.getElementById('subCarLogMenuContainer');
    if (!container) return;
    container.innerHTML = '';
    
    const settings = getUserSettings();
    const cars = settings.cars || [];

    cars.forEach(car => {
        if (car.type === 'sub' && car.logEnabled) {
            const wrapper = document.createElement('div');
            wrapper.className = 'menu-item-wrapper';

            const btn = document.createElement('button');
            btn.className = 'dropdown-item';
            const shortNum = getShortCarNum(car.number);
            const driverName = car.personalInfo && car.personalInfo.driverName ? car.personalInfo.driverName : '';
            btn.title = driverName ? `${car.number} · ${driverName} 운행일지` : `${car.number} 운행일지`;
            
            if (activeLogId === car.number) {
                btn.style.cssText = 'display: flex; align-items: center; gap: 10px; color: var(--sub-text-color); padding-right: 0; opacity: 0.4; cursor: default;';
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                    <span class="sub-car-menu-label">${escapeDetailText(shortNum)} 일지</span>
                `;
            } else {
                btn.style.cssText = 'display: flex; align-items: center; gap: 10px; color: var(--sub-text-color); padding-right: 0;';
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                    <span class="sub-car-menu-label">${escapeDetailText(shortNum)} 일지</span>
                `;
                btn.onclick = () => switchCarLog(car.number);
            }

            const gearBtn = document.createElement('button');
            gearBtn.className = 'menu-item-gear';
            gearBtn.title = "기사차량 운행일지 설정";
            gearBtn.innerHTML = `
                <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            `;
            gearBtn.onclick = (e) => {
                e.stopPropagation(); 
                showSubCarSettings(car.number);
            };

            wrapper.appendChild(btn);
            wrapper.appendChild(gearBtn);
            container.appendChild(wrapper);
        }
    });
    renderLinkedDriverMenu();
}

// 차주가 연동된 기사의 기록을 조회/집계할 때, 해당 날짜가 실제 할당 기간 안에 있는지 판별한다.
// 소속기사 본인의 workData 조회에는 적용하지 않는다 (연동 조회/집계 전용).
function isDateWithinAssignment(dateKey, assignmentStart, assignmentEnd) {
    if (!assignmentStart) return true; // 할당 시작일 자체가 없으면 제한 없이 전부 포함 (레거시 데이터 보호)
    if (dateKey < assignmentStart) return false;
    if (assignmentEnd && dateKey > assignmentEnd) return false;
    return true;
}

function generateLocalId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function showSubCarSettings(carNum) {
    previousPage = 'main';
    settingsReturnLogId = activeLogId;
    hideAllPages();
    loadSettings(); 
    document.getElementById('subCarSettingsPage').classList.remove('hidden');
    document.getElementById('subCarSettingsTitle').innerText = `${getShortCarNum(carNum)} 기사차량 운행 일지 설정`;
}

function switchCarLog(carNum) {
    activeLogId = carNum;
    document.body.classList.toggle('sub-car-log-active', carNum !== 'main');
    const bannerImg = document.getElementById('mainBannerImage');
    const bannerTxt = document.getElementById('mainBannerText');

    if (carNum === 'main') {
        if(bannerImg) bannerImg.style.display = 'inline-block';
        if(bannerTxt) bannerTxt.innerText = '운행 일지';
        if(bannerTxt) bannerTxt.classList.remove('sub-banner-text');
        workData = loadWorkDataForLog('main');
    } else {
        if(bannerImg) bannerImg.style.display = 'none';
        if(bannerTxt) bannerTxt.innerText = `${getShortCarNum(carNum)} 운행 일지`;
        if(bannerTxt) bannerTxt.classList.add('sub-banner-text');
        workData = loadWorkDataForLog(carNum);
    }
    
    normalizeLegacyData();
    renderSubCarMenu(); 
    buildCalendar();
    showMain(true);
    
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('sideMenuOverlay');
    menu.classList.remove('open');
    overlay.classList.remove('show');
}

// workData(운행 기록) 저장소 접근의 유일한 경계 지점. Supabase 연동 시 이 두 함수
// 내부만 localStorage → API 호출로 바꾸면 되고, 나머지 코드(운행 기록 계산, 화면
// 렌더링 등 workData를 메모리에서 읽고 쓰는 수백 곳)는 전혀 손댈 필요가 없다.
// logId는 'main' 또는 서브 차량 번호(car.number)다.
function loadWorkDataForLog(logId) {
    const key = logId === 'main' ? 'workData' : 'workData_' + logId;
    return JSON.parse(localStorage.getItem(key)) || {};
}

function saveWorkDataForLog(logId, data) {
    const key = logId === 'main' ? 'workData' : 'workData_' + logId;
    localStorage.setItem(key, JSON.stringify(data));
    if (typeof scheduleSupabaseWorkDataSync === 'function') scheduleSupabaseWorkDataSync(logId);
}

function saveDataToStorage() {
    writeWorkDataStoreForLog(activeLogId, workData);
}

// 미수금 등에서 지금 열려 있는 차량 로그(activeLogId)가 아닌 다른 차량의 운행 기록도
// 다뤄야 할 때 쓰는 헬퍼. logId는 'main' 또는 서브 차량 번호(car.number)다.
// activeLogId와 같은 로그를 읽을 때는 이미 메모리에 로드돼 수정 중인 전역 workData를
// 그대로 반환한다(참조를 공유하므로 그 자리에서 바로 수정해도 화면과 어긋나지 않는다).
// (다른 로그를 읽을 때는 readWorkDataStorage의 JSON 파싱 오류 방어를 그대로 쓰기 위해
// loadWorkDataForLog가 아니라 readWorkDataStorage를 계속 사용한다 — 동작을 바꾸지 않기 위함)
function readWorkDataStoreForLog(logId) {
    if (logId === activeLogId) return workData;
    return readWorkDataStorage(logId === 'main' ? 'workData' : 'workData_' + logId);
}

// 특정 로그의 운행 기록 저장소를 저장한다. saveDataToStorage()가 activeLogId에 대해 하던
// 일을 임의의 logId에 대해서도 똑같이 할 수 있도록 일반화한 버전이다. 실제 저장(키 계산
// + setItem)은 saveWorkDataForLog에 위임하고, 여기서는 그 위에 얹히는 부가 로직(고용
// 기사 연동 사본 동기화, 정규화 스토어 동기화 예약)만 처리한다.
function writeWorkDataStoreForLog(logId, data) {
    saveWorkDataForLog(logId, data);
    if (logId === 'main') {
        const settings = getUserSettings();
        const employerLink = settings.accountType === 'employed_driver' && settings.employerLink?.status === 'linked'
            ? settings.employerLink
            : null;
        const connectionKey = employerLink
            ? (employerLink.inviteCode || String(employerLink.ownerPhone || '').replace(/\D/g, ''))
            : '';
        if (connectionKey) localStorage.setItem(`linkedDriverWorkData_${connectionKey}`, JSON.stringify(data));
    }
    scheduleNormalizedEntitySync();
}

function normalizeLegacyData() {
    let dataChanged = false;

    for (let key in workData) {
        if (workData[key] === 'off') {
            workData[key] = {
                isOff: true,
                fixedCount: 0,
                palletCount: 0,
                maintItems: [],
                fuelItems: [],
                miscItems: [],
                callDetails: []
            };
            dataChanged = true;
        }

        if (!workData[key].callDetails) {
            workData[key].callDetails = [];
            dataChanged = true;
        }

        if (!workData[key].fuelItems) {
            workData[key].fuelItems = [];
            dataChanged = true;
        }

        if (!workData[key].miscItems) {
            workData[key].miscItems = [];
            dataChanged = true;
        }

    }

    if (dataChanged) {
        saveDataToStorage();
    }
}

// 거래처(client)에 이름과 무관한 고유 id를 부여하는 1회성 마이그레이션.
// id가 이미 있는 거래처는 건드리지 않고, id가 없는(과거에 저장된) 거래처만 새로 생성해 채운다.
function normalizeLegacyClientIds() {
    const settings = getUserSettings();
    if (!Array.isArray(settings.clients) || settings.clients.length === 0) return;

    let changed = false;
    settings.clients.forEach(client => {
        if (!client.id) {
            client.id = generateLocalId('client');
            changed = true;
        }
    });

    if (changed) {
        setUserSettings(settings);
    }
}

function getRecordTotalDistance(record) {
    const details = Array.isArray(record?.callDetails) ? record.callDetails : [];
    const hasDetailDistance = details.some(detail => String(detail?.distanceKm ?? '').trim() !== '');
    if (hasDetailDistance) {
        return details.reduce((total, detail) => total + (parseFloat(detail?.distanceKm) || 0), 0);
    }
    return parseFloat(record?.dailyDistance) || 0;
}

function populateYearMonthSelects(yearId, monthId) {
    const yearSelect = document.getElementById(yearId);
    const monthSelect = document.getElementById(monthId);
    const currentYear = new Date().getFullYear();

    yearSelect.innerHTML = '';
    monthSelect.innerHTML = '';

    for(let y = currentYear - 10; y <= currentYear + 10; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = `${y}년`;
        yearSelect.appendChild(opt);
    }

    for(let m = 0; m < 12; m++) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = `${m + 1}월`;
        monthSelect.appendChild(opt);
    }
}

function initDateSelects() {
    populateYearMonthSelects('yearSelect', 'monthSelect');
}

function initMaintDateSelects() {
    populateYearMonthSelects('maintYearSelect', 'maintMonthSelect');
}

function initFuelDateSelects() {
    populateYearMonthSelects('fuelYearSelect', 'fuelMonthSelect');
}

function initMiscDateSelects() {
    populateYearMonthSelects('miscYearSelect', 'miscMonthSelect');
}

function changeYearMonth() {
    const y = parseInt(document.getElementById('yearSelect').value, 10);
    const m = parseInt(document.getElementById('monthSelect').value, 10);
    viewDate.setDate(1);
    viewDate.setFullYear(y);
    viewDate.setMonth(m);
    buildCalendar();
}

function initCalendarDOM() {
    const cellsContainer = document.getElementById('calendar-cells');
    cellsContainer.innerHTML = '';
    calendarCells.length = 0;

    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.classList.add('date-cell');
        
        const dateText = document.createElement('span');
        dateText.className = 'cell-date-text';
        cell.appendChild(dateText);

        cell.addEventListener('click', () => {
            if (cell.dataset.dateKey) {
                const month = parseInt(cell.dataset.month, 10);
                const day = parseInt(cell.dataset.day, 10);
                openModal(cell.dataset.dateKey, month, day);
            }
        });

        cellsContainer.appendChild(cell);
        calendarCells.push(cell);
    }
}

function formatCurrencyInput(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    if (value) {
        input.value = parseInt(value, 10).toLocaleString();
    } else {
        input.value = '';
    }
}

function parseCurrencyValue(str) {
    if (!str) return 0;
    return parseInt(String(str).replace(/[^0-9]/g, ''), 10) || 0;
}

function formatPhoneNumber(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length < 4) {
        input.value = value;
    } else if (value.length < 7) {
        input.value = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length < 11) {
        input.value = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6)}`;
    } else {
        input.value = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    }
}

async function downloadPDF() {
    const element = document.getElementById('reportContentToExport');
    document.body.classList.add('pdf-export-mode');
    
    if (!isDetailReportView) {
        buildReportPage(true);
    } else {
        viewDetailReport(true);
    }

    await new Promise(resolve => setTimeout(resolve, 50));

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth() + 1;
    
    let fileName = `${currentYear}년_${currentMonth}월_운송비내역서.pdf`;
    if (isDetailReportView) {
        const titleText = document.getElementById('reportMonthTitle').textContent;
        const match = titleText.match(/\((.*?)\)/);
        const clientName = match ? match[1] : '전체';
        fileName = `${currentYear}년_${currentMonth}월_운송비내역서(세부)_${clientName}.pdf`;
    }
    
    const opt = {
        margin:       [12, 10, 12, 10],
        filename:     fileName, 
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0, backgroundColor: '#ffffff' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(element).save();
    } finally {
        document.body.classList.remove('pdf-export-mode');
        if (!isDetailReportView) {
            buildReportPage(false); 
        } else {
            viewDetailReport(false);
        }
    }
}

async function prepareReportExport() {
    document.body.classList.add('pdf-export-mode');
    if (!isDetailReportView) buildReportPage(true);
    else viewDetailReport(true);
    await new Promise(resolve => setTimeout(resolve, 80));
    return document.getElementById('reportContentToExport');
}

function finishReportExport() {
    document.body.classList.remove('pdf-export-mode');
    if (!isDetailReportView) buildReportPage(false);
    else viewDetailReport(false);
}

function getReportFileBaseName() {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth() + 1;
    if (!isDetailReportView) return `${year}년_${month}월_운송비내역서`;
    const title = document.getElementById('reportMonthTitle').textContent;
    const client = title.match(/\((.*?)\)/)?.[1] || '전체';
    return `${year}년_${month}월_운송비내역서(세부)_${client}`;
}

async function createReportCanvas() {
    const element = await prepareReportExport();
    return createReportCanvasFromElement(element);
}

async function createReportCanvasFromElement(element) {
    const worker = html2pdf().set({
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            scrollX: 0,
            scrollY: 0,
            backgroundColor: '#ffffff',
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight
        }
    }).from(element).toCanvas();
    return worker.get('canvas');
}

function createPngBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG 이미지 생성 실패')), 'image/png');
    });
}

async function downloadReportImage() {
    let imageUrl = '';
    try {
        const canvas = await createReportCanvas();
        const blob = await createPngBlob(canvas);
        const link = document.createElement('a');
        link.download = `${getReportFileBaseName()}.png`;
        imageUrl = URL.createObjectURL(blob);
        link.href = imageUrl;
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error('운송비 내역서 이미지 저장 실패:', error);
        showToastMessage('이미지 저장에 실패했습니다.');
    } finally {
        if (imageUrl) setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
        finishReportExport();
    }
}

function openReportShareModal() { document.getElementById('reportShareModal').classList.remove('hidden'); }
function closeReportShareModal() { document.getElementById('reportShareModal').classList.add('hidden'); }

function getDetailReportClientContact() {
    if (!isDetailReportView || currentDetailClientFilter === 'ALL') return null;
    const client = getUserSettings().clients?.find(item => item.companyName === currentDetailClientFilter);
    return client?.phone ? { name: client.companyName, phone: client.phone } : null;
}

async function createReportFile(type) {
    const element = await prepareReportExport();
    const baseName = getReportFileBaseName();
    if (type === 'image') {
        const canvas = await createReportCanvasFromElement(element);
        const blob = await createPngBlob(canvas);
        return new File([blob], `${baseName}.png`, { type: 'image/png' });
    }
    const opt = { margin:[12,10,12,10], image:{type:'jpeg',quality:.98}, html2canvas:{scale:2,useCORS:true,logging:false,scrollX:0,scrollY:0,backgroundColor:'#ffffff'}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} };
    const blob = await html2pdf().set(opt).from(element).outputPdf('blob');
    return new File([blob], `${baseName}.pdf`, { type: 'application/pdf' });
}

function getDefaultReportShareMessagePattern() {
    return '안녕하세요, {거래처} 담당자님. 운송비 내역서입니다. 확인 부탁드립니다.';
}

function getReportShareMessagePattern() {
    try {
        return localStorage.getItem('reportShareMessagePattern')?.trim()
            || getDefaultReportShareMessagePattern();
    } catch (error) {
        return getDefaultReportShareMessagePattern();
    }
}

function fillReportShareMessagePattern(pattern, company = '거래처') {
    return String(pattern).replaceAll('{거래처}', company || '거래처');
}

function getReportShareCompanyName() {
    return isDetailReportView && currentDetailClientFilter !== 'ALL'
        ? currentDetailClientFilter
        : '거래처';
}

function getReportShareMessage() {
    return fillReportShareMessagePattern(
        getReportShareMessagePattern(),
        getReportShareCompanyName()
    );
}

async function shareReportToKakaoTalk(type = 'pdf') {
    closeReportShareModal();
    try {
        const formatLabel = type === 'image' ? '이미지' : 'PDF';
        showToastMessage(`카카오톡으로 보낼 ${formatLabel}를 준비하고 있습니다.`);
        const file = await createReportFile(type);
        if (!navigator.share || (navigator.canShare && !navigator.canShare({ files: [file] }))) {
            showToastMessage('이 기기에서는 파일 공유를 지원하지 않습니다.');
            return;
        }
        await navigator.share({
            files: [file],
            title: '운송비 내역서',
            text: getReportShareMessage()
        });
    } catch (error) {
        if (error?.name !== 'AbortError') {
            console.error('카카오톡 내역서 공유 실패:', error);
            showToastMessage('카카오톡 파일 공유에 실패했습니다.');
        }
    } finally {
        finishReportExport();
    }
}

async function shareReportBySms(type = 'pdf') {
    const contact = getDetailReportClientContact();
    if (!contact) {
        showConfirmModal('특정 거래처의 상세내역을 조회하고, 거래처 연락처가 등록되어 있는지 확인해 주세요.', null);
        return;
    }

    closeReportShareModal();
    let fileUrl = '';
    try {
        const formatLabel = type === 'image' ? '이미지' : 'PDF';
        showToastMessage(`문자로 보낼 ${formatLabel}를 저장하고 있습니다.`);
        const file = await createReportFile(type);
        fileUrl = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.download = file.name;
        link.href = fileUrl;
        document.body.appendChild(link);
        link.click();
        link.remove();

        const separator = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?';
        const message = fillReportShareMessagePattern(getReportShareMessagePattern(), contact.name);
        window.location.href = `sms:${contact.phone}${separator}body=${encodeURIComponent(message)}`;
    } catch (error) {
        console.error('문자용 내역서 저장 실패:', error);
        showToastMessage('문자용 파일 저장에 실패했습니다.');
    } finally {
        if (fileUrl) setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
        finishReportExport();
    }
}

function hideAllPages() {
    closeNotificationPanel();
    document.body.classList.remove('account-flow-active');
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    
    const workModal = document.getElementById('workModal');
    if(workModal) workModal.classList.add('hidden');
    
    document.getElementById('sideMenu').classList.remove('open');
    document.getElementById('sideMenuOverlay').classList.remove('show');
    
    document.getElementById('pdfDownloadBtn').style.display = 'none';
    
    const pdfGroup = document.getElementById('pdfDropdownGroup');
    if (pdfGroup) pdfGroup.style.display = 'none';
    const pdfMenu = document.getElementById('pdfMenuDropdown');
    if (pdfMenu) pdfMenu.classList.remove('show');

    const backBtn = document.getElementById('subCarBackBtn');
    if (backBtn) backBtn.style.display = 'none';

    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) notificationBtn.style.display = 'none';
}

let mobileBackIntegrationReady = false;
let mobileNativeExitRequested = false;

function handleCurrentAppBack() {
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu?.classList.contains('open')) {
        toggleMenu();
        return true;
    }

    const notificationPanel = document.getElementById('notificationPanel');
    if (notificationPanel?.classList.contains('open')) {
        closeNotificationPanel();
        return true;
    }

    const visibleModals = [...document.querySelectorAll('.modal-overlay:not(.hidden)')];
    const visibleModal = visibleModals[visibleModals.length - 1];
    if (visibleModal) {
        const modalBackButton = visibleModal.querySelector(
            'button[title="뒤로가기"], button[aria-label="뒤로가기"], .modal-btn.cancel, button.cancel'
        );
        if (modalBackButton) modalBackButton.click();
        else visibleModal.classList.add('hidden');
        return true;
    }

    const visiblePage = document.querySelector('.page:not(.hidden)');
    const pageBackButton = visiblePage?.querySelector(
        'button[title="뒤로가기"]:not(.hidden), button[aria-label="뒤로가기"]:not(.hidden)'
    );
    if (pageBackButton) {
        pageBackButton.click();
        return true;
    }

    if (activeLogId !== 'main' && !document.getElementById('mainPage')?.classList.contains('hidden')) {
        switchCarLog('main');
        return true;
    }

    return false;
}

function armMobileBackGuard() {
    try {
        history.pushState({ ...(history.state || {}), appBackGuard: true }, document.title);
    } catch (error) {
        console.warn('모바일 뒤로가기 상태 저장 실패:', error);
    }
}

function setupMobileBackIntegration() {
    if (mobileBackIntegrationReady || !window.history?.pushState) return;
    mobileBackIntegrationReady = true;

    try {
        history.replaceState({ ...(history.state || {}), appBackRoot: true, appBackGuard: false }, document.title);
        armMobileBackGuard();
    } catch (error) {
        console.warn('모바일 뒤로가기 초기화 실패:', error);
        return;
    }

    window.addEventListener('popstate', () => {
        if (mobileNativeExitRequested) {
            mobileNativeExitRequested = false;
            return;
        }

        if (handleCurrentAppBack()) {
            armMobileBackGuard();
            return;
        }

        mobileNativeExitRequested = true;
        history.back();
    });
}

function setActiveNav(pageId) {
    document.querySelectorAll('.bottom-nav-bar .nav-item').forEach(item => item.classList.remove('active'));
    const navItems = document.querySelectorAll('.bottom-nav-bar .nav-item');
    if (navItems.length >= 3) {
        if (pageId === 'main') {
            navItems[0].classList.add('active');
        } else if (pageId === 'workModal') {
            navItems[1].classList.add('active');
        } else if (pageId === 'revenue') {
            navItems[2].classList.add('active');
        } else if (pageId === 'personal' && navItems[3]) {
            navItems[3].classList.add('active');
        }
    }
}

function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('sideMenuOverlay');
    if (menu.classList.contains('open')) {
        menu.classList.remove('open');
        overlay.classList.remove('show');
    } else {
        menu.classList.add('open');
        overlay.classList.add('show');
        renderSubCarMenu(); 
    }
    
    const pdfMenu = document.getElementById('pdfMenuDropdown');
    if (pdfMenu) pdfMenu.classList.remove('show');
}

function togglePdfMenu() {
    const menu = document.getElementById('pdfMenuDropdown');
    if (menu) {
        menu.classList.toggle('show');
    }
}

function showMain(skipRedirect = false) {
    if (!skipRedirect && activeLogId !== 'main') {
        switchCarLog('main');
        return;
    }

    hideAllPages();
    document.getElementById('mainPage').classList.remove('hidden');
    // 차량관리 등 다른 화면에서 무언가 저장하고 홈으로 돌아왔을 때, 홈 화면(mainPage)은
    // hideAllPages()로 숨겨져만 있었을 뿐 DOM에 그대로 남아있던 예전 렌더링을 다시 보여주는
    // 것뿐이라 그 사이의 변경(수수료 설정 등 달력 수치에 영향을 주는 값)이 반영 안 된 "이전
    // 기록"이 잠깐 보였다가, 다른 계기로 buildCalendar()가 다시 불릴 때에야 최신 값으로
    // 바뀌는 것처럼 보이는 문제가 있었다(실제로 보고됨). 여기서 항상 다시 그려서 이 화면이
    // 뜰 때는 항상 최신 상태이게 한다.
    buildCalendar();

    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) notificationBtn.style.display = 'flex';
    
    const backBtn = document.getElementById('subCarBackBtn');
    if (backBtn && activeLogId !== 'main') {
        backBtn.style.display = 'flex'; 
    }

    document.getElementById('menuReportBtn').style.display = 'flex';
    setActiveNav('main');
    checkBackupReminder();
}

let utilityReturnPage = 'main';
let personalInfoReturnPage = 'myPage';
let utilityReturnLogId = 'main';
let personalInfoReturnLogId = 'main';
let myPageReturnLogId = 'main';
let settingsReturnLogId = 'main';

function getValidReturnLogId(logId) {
    if (!logId || logId === 'main') return 'main';
    const cars = getUserSettings().cars || [];
    return cars.some(car => car.type === 'sub' && car.number === logId && car.logEnabled) ? logId : 'main';
}

function returnToLogHome(logId = 'main') {
    const targetLogId = getValidReturnLogId(logId);
    if (activeLogId !== targetLogId) {
        switchCarLog(targetLogId);
    } else {
        showMain(true);
    }
}

function setUtilityReturnPage(returnPage = 'main') {
    utilityReturnPage = returnPage === 'myPage' ? 'myPage' : 'main';
    utilityReturnLogId = activeLogId;
}

function goBackFromUtilityPage() {
    const returnPage = utilityReturnPage;
    const returnLogId = utilityReturnLogId;
    utilityReturnPage = 'main';
    if (returnPage === 'myPage') {
        showMyPage(true);
    } else {
        returnToLogHome(returnLogId);
    }
}

function populateLocationDataLists() {
    const loadLocSet = new Set();
    const unloadLocSet = new Set();

    for (let key in workData) {
        const record = workData[key];
        if (record && !record.isOff && record.callDetails) {
            record.callDetails.forEach(item => {
                if (item.loadLoc) loadLocSet.add(item.loadLoc.trim());
                if (item.unloadLoc) unloadLocSet.add(item.unloadLoc.trim());
            });
        }
    }

    const loadLocList = document.getElementById('loadLocList');
    const unloadLocList = document.getElementById('unloadLocList');

    if (loadLocList) {
        loadLocList.innerHTML = '';
        loadLocSet.forEach(loc => {
            if (loc !== '') {
                const option = document.createElement('option');
                option.value = loc;
                loadLocList.appendChild(option);
            }
        });
    }

    if (unloadLocList) {
        unloadLocList.innerHTML = '';
        unloadLocSet.forEach(loc => {
            if (loc !== '') {
                const option = document.createElement('option');
                option.value = loc;
                unloadLocList.appendChild(option);
            }
        });
    }
}

// 상차지/하차지 즐겨찾기 칩을 예전엔 따로 관리했다(pinnedLoadLocations/pinnedUnloadLocations,
// 각각 최대 5개). 실제로는 "청양 애경"처럼 상차지로도 하차지로도 쓰이는 곳이 많아서 같은
// 곳을 두 번 등록해야 하는 비효율이 있었고, 세로 공간도 두 줄을 차지했다. 하나의 목록으로
// 합치고(pinnedLocations), 대신 "지금 포커스가 상차지/하차지 중 어디에 있는지"로 어느
// 입력란에 채울지 정한다(activeLocationShortcutTarget).
let activeLocationShortcutTarget = 'load';

function setActiveLocationShortcutTarget(type) {
    activeLocationShortcutTarget = type === 'unload' ? 'unload' : 'load';
}

// 기존 pinnedLoadLocations/pinnedUnloadLocations를 쓰던 계정을 한 번만 pinnedLocations로
// 합쳐준다. 이미 pinnedLocations가 있으면(마이그레이션 끝났거나 원래 신규 계정) 손대지 않는다.
function normalizeLegacyPinnedLocations() {
    const settings = getUserSettings();
    if (Array.isArray(settings.pinnedLocations)) return;

    const merged = [];
    [...(settings.pinnedLoadLocations || []), ...(settings.pinnedUnloadLocations || [])].forEach(loc => {
        const trimmed = String(loc || '').trim();
        if (trimmed && !merged.includes(trimmed)) merged.push(trimmed);
    });
    settings.pinnedLocations = merged.slice(0, PINNED_LOCATION_LIMIT);
    delete settings.pinnedLoadLocations;
    delete settings.pinnedUnloadLocations;
    setUserSettings(settings);
}

const PINNED_LOCATION_LIMIT = 10;
const LOCATION_SHORTCUT_DISPLAY_LIMIT = 12;

// "자주 + 최근" 랭킹: 상차지/하차지 구분 없이 이 계정이 실제로 입력한 모든 장소를 세어서,
// 등장 횟수가 많은 순 → 동률이면 최근에 쓴 순으로 정렬한다. 순수 최신순으로만 하면 어쩌다
// 한 번 간 곳이 단골 노선을 밀어낼 수 있어서(실제 피드백으로 지적됨) 빈도를 먼저 본다.
function getFrequentAndRecentLocations() {
    const stats = new Map(); // location -> { count, lastIndex(작을수록 최근) }
    let cursor = 0;
    const addLocation = value => {
        const location = String(value || '').trim();
        if (!location) return;
        const entry = stats.get(location) || { count: 0, lastIndex: Infinity };
        entry.count += 1;
        entry.lastIndex = Math.min(entry.lastIndex, cursor);
        stats.set(location, entry);
        cursor += 1;
    };
    const addFromDetail = item => { addLocation(item.loadLoc); addLocation(item.unloadLoc); };

    [...currentTempCallDetails].reverse().forEach(addFromDetail);
    Object.keys(workData).sort().reverse().forEach(dateKey => {
        [...(workData[dateKey]?.callDetails || [])].reverse().forEach(addFromDetail);
    });

    return [...stats.entries()]
        .sort((a, b) => (b[1].count - a[1].count) || (a[1].lastIndex - b[1].lastIndex))
        .map(([location]) => location);
}

function renderLocationShortcuts() {
    const settings = getUserSettings();
    const pinned = Array.isArray(settings.pinnedLocations) ? settings.pinnedLocations.filter(Boolean) : [];
    const locations = [...pinned, ...getFrequentAndRecentLocations().filter(location => !pinned.includes(location))]
        .slice(0, LOCATION_SHORTCUT_DISPLAY_LIMIT);
    const container = document.getElementById('callLocShortcuts');
    if (!container) return;

    container.innerHTML = '';
    container.style.display = locations.length ? 'flex' : 'none';
    locations.forEach(location => {
        const chip = document.createElement('span');
        chip.className = `location-chip${pinned.includes(location) ? ' pinned' : ''}`;

        const selectButton = document.createElement('button');
        selectButton.type = 'button';
        selectButton.className = 'location-chip-select';
        selectButton.textContent = location;
        selectButton.addEventListener('click', () => selectLocationShortcut(location));

        const pinButton = document.createElement('button');
        pinButton.type = 'button';
        pinButton.className = 'location-chip-pin';
        pinButton.textContent = pinned.includes(location) ? '★' : '☆';
        pinButton.title = pinned.includes(location) ? '고정 해제' : '장소 고정';
        pinButton.setAttribute('aria-label', `${location} ${pinButton.title}`);
        pinButton.addEventListener('click', () => togglePinnedLocation(location));

        chip.append(selectButton, pinButton);
        container.appendChild(chip);
    });
}

// 지금 포커스가 있던(또는 마지막으로 있었던) 입력란에 채운다 — 즐겨찾기 칩 자체는 상차지용/
// 하차지용 구분이 없는 하나의 목록이라, "어느 칩이냐"가 아니라 "지금 어느 입력란을 채우려는
// 참이냐"로 대상을 정한다.
function selectLocationShortcut(location) {
    const input = document.getElementById(activeLocationShortcutTarget === 'unload' ? 'callUnloadLoc' : 'callLoadLoc');
    if (input) input.value = location;
}

function togglePinnedLocation(location) {
    const settings = getUserSettings();
    const pinned = Array.isArray(settings.pinnedLocations) ? [...settings.pinnedLocations] : [];
    const index = pinned.indexOf(location);

    if (index >= 0) {
        pinned.splice(index, 1);
    } else {
        if (pinned.length >= PINNED_LOCATION_LIMIT) {
            showToastMessage(`고정 장소는 최대 ${PINNED_LOCATION_LIMIT}개까지 등록할 수 있습니다.`);
            return;
        }
        pinned.push(location);
    }

    settings.pinnedLocations = pinned;
    setUserSettings(settings);
    renderLocationShortcuts();
}

// 같은 차량이 배열에 중복으로 들어있는 걸 정리한다. 메인 차량은 항상 최대 1대만 있어야
// 하고, 기사차량은 차량번호가 같으면 같은 차량으로 본다. 중복이 있으면 supabaseId가
// 있는(=서버에 실제로 존재가 확인된) 쪽을 우선 남긴다. cars/clients 둘 다에 재사용한다.
function dedupeEntityList(list, keyOf) {
    if (!Array.isArray(list)) return { list: [], removed: 0 };
    const chosen = new Map();
    const order = [];
    list.forEach(item => {
        if (!item) return;
        const key = keyOf(item);
        if (!chosen.has(key)) {
            chosen.set(key, item);
            order.push(key);
            return;
        }
        const existing = chosen.get(key);
        if (!existing.supabaseId && item.supabaseId) chosen.set(key, item);
    });
    const deduped = order.map(key => chosen.get(key));
    return { list: deduped, removed: list.length - deduped.length };
}

function dedupeCars(cars) {
    const { list, removed } = dedupeEntityList(cars, car => car.type === 'sub' ? `sub:${car.number || ''}` : 'main');
    return { cars: list, removed };
}

function dedupeClients(clients) {
    const { list, removed } = dedupeEntityList(clients, client => client.companyName || client.id || '');
    return { clients: list, removed };
}

function showSettings(fromPage) {
    if (fromPage) previousPage = fromPage;
    settingsReturnLogId = activeLogId;
    loadSettings();
    hideAllPages();
    document.getElementById('settingsPage').classList.remove('hidden');
    // 설정은 더 이상 하단 네비게이션 항목이 아니라 사이드 메뉴로만 들어오므로, 하단 탭
    // 강조를 전부 지운다(해당 자리는 이제 "월매출" 탭이 차지하고 있어 잘못 강조되면 안 됨).
    setActiveNav('none');
}

function goBackFromSettings() {
    loadSettings();
    if (previousPage === 'report') {
        showReport();
    } else if (previousPage === 'myPage') {
        // 마이페이지의 "앱 설정" 바로가기로 들어온 경우, 뒤로가기는 마이페이지로 돌아가야 한다.
        // 이 분기가 없으면 previousPage가 'main'/'report' 둘 다 아니므로 else 분기(로그
        // 홈으로 복귀)를 타서, 마이페이지에서 들어왔는데 엉뚱하게 달력 화면으로 나가버린다.
        showMyPage(true);
    } else {
        returnToLogHome(settingsReturnLogId);
    }
}

function showReport(returnPage = 'main') {
    setUtilityReturnPage(returnPage);
    document.getElementById('sideMenu').classList.remove('open');
    document.getElementById('sideMenuOverlay').classList.remove('show');

    const settings = getUserSettings();
    const cars = settings.cars || [];
    const hasActiveSubLog = cars.some(car => car.type === 'sub' && car.logEnabled);

    if (hasActiveSubLog) {
        openReportCarSelectModal(cars);
    } else {
        executeShowReport('main');
    }
}

function executeShowReport(carNum) {
    if (activeLogId !== carNum) {
        switchCarLog(carNum);
    }
    
    hideAllPages();
    document.getElementById('reportPage').classList.remove('hidden');
    
    const savedSettings = getUserSettings();
    const isMain = activeLogId === 'main';
    const callDetailOn = isMain
        ? (savedSettings.hasOwnProperty('callDetailOn') ? !!savedSettings.callDetailOn : true)
        : (savedSettings.hasOwnProperty('subCallDetailOn') ? !!savedSettings.subCallDetailOn : true);

    if (callDetailOn) {
        document.getElementById('pdfDropdownGroup').style.display = 'block';
        document.getElementById('pdfDownloadBtn').style.display = 'none';
    } else {
        document.getElementById('pdfDropdownGroup').style.display = 'none';
        document.getElementById('pdfDownloadBtn').style.display = 'flex';
    }

    isDetailReportView = false;
    buildReportPage(false); 
}

function handleReportBack() {
    if (isDetailReportView) {
        isDetailReportView = false;
        buildReportPage(false);
    } else {
        goBackFromUtilityPage();
    }
}

function openReportCarSelectModal(cars) {
    const listContainer = document.getElementById('reportCarSelectList');
    listContainer.innerHTML = '';

    cars.forEach(car => {
        if (car.type === 'main' || (car.type === 'sub' && car.logEnabled)) {
            const btn = document.createElement('button');
            btn.className = 'report-car-option';
            const typeLabel = car.type === 'main' ? '메인차량' : '기사차량';
            btn.innerHTML = `<span class="report-car-option-mark" aria-hidden="true"></span><span class="report-car-option-copy"><strong>${typeLabel}</strong><small>${escapeDetailText(car.number)}</small></span><span class="report-car-option-arrow" aria-hidden="true">›</span>`;
            btn.onclick = () => {
                closeReportCarSelectModal();
                executeShowReport(car.type === 'main' ? 'main' : car.number);
            };
            listContainer.appendChild(btn);
        }
    });

    document.getElementById('reportCarSelectModal').classList.remove('hidden');
}

function closeReportCarSelectModal() {
    document.getElementById('reportCarSelectModal').classList.add('hidden');
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // 다크/라이트 모드는 예전엔 이 로컬 'theme' 키에만 저장돼서 Supabase에 전혀 올라가지
    // 않았다 — 그래서 새 기기로 로그인하면 항상 기본값(라이트)으로 보이는 문제가 있었다.
    // userSettings에도 함께 저장해 다른 앱설정과 똑같이 profiles.settings(jsonb)로
    // 동기화되게 한다(setUserSettings가 scheduleSupabaseSettingsSync를 자동으로 건다).
    const settings = getUserSettings();
    settings.theme = newTheme;
    setUserSettings(settings);
}

function setTheme(theme) {
    const iconContainer = document.getElementById('themeIcon');
    const textContainer = document.getElementById('themeText');
    
    if (theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        iconContainer.innerHTML = `<svg class="inline-icon sm" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
        textContainer.textContent = '다크 모드';
    } else {
        document.body.removeAttribute('data-theme');
        iconContainer.innerHTML = `<svg class="inline-icon sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
        textContainer.textContent = '라이트 모드';
    }
}

function toggleFixedSubSettings() {
    const checked = document.getElementById('fixedToggle').checked;
    setSettingsGroupExpanded(document.getElementById('fixedSubSettings'), checked);
}

function toggleSubFixedSettings() {
    const checked = document.getElementById('subFixedToggle').checked;
    const subFixedSection = document.getElementById('subFixedSubSettings');
    setSettingsGroupExpanded(subFixedSection, checked);
}

function setSettingsGroupExpanded(element, expanded, displayMode = 'block') {
    if (!element) return;
    window.clearTimeout(element._settingsCollapseTimer);
    element.classList.add('smooth-settings-group');

    // 숨겨진 페이지/모달을 초기화할 때는 최종 상태만 적용하고,
    // 사용자가 실제로 보고 있는 화면에서 토글할 때만 애니메이션을 실행한다.
    const parentIsVisible = !!element.parentElement?.getClientRects().length;
    if (!parentIsVisible) {
        element.style.display = expanded ? displayMode : 'none';
        element.style.maxHeight = expanded ? 'none' : '0px';
        element.style.opacity = expanded ? '1' : '0';
        element.style.overflow = expanded ? 'visible' : 'hidden';
        return;
    }

    if (expanded) {
        if (element.style.display !== 'none' && element.style.maxHeight === 'none') return;
        element.style.display = displayMode;
        element.style.overflow = 'hidden';
        element.style.maxHeight = '0px';
        element.style.opacity = '0';
        requestAnimationFrame(() => {
            element.style.maxHeight = `${element.scrollHeight}px`;
            element.style.opacity = '1';
        });
        element._settingsCollapseTimer = window.setTimeout(() => {
            if (element.style.display !== 'none') {
                element.style.maxHeight = 'none';
                element.style.overflow = 'visible';
            }
        }, 440);
        return;
    }

    if (element.style.display === 'none') return;
    element.style.overflow = 'hidden';
    element.style.maxHeight = `${element.scrollHeight}px`;
    element.style.opacity = '1';
    requestAnimationFrame(() => {
        element.style.maxHeight = '0px';
        element.style.opacity = '0';
    });
    element._settingsCollapseTimer = window.setTimeout(() => {
        element.style.display = 'none';
    }, 420);
}

function setInputMode(mode, target) {
    if (target === 'main') {
        const btnCount = document.getElementById('btnInputModeCount');
        const btnFare = document.getElementById('btnInputModeFare');
        if (btnCount && btnFare) {
            if (mode === 'count') {
                btnCount.classList.add('active-work');
                btnFare.classList.remove('active-work');
            } else {
                btnFare.classList.add('active-work');
                btnCount.classList.remove('active-work');
            }
        }
    } else {
        const btnSubCount = document.getElementById('btnSubInputModeCount');
        const btnSubFare = document.getElementById('btnSubInputModeFare');
        if (btnSubCount && btnSubFare) {
            if (mode === 'count') {
                btnSubCount.classList.add('active-work');
                btnSubFare.classList.remove('active-work');
            } else {
                btnSubFare.classList.add('active-work');
                btnSubCount.classList.remove('active-work');
            }
        }
    }
}


function normalizeSubRunCountPresetInput() {
    setRunCountPresetChipValues('sub', getRunCountPresetChipValues('sub'));
}

function toggleSubRunCountPresetSettings() {
    const toggle = document.getElementById('subRunCountToggle');
    const setting = document.getElementById('subRunCountPresetSettings');
    setSettingsGroupExpanded(setting, !!toggle?.checked, 'flex');
}

function hideToastMessage() {
    const toast = document.getElementById('toastMessage');
    toast?.classList.remove('show');
    if (toastHideTimer) clearTimeout(toastHideTimer);
    toastHideTimer = null;
}

function showToastMessage(msg = "저장되었습니다.", options = {}) {
    const toast = document.getElementById('toastMessage');
    if (!toast) return;
    const text = document.getElementById('toastMessageText');
    if (text) text.textContent = msg;
    else toast.textContent = msg;

    toast.classList.add('show');
    if (toastHideTimer) clearTimeout(toastHideTimer);
    toastHideTimer = setTimeout(hideToastMessage, options.duration || 2000);
}

function saveSettingsSmoothly() {
    queueBackgroundSave('settings', commitSettings, 430);
}

function saveSettings() {
    queueBackgroundSave('settings', commitSettings);
}

function commitSettings() {
    const settings = getUserSettings();
    
    const mainInputModeBtn = document.getElementById('btnInputModeFare');
    if (mainInputModeBtn) {
        settings.inputMode = mainInputModeBtn.classList.contains('active-work') ? 'fare' : 'count';
    }
    
    settings.fixedOn = document.getElementById('fixedToggle').checked;
    // 고정 거래처/단가/파렛트는 거래처 등록 화면으로 옮겨서 여기서는 더 이상 저장하지 않는다
    // (§거래처 등록 개편 — getFixedRouteClient()가 대신 클라이언트 목록에서 찾아온다).
    settings.fixedRouteOn = document.getElementById('fixedRouteToggle') ? document.getElementById('fixedRouteToggle').checked : false;
    settings.runCountToggle = document.getElementById('runCountToggle') ? document.getElementById('runCountToggle').checked : false;
    settings.runCountPresets = getRunCountPresetChipValues('main');
    
    // 조건 항목 저장
    settings.callDetailOn = document.getElementById('callDetailToggle').checked;
    settings.paymentOn = document.getElementById('paymentToggle').checked;
    settings.timeOn = document.getElementById('timeToggle') ? document.getElementById('timeToggle').checked : false;
    settings.platformOn = document.getElementById('platformToggle') ? document.getElementById('platformToggle').checked : false;
    settings.distanceOn = document.getElementById('distanceToggle') ? document.getElementById('distanceToggle').checked : false;
    settings.cargoTonnageOn = document.getElementById('cargoTonnageToggle') ? document.getElementById('cargoTonnageToggle').checked : true;

    if (document.getElementById('subFixedToggle')) {
        const subInputModeBtn = document.getElementById('btnSubInputModeFare');
        if (subInputModeBtn) {
            settings.subInputMode = subInputModeBtn.classList.contains('active-work') ? 'fare' : 'count';
        }

        settings.subFixedOn = document.getElementById('subFixedToggle').checked;
        settings.subFixedRouteOn = document.getElementById('subFixedRouteToggle') ? document.getElementById('subFixedRouteToggle').checked : false;

        // 기사차량 조건 항목 저장
        settings.subCallDetailOn = document.getElementById('subCallDetailToggle').checked;
        settings.subPaymentOn = document.getElementById('subPaymentToggle') ? document.getElementById('subPaymentToggle').checked : false;
        settings.subTimeOn = document.getElementById('subTimeToggle') ? document.getElementById('subTimeToggle').checked : false;
        settings.subPlatformOn = document.getElementById('subPlatformToggle') ? document.getElementById('subPlatformToggle').checked : false;
        settings.subDistanceOn = document.getElementById('subDistanceToggle') ? document.getElementById('subDistanceToggle').checked : false;
        settings.subCargoTonnageOn = document.getElementById('subCargoTonnageToggle') ? document.getElementById('subCargoTonnageToggle').checked : true;
        settings.subRunCountToggle = document.getElementById('subRunCountToggle') ? document.getElementById('subRunCountToggle').checked : false;
        settings.subRunCountPresets = getRunCountPresetChipValues('sub');
    }

    setUserSettings(settings);
    buildCalendar(); 
}

function savePersonalInfo() {
    queueBackgroundSave('personal-info', commitPersonalInfo);
}

function commitPersonalInfo() {
    const settings = getUserSettings();
    settings.bizName = document.getElementById('bizName').value;
    settings.bizRepresentative = document.getElementById('bizRepresentative')?.value || '';
    settings.bizNumber = document.getElementById('bizNumber').value;
    settings.bizAddress = document.getElementById('bizAddress')?.value || '';
    settings.bizType = document.getElementById('bizType')?.value || '';
    settings.bizItem = document.getElementById('bizItem')?.value || '';
    settings.bizEmail = document.getElementById('bizEmail')?.value || '';
    settings.userName = document.getElementById('userName').value;
    settings.userPhone = document.getElementById('userPhone').value;
    settings.bankName = document.getElementById('bankName').value;
    settings.accountNumber = document.getElementById('accountNumber').value;
    settings.accountHolder = document.getElementById('accountHolder')?.value || '';
    setUserSettings(settings);
}

function loadSettings() {
    updateTransportSettingsUI();

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) setTheme(savedTheme);

    const savedSettings = getUserSettings();
    if (Object.keys(savedSettings).length > 0) {
        if (savedSettings.inputMode === 'fare') {
            setInputMode('fare', 'main');
        } else {
            setInputMode('count', 'main');
        }
        
        document.getElementById('fixedToggle').checked = !!savedSettings.fixedOn;
        // 고정 거래처/단가/파렛트 입력칸은 거래처 등록 화면으로 옮겨서 여기선 더 이상 없다.
        if (document.getElementById('fixedRouteToggle')) document.getElementById('fixedRouteToggle').checked = !!savedSettings.fixedRouteOn;
        renderFixedRoutePresetList('main');
        toggleFixedRoutePresetSettings('main');
        if (document.getElementById('runCountToggle')) document.getElementById('runCountToggle').checked = !!savedSettings.runCountToggle;
        setRunCountPresetChipValues('main', savedSettings.runCountPresets);

        // 세부 입력은 항상 켜져 있는 상태를 기본으로 처리
        document.getElementById('callDetailToggle').checked = savedSettings.hasOwnProperty('callDetailOn') ? !!savedSettings.callDetailOn : true;
        document.getElementById('paymentToggle').checked = !!savedSettings.paymentOn;
        if(document.getElementById('timeToggle')) document.getElementById('timeToggle').checked = !!savedSettings.timeOn;
        if(document.getElementById('platformToggle')) document.getElementById('platformToggle').checked = !!savedSettings.platformOn;
        if(document.getElementById('distanceToggle')) document.getElementById('distanceToggle').checked = !!savedSettings.distanceOn;
        if(document.getElementById('cargoTonnageToggle')) {
            document.getElementById('cargoTonnageToggle').checked = savedSettings.hasOwnProperty('cargoTonnageOn') ? !!savedSettings.cargoTonnageOn : true;
        }

        if (document.getElementById('subFixedToggle')) {
            if (savedSettings.subInputMode === 'fare') {
                setInputMode('fare', 'sub');
            } else {
                setInputMode('count', 'sub');
            }
            
            document.getElementById('subFixedToggle').checked = !!savedSettings.subFixedOn;
            if (document.getElementById('subFixedRouteToggle')) document.getElementById('subFixedRouteToggle').checked = !!savedSettings.subFixedRouteOn;
            renderFixedRoutePresetList('sub');
            toggleFixedRoutePresetSettings('sub');

            document.getElementById('subCallDetailToggle').checked = savedSettings.hasOwnProperty('subCallDetailOn') ? !!savedSettings.subCallDetailOn : true;
            if(document.getElementById('subPaymentToggle')) document.getElementById('subPaymentToggle').checked = !!savedSettings.subPaymentOn;
            if(document.getElementById('subTimeToggle')) document.getElementById('subTimeToggle').checked = !!savedSettings.subTimeOn;
            if(document.getElementById('subPlatformToggle')) document.getElementById('subPlatformToggle').checked = !!savedSettings.subPlatformOn;
            if(document.getElementById('subDistanceToggle')) document.getElementById('subDistanceToggle').checked = !!savedSettings.subDistanceOn;
            if(document.getElementById('subCargoTonnageToggle')) document.getElementById('subCargoTonnageToggle').checked = savedSettings.hasOwnProperty('subCargoTonnageOn') ? !!savedSettings.subCargoTonnageOn : true;
            if(document.getElementById('subRunCountToggle')) document.getElementById('subRunCountToggle').checked = !!savedSettings.subRunCountToggle;
            setRunCountPresetChipValues('sub', savedSettings.subRunCountPresets);
            
            toggleSubFixedSettings();
            toggleSubRunCountPresetSettings();
            updateToggleDependencies('sub');
        }

        if(document.getElementById('bizName')) document.getElementById('bizName').value = savedSettings.bizName || '';
        if(document.getElementById('bizRepresentative')) document.getElementById('bizRepresentative').value = savedSettings.bizRepresentative || '';
        if(document.getElementById('bizNumber')) document.getElementById('bizNumber').value = savedSettings.bizNumber || '';
        if(document.getElementById('bizAddress')) document.getElementById('bizAddress').value = savedSettings.bizAddress || '';
        if(document.getElementById('bizType')) document.getElementById('bizType').value = savedSettings.bizType || '';
        if(document.getElementById('bizItem')) document.getElementById('bizItem').value = savedSettings.bizItem || '';
        if(document.getElementById('bizEmail')) document.getElementById('bizEmail').value = savedSettings.bizEmail || '';
        document.getElementById('userName').value = savedSettings.userName || '';
        document.getElementById('userPhone').value = savedSettings.userPhone || '';
        document.getElementById('bankName').value = savedSettings.bankName || '';
        document.getElementById('accountNumber').value = savedSettings.accountNumber || '';
        if(document.getElementById('accountHolder')) document.getElementById('accountHolder').value = savedSettings.accountHolder || '';

        toggleFixedSubSettings();
        toggleRunCountPresetSettings();
        updateToggleDependencies('main');
    }
    updateAccountRoleUI();
    applySettingsHydrationLock();
}

// 로그인 직후 하이드레이션(서버 → 로컬 동기화)이 아직 끝나지 않았을 때(supabaseHydrationCompleted
// === false) 앱 설정 화면에 들어와 값을 바꾸면, 그 직후 하이드레이션이 로컬 값을 서버 값으로
// 덮어써서 방금 바꾼 게 사라진 것처럼 보일 수 있다(실제 데이터 유실 자체는 하이드레이션이
// 끝나는 시점에 다시 서버로 밀어 올리도록 이미 막아뒀지만, 이 짧은 구간 동안은 화면이 혼란
// 스러울 수 있다). 그래서 이 구간에는 입력 자체를 잠그고 안내 문구를 보여준다. loadSettings()가
// 화면 진입 시/하이드레이션 완료 시 양쪽에서 다 호출되므로 여기 한 곳에서만 처리하면 된다.
function applySettingsHydrationLock() {
    const page = document.getElementById('settingsPage');
    const notice = document.getElementById('settingsHydrationLockNotice');
    if (!page) return;
    const locked = typeof supabaseHydrationCompleted !== 'undefined' && !supabaseHydrationCompleted;
    notice?.classList.toggle('hidden', !locked);

    page.querySelectorAll('input, select, textarea').forEach(el => { el.disabled = locked; });
    page.querySelectorAll('.settings-segmented-control .toggle-btn').forEach(el => { el.disabled = locked; });

    // updateToggleDependencies()처럼 이 화면 안에 이미 있는 업무 로직이 일부 필드를 의도적으로
    // disabled 처리해 두는 경우가 있다(예: 고정노선 OFF일 때 세부입력 토글은 항상 강제로
    // 켜지고 비활성화된다). 잠금을 풀 때 무조건 전부 enable하면 그 규칙이 깨지므로, 스냅샷을
    // 저장했다 복원하는 대신 그 로직을 다시 실행해 "지금 값 기준"으로 다시 계산한다 — 잠겨
    // 있던 사이에 하이드레이션으로 값 자체가 바뀌었을 수도 있어서, 예전 상태를 그대로 복원하는
    // 것보다 이 편이 더 정확하다.
    if (!locked && typeof updateToggleDependencies === 'function') {
        updateToggleDependencies('main');
        if (document.getElementById('subFixedToggle')) updateToggleDependencies('sub');
    }
}

// 스위치 간의 종속성을 관리하는 새로운 함수 (하단에 추가)
function updateToggleDependencies(type) {
    if (type === 'main') {
        const fixedToggle = document.getElementById('fixedToggle');
        const callDetailToggle = document.getElementById('callDetailToggle');
        const callDetailSubSettings = document.getElementById('callDetailSubSettings');
        const callDetailDependencyHint = document.getElementById('callDetailDependencyHint');

        const paymentToggle = document.getElementById('paymentToggle');
        const timeToggle = document.getElementById('timeToggle');
        const platformToggle = document.getElementById('platformToggle');
        const distanceToggle = document.getElementById('distanceToggle');

        if (!fixedToggle || !callDetailToggle) return;

        // 조건 2: 고정노선 OFF 시 세부입력 ON 강제 및 disabled 처리
        if (!fixedToggle.checked) {
            callDetailToggle.checked = true;
            callDetailToggle.disabled = true;
        } else {
            callDetailToggle.disabled = false;
        }
        if (callDetailDependencyHint) {
            callDetailDependencyHint.hidden = fixedToggle.checked;
        }

        // 조건 1: 운행 일지 세부 입력 토글 상태에 따른 하위 그룹 표시/숨김
        if (callDetailSubSettings) {
            if (!callDetailToggle.checked) {
                setSettingsGroupExpanded(callDetailSubSettings, false);
                if(paymentToggle) paymentToggle.checked = false;
                if(timeToggle) timeToggle.checked = false;
                if(platformToggle) platformToggle.checked = false;
                if(distanceToggle) distanceToggle.checked = false;
            } else {
                setSettingsGroupExpanded(callDetailSubSettings, true);
            }
        }
    } else {
        const subFixedToggle = document.getElementById('subFixedToggle');
        const subCallDetailToggle = document.getElementById('subCallDetailToggle');
        const subCallDetailSubSettings = document.getElementById('subCallDetailSubSettings');
        const subCallDetailDependencyHint = document.getElementById('subCallDetailDependencyHint');
        const subDetailToggles = [
            'subPaymentToggle',
            'subTimeToggle',
            'subPlatformToggle',
            'subDistanceToggle',
            'subCargoTonnageToggle'
        ].map(id => document.getElementById(id));

        if (!subFixedToggle || !subCallDetailToggle) return;

        if (!subFixedToggle.checked) {
            subCallDetailToggle.checked = true;
            subCallDetailToggle.disabled = true;
        } else {
            subCallDetailToggle.disabled = false;
        }
        if (subCallDetailDependencyHint) {
            subCallDetailDependencyHint.hidden = subFixedToggle.checked;
        }

        if (subCallDetailSubSettings) {
            if (!subCallDetailToggle.checked) {
                setSettingsGroupExpanded(subCallDetailSubSettings, false);
                subDetailToggles.forEach(toggle => {
                    if (toggle) toggle.checked = false;
                });
            } else {
                setSettingsGroupExpanded(subCallDetailSubSettings, true);
            }
        }
    }
}

const APP_BACKUP_TYPE = 'plaintext-transport-log';
const APP_BACKUP_VERSION = 3;
const APP_BACKUP_JSON_KEYS = new Set([
    'userSettings',
    'workData',
    'taxInvoiceRecords',
    'messageTemplateCustomBodies',
    'supportInquiries',
    'normalizedSchemaMeta',
    'entityUsers',
    'entityVehicles',
    'entityDailyLogs',
    'entityTransportDetails',
    'entityMaintenanceRecords',
    'entityFuelRecords',
    'entityClients',
    'entityTaxInvoices'
]);
const APP_BACKUP_TEXT_KEYS = new Set(['theme', 'reportShareMessagePattern', 'normalizedUserId']);

function isBackupRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isAppBackupStorageKey(key) {
    return APP_BACKUP_JSON_KEYS.has(key)
        || APP_BACKUP_TEXT_KEYS.has(key)
        || key.startsWith('workData_')
        || key.startsWith('linkedDriverWorkData_');
}

// 계정을 바꿔가며 로그인할 때(A 계정 로그아웃 → 같은 기기에서 B 계정으로 로그인) A 계정의
// 로컬 캐시(운행일지/차량/거래처 등)가 그대로 남아있으면, initSettingsFromSupabase/
// initWorkDataFromSupabase의 "서버에 없는 항목은 로컬을 보존" 병합 로직 때문에 A 계정 데이터가
// B 계정 데이터에 섞여 들어간다(실제로 보고됨: "1번 계정 정보가 2번 계정으로 덧씌워짐").
// 로그아웃이 로컬 기록을 일부러 안 지우는 것(오프라인 상태에서도 같은 계정으로 다시 들어올 수
// 있게 하려는 의도, 로그아웃 확인창에도 "기기에 저장된 기록은 유지됩니다"라고 명시) 자체는
// 맞는 설계라, 로그아웃 시점이 아니라 "하이드레이션 시점에 로그인한 계정이 마지막으로 이
// 기기를 쓴 계정과 다를 때만" 지운다 — 그래야 같은 계정 재로그인은 그대로 보존되고, 다른
// 계정으로 전환할 때만 안전하게 초기화된다. theme(기기 화면 설정)은 계정과 무관하므로 지우지
// 않는다.
function clearAccountScopedLocalCache() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key !== 'theme' && isAppBackupStorageKey(key)) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('supabaseMigrationDone');

    // localStorage뿐 아니라, 로그인 상태에서만 쓰는 "메모리 안" 캐시도 있다. 로그아웃/재로그인은
    // 페이지를 새로고침하지 않으므로(SPA), 이런 모듈 전역 변수는 계정을 바꿔도 저절로 안
    // 비워진다. __supabaseWorkDataSyncedSnapshot(운행기록 동기화 diff 기준점)이 이전 계정
    // 값을 그대로 들고 있으면, 새 계정에서 우연히 같은 날짜 키를 쓸 때 "이미 서버와 동일함"으로
    // 잘못 판단해 실제로 새 계정 몫으로 올려야 할 기록이 누락될 수 있다.
    if (typeof __supabaseWorkDataSyncedSnapshot === 'object' && __supabaseWorkDataSyncedSnapshot) {
        Object.keys(__supabaseWorkDataSyncedSnapshot).forEach(key => delete __supabaseWorkDataSyncedSnapshot[key]);
    }
}

// hydrateFromSupabaseAndMigrate()가 로그인 직후 호출한다. "이 기기가 마지막으로 하이드레이션한
// 계정"과 지금 로그인한 계정이 다르면 위 초기화를 실행하고, 같으면 아무 것도 하지 않는다.
//
// allowMigrationContext가 false(일반 로그인/세션 복원)일 때는 lastUserId가 아예 없는
// 경우(=이 기기가 비회원/게스트 상태로만 쓰였고 한 번도 하이드레이션된 적이 없음)에도 지운다.
// 예전엔 "lastUserId && lastUserId !== currentUserId"만 봐서, lastUserId가 없으면(게스트
// 전용 기기) 아무것도 안 지우고 넘어갔다 — 그 결과 게스트 상태로 이 기기에 입력해 둔 데이터가
// 남아있다가, 뒤이은 로그인 시점에 migrateLocalDataToSupabase()로 그대로 실제 계정에
// 덧씌워지는 사고가 있었다(실제로 재현해서 확인: 비회원으로 정보 입력 → 백업 저장 → 다른
// 계정으로 로그인 → 그 계정에 게스트 데이터가 섞여 들어감). allowMigrationContext가 true인
// 회원가입/백업복원 상황에서는 반대로 이 정리를 건너뛰어야 게스트 데이터가 마이그레이션
// 대상으로 살아남는다 — 그래서 lastUserId가 없는 경우엔 지우지 않는(기존과 동일한) 분기를 탄다.
function clearAccountScopedLocalCacheIfAccountChanged(currentUserId, allowMigrationContext = false) {
    if (!currentUserId) return;
    const lastUserId = localStorage.getItem('lastHydratedSupabaseUserId');
    const accountDiffers = lastUserId && lastUserId !== currentUserId;
    const guestDeviceLoggingIn = !allowMigrationContext && !lastUserId;
    if (accountDiffers || guestDeviceLoggingIn) {
        clearAccountScopedLocalCache();
    }
    localStorage.setItem('lastHydratedSupabaseUserId', currentUserId);
}

function readBackupJsonStorage(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
        console.warn(`${key} 백업 데이터 읽기 실패:`, error);
        return fallback;
    }
}

const BACKUP_REMINDER_DAYS = 14;
// Supabase 로그인 상태(=클라우드에 이미 실시간으로 백업되고 있는 상태)에서는 로컬 백업을
// 훨씬 덜 급하게 재촉해도 된다. 배너 자체가 뜨는 기준일 뿐, 로그인 상태에서는 "overdue"
// 빨간 강조는 아예 쓰지 않는다(아래 renderBackupStatus/checkBackupReminder 참고).
const BACKUP_REMINDER_DAYS_CLOUD_SYNCED = 30;

function getLastBackupDate() {
    const iso = localStorage.getItem('lastBackupAt');
    if (!iso) return null;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
}

// 마지막 백업 이후 지난 일수. 백업한 적이 없으면 null.
function getDaysSinceLastBackup() {
    const lastBackup = getLastBackupDate();
    if (!lastBackup) return null;
    return Math.floor((Date.now() - lastBackup.getTime()) / 86400000);
}

function formatBackupDateText(date) {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getTodayDateKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 지금 이 브라우저에서 Supabase에 로그인된 세션이 있는지(=클라우드에 이미 실시간으로
// 백업되고 있는지) 확인한다. supabase-sync.js가 아직 로드되지 않았거나 요청이 실패해도
// 배너/상태 표시 로직 자체가 멈추지 않도록 항상 안전하게 false를 반환한다.
async function isCloudBackupActive() {
    try {
        return typeof getSupabaseUser === 'function' ? !!(await getSupabaseUser()) : false;
    } catch (error) {
        console.error('클라우드 백업 상태 확인 실패:', error);
        return false;
    }
}

// 마이페이지 백업 카드의 "마지막 백업: ..." 상태 텍스트를 갱신한다.
// - Supabase 로그인 상태면 클라우드 자동 백업 중이라는 보조 문구를 덧붙이고, 로컬 백업이
//   좀 늦었다고 해서 위급하게(--sunday-color) 강조하지 않는다.
// - 비로그인 상태면 기존과 동일하게 14일 기준으로 강조한다.
async function renderBackupStatus() {
    const el = document.getElementById('lastBackupStatus');
    if (!el) return;
    const cloudSynced = await isCloudBackupActive();
    const lastBackup = getLastBackupDate();
    const days = getDaysSinceLastBackup();
    const baseText = lastBackup ? `마지막 백업: ${formatBackupDateText(lastBackup)}` : '아직 백업한 적 없음';
    el.textContent = cloudSynced ? `${baseText} · 클라우드 자동 백업 중` : baseText;
    el.classList.toggle('overdue', !cloudSynced && (!lastBackup || days >= BACKUP_REMINDER_DAYS));
}

// 백업 필요 여부를 판단해 알림 패널용 알림 아이템 객체를 반환한다(필요 없으면 null).
// 예전에는 이 판단 결과로 달력 상단 배너를 직접 켜고 껐지만, 이제는 알림 패널의 알림
// 목록/뱃지 카운트에 통합됐다 — updateOverdueNotification()/renderNotificationPanel()이 이
// 함수를 함께 쓴다.
// - 비로그인 상태: 기존과 동일하게 백업한 적이 없거나 BACKUP_REMINDER_DAYS일이 넘게 지났으면 필요.
// - Supabase 로그인 상태(클라우드에 이미 자동 백업 중): 훨씬 느슨한 기준(BACKUP_REMINDER_
//   DAYS_CLOUD_SYNCED)으로만 필요 판정하고, 문구도 안심시키는 톤으로 다르게 쓴다.
// - "오늘 하루 닫기" 대신, 알림 카드를 스와이프로 지우면(dismissNotification) 그 백업
//   시점 기준 키가 dismissedReceivableNotifications에 남아 같은 상태에서는 다시 뜨지 않는다
//   (마지막 백업일이 바뀌면(=새로 백업하면) 키 자체가 달라져 자연스럽게 다시 평가된다).
async function getBackupNotificationItem() {
    const cloudSynced = await isCloudBackupActive();
    const reminderDays = cloudSynced ? BACKUP_REMINDER_DAYS_CLOUD_SYNCED : BACKUP_REMINDER_DAYS;
    const lastBackup = getLastBackupDate();
    const days = getDaysSinceLastBackup();
    const needsBackup = !lastBackup || days >= reminderDays;

    if (!needsBackup) return null;

    const key = `backup_reminder_${lastBackup ? lastBackup.getTime() : 'never'}`;
    const dismissed = getDismissedNotificationKeys();
    if (dismissed.has(key)) return null;

    let message = '';
    if (cloudSynced) {
        message = lastBackup
            ? `로컬 백업으로부터 ${days}일이 지났습니다. 클라우드 자동 저장과 함께 로컬 백업도 보관해 두세요.`
            : '클라우드 자동 저장 중입니다. 만약을 위해 로컬 백업 파일도 함께 보관해 두세요.';
    } else {
        message = lastBackup
            ? `마지막 백업으로부터 ${days}일이 지났습니다. 최신 데이터로 백업해 주세요.`
            : '아직 백업한 적이 없습니다. 브라우저 데이터 삭제 시 기록이 사라질 수 있습니다.';
    }

    return {
        type: 'backup',
        key: key,
        title: '데이터 백업 권장',
        message: message,
        metaText: lastBackup ? `마지막 백업: ${formatBackupDateText(lastBackup)}` : '백업 이력 없음',
        actionLabel: '지금 백업'
    };
}

// 소속 기사인데 아직 차주와 연동되지 않은 경우, 알림 패널에 항상 뜨는 안내 카드다.
// 예전에는 로그인 직후 1회성 토스트로만 안내했는데, 로그인하자마자 1.5초 뒤 잠깐 스쳐가는
// 토스트라 놓치기 쉬웠다 — 연동 전까지는 알림 패널(및 뱃지 카운트)에 계속 남아있게 해서
// 언제든 눌러서 바로 연동 화면으로 갈 수 있게 한다. 백업 알림과 같은 방식으로 스와이프
// 지우기(dismissedReceivableNotifications)도 지원하되, employerLink.status가 실제로
// 'linked'가 되기 전까지는 키가 그대로라 지워도 다음 로그인/새로고침 때 다시 뜬다 — 완전히
// 무시하게 두면 정말 중요한 안내를 놓칠 수 있어서 의도적으로 그렇게 뒀다.
function getEmployerLinkNotificationItem() {
    const settings = getUserSettings();
    if (settings.accountType !== 'employed_driver' || settings.employerLink?.status === 'linked') return null;

    const key = 'employer_link_reminder';
    const dismissed = getDismissedNotificationKeys();
    if (dismissed.has(key)) return null;

    return {
        type: 'employerLink',
        key: key,
        title: '사장님과 연결이 필요해요',
        message: '아직 소속 사장님과 연결되지 않았어요. 초대 코드를 입력하면 차량 정보와 운행 기록이 자동으로 연결돼요.',
        actionLabel: '지금 연결하기'
    };
}

// 저녁까지 오늘자 운행일지를 하나도 안 적었으면 알림 패널에 안내한다. 종이 수첩은 항상
// 옆에 있어서 깜빡할 일이 없는데, 앱은 열어보지 않으면 그냥 잊어버리기 쉽다는 실제 피드백을
// 반영한 것이다. 저녁 시간대(18시 이후)에만 뜨고, 오늘 하루 안에 실제로 뭔가 적으면(콜상세
// 등록, 고정노선 횟수, 휴무 표시 중 하나라도) 바로 사라진다 — 스와이프로 지워도 그건 "오늘"
// 키에만 적용되니 내일은 다시 정상적으로 뜬다.
const TODAY_LOG_REMINDER_HOUR = 18;

function getTodayLogReminderNotificationItem() {
    const now = new Date();
    if (now.getHours() < TODAY_LOG_REMINDER_HOUR) return null;

    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayRecord = readWorkDataStorage('workData')[todayKey];
    const hasEntry = !!todayRecord && (
        !!todayRecord.isOff
        || (Array.isArray(todayRecord.callDetails) && todayRecord.callDetails.length > 0)
        || (parseInt(todayRecord.fixedCount, 10) || 0) > 0
    );
    if (hasEntry) return null;

    const key = `today_log_reminder_${todayKey}`;
    if (getDismissedNotificationKeys().has(key)) return null;

    return {
        type: 'todayLogReminder',
        key,
        title: '오늘 운행 아직 안 적으셨어요',
        message: '잊기 전에 오늘 하루 운행 기록을 남겨 주세요.',
        actionLabel: '오늘 일지 쓰기'
    };
}

// 예전에는 이 함수가 달력 상단 배너를 직접 켜고 껐지만, 이제 백업 알림은 알림 패널로
// 통합됐다 — updateOverdueNotification()을 호출해 뱃지/목록 상태만 다시 계산하면 된다.
function checkBackupReminder() {
    updateOverdueNotification();
}

async function exportData() {
    await flushAllBackgroundSaves();
    const storageData = {};
    const storageKeys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
        .filter(key => key && isAppBackupStorageKey(key));
    storageKeys.forEach(key => {
        storageData[key] = localStorage.getItem(key);
    });

    const subWorkData = {};
    Object.keys(storageData).filter(key => key.startsWith('workData_')).forEach(key => {
        const carNumber = key.slice('workData_'.length);
        try {
            subWorkData[carNumber] = JSON.parse(storageData[key]) || {};
        } catch (error) {
            subWorkData[carNumber] = {};
        }
    });

    const backupData = {
        backupType: APP_BACKUP_TYPE,
        backupVersion: APP_BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        userSettings: getUserSettings(),
        workData: readBackupJsonStorage('workData', {}),
        subWorkData,
        taxInvoiceRecords: readBackupJsonStorage('taxInvoiceRecords', []),
        normalizedEntities: getNormalizedEntitySnapshot(),
        theme: localStorage.getItem('theme') || 'light',
        storageData
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json;charset=utf-8' });
    const fileUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    const todayStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.href = fileUrl;
    downloadAnchor.download = `운송내역_백업_${todayStr}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
    showToastMessage('백업 파일을 저장했습니다.');

    // 백업 유도 배너/마이페이지 상태 텍스트가 방금 백업한 결과를 바로 반영하도록 갱신한다.
    localStorage.setItem('lastBackupAt', new Date().toISOString());
    renderBackupStatus();
    checkBackupReminder();
}

function parseBackupStorageJson(key, value) {
    try {
        return JSON.parse(value);
    } catch (error) {
        throw new Error(`${key} 데이터가 손상되어 있습니다.`);
    }
}

// 백업 파일의 userSettings 중, "이 기기에 지금 로그인돼 있는 계정이 누구인가"를 나타내는
// 필드는 백업 내용으로 절대 덮어쓰지 않는다 — 백업은 운행기록/거래처/차량단가 같은 업무
// 데이터를 복원하기 위한 것이지, 계정 자체를 바꾸는 수단이 아니다. 실제로 다른 계정(예:
// 차주 A)이 내보낸 백업을 지금 로그인된 다른 계정(예: 소속기사 B)에서 불러오면 B의 이름/
// 전화번호/사업자정보/계좌정보/연동상태까지 A의 것으로 조용히 바뀌는 사고가 있었다.
//
// 여기 나열한 필드는 크게 두 종류로 나뉜다:
// - isLoggedIn/employerLink: 이 기기의 "지금 실제 인증/연결 상태"를 나타내는 값이라, 백업
//   파일의 값으로 절대 대체하지 않는다(백업이 만들어질 당시 다른 계정의 로그인/연동 상태를
//   그대로 가져오면 실제 세션과 어긋나는 상태가 된다 — 특히 employerLink는 다른 차주의
//   vehicleId를 가리켜서, 이후 운행기록이 엉뚱한 차량으로 서버에 올라갈 위험까지 있다).
// - 나머지(이름/연락처/계정유형/사업자정보/계좌정보): 이 기기에 이미 값이 있으면 그 값을
//   우선하고, 이 기기가 아직 아무것도 설정되지 않은 새 상태라면(전부 빈 값) 백업의 값을
//   그대로 채워 넣는다 — 내 백업을 새 기기에 처음 복원하는 정상적인 경우까지 막지 않기
//   위함이다.
const IMPORT_PROTECTED_IDENTITY_FIELDS = [
    'userName', 'userPhone', 'accountType', 'driverType',
    'bizName', 'bizNumber', 'bizAddress', 'bizType', 'bizItem', 'bizEmail',
    'bankName', 'accountNumber', 'accountHolder'
];

function applyCurrentIdentityToImportedSettings(importedSettings) {
    const current = getUserSettings();
    const preserved = { ...importedSettings };
    // isLoggedIn은 반드시 불리언으로 유지한다(백업의 값을 그대로 흡수하면 실제 Supabase
    // 세션과 무관하게 "로그인됨"으로 착각하는 상태가 될 수 있다).
    preserved.isLoggedIn = !!current.isLoggedIn;
    preserved.employerLink = current.employerLink ?? null;
    IMPORT_PROTECTED_IDENTITY_FIELDS.forEach(field => {
        preserved[field] = current[field] || importedSettings[field];
    });
    return preserved;
}

function normalizeImportedBackup(imported) {
    if (!isBackupRecord(imported)) {
        throw new Error('백업 파일의 기본 구조를 확인할 수 없습니다.');
    }
    if (imported.backupType && imported.backupType !== APP_BACKUP_TYPE) {
        throw new Error('이 앱에서 만든 백업 파일이 아닙니다.');
    }

    const storageData = isBackupRecord(imported.storageData) ? imported.storageData : {};
    const storedUserSettings = typeof storageData.userSettings === 'string'
        ? parseBackupStorageJson('사용자 설정', storageData.userSettings)
        : null;
    const storedWorkData = typeof storageData.workData === 'string'
        ? parseBackupStorageJson('메인 운행일지', storageData.workData)
        : null;
    const importedSettings = imported.userSettings ?? storedUserSettings;
    const mainWorkData = imported.workData ?? storedWorkData;
    const subWorkData = imported.subWorkData ?? {};

    if (!isBackupRecord(importedSettings)) {
        throw new Error('사용자 설정 정보가 없는 백업 파일입니다.');
    }
    if (!isBackupRecord(mainWorkData)) {
        throw new Error('메인 운행일지 정보가 없는 백업 파일입니다.');
    }
    if (!isBackupRecord(subWorkData)) {
        throw new Error('기사차량 운행일지 형식이 올바르지 않습니다.');
    }

    const userSettings = applyCurrentIdentityToImportedSettings(importedSettings);

    const storageWrites = {};
    Object.entries(storageData).forEach(([key, value]) => {
        if (!isAppBackupStorageKey(key) || typeof value !== 'string') return;
        if (APP_BACKUP_JSON_KEYS.has(key) || key.startsWith('workData_') || key.startsWith('linkedDriverWorkData_')) {
            parseBackupStorageJson(key, value);
        }
        // normalizedUserId는 이 기기 고유의 로컬 식별자다(getNormalizedUserId 참고) — 이미
        // 값이 있다면 다른 사용자의 백업에 들어있던 값으로 바꿔치기하지 않는다.
        if (key === 'normalizedUserId' && localStorage.getItem('normalizedUserId')) return;
        storageWrites[key] = value;
    });

    storageWrites.userSettings = JSON.stringify(userSettings);
    storageWrites.workData = JSON.stringify(mainWorkData);
    Object.entries(subWorkData).forEach(([carNumber, carWorkData]) => {
        if (!carNumber || !isBackupRecord(carWorkData)) {
            throw new Error('기사차량 운행일지 일부가 손상되어 있습니다.');
        }
        storageWrites[`workData_${carNumber}`] = JSON.stringify(carWorkData);
    });

    if (imported.taxInvoiceRecords !== undefined) {
        if (!Array.isArray(imported.taxInvoiceRecords)) throw new Error('세금계산서 기록 형식이 올바르지 않습니다.');
        storageWrites.taxInvoiceRecords = JSON.stringify(imported.taxInvoiceRecords);
    }
    if (imported.theme === 'light' || imported.theme === 'dark') storageWrites.theme = imported.theme;

    return { userSettings, mainWorkData, subWorkData, storageWrites };
}

function restoreBackupStorage(storageWrites) {
    const previousValues = new Map();
    Object.keys(storageWrites).forEach(key => previousValues.set(key, localStorage.getItem(key)));
    try {
        Object.entries(storageWrites).forEach(([key, value]) => localStorage.setItem(key, value));
    } catch (error) {
        previousValues.forEach((value, key) => {
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key, value);
        });
        throw new Error('기기 저장 공간이 부족하거나 데이터 저장이 차단되어 복원하지 못했습니다.');
    }
}

function importData(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
        showConfirmModal('앱에서 저장한 JSON 백업 파일을 선택해 주세요. ZIP 파일은 불러올 수 없습니다.', null);
        input.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(String(e.target.result || '').replace(/^\uFEFF/, ''));
            const normalized = normalizeImportedBackup(imported);
            restoreBackupStorage(normalized.storageWrites);

            if (activeLogId === 'main') {
                workData = normalized.mainWorkData;
            } else {
                workData = normalized.subWorkData?.[activeLogId]
                    || readBackupJsonStorage(`workData_${activeLogId}`, {});
            }
            normalizeLegacyData();
            syncNormalizedEntityStore();

            const restoredTheme = localStorage.getItem('theme') || 'light';
            setTheme(restoredTheme);
            loadSettings();
            updateAccountRoleUI();
            buildCalendar();
            renderSubCarMenu();
            renderLinkedDriverList();
            showToastMessage('백업 데이터를 복원했습니다.');

            // restoreBackupStorage()는 localStorage에 직접 쓰기 때문에 이 시점까지는
            // Supabase에 전혀 반영되지 않은 상태다. 로그인 상태라면 지금 반영해두지 않으면
            // 다음 새로고침/재로그인 때 서버의 예전 데이터가 방금 불러온 백업을 덮어써서
            // 조용히 사라진다 — 그래서 반드시 이어서 클라우드에도 실제로 반영한다.
            if (typeof syncImportedBackupToSupabase === 'function') {
                (async () => {
                    try {
                        const user = typeof getSupabaseUser === 'function' ? await getSupabaseUser() : null;
                        if (!user) return;
                        await syncImportedBackupToSupabase();
                        renderLinkedDriverList();
                        showToastMessage('클라우드에도 백업 데이터를 반영했습니다.');
                    } catch (error) {
                        console.error('백업 데이터 클라우드 반영 실패(로컬에는 정상 복원됨):', error);
                        showToastMessage('클라우드 반영 중 오류가 발생했습니다. 로컬에는 정상 복원되어 있습니다.', { duration: 5000 });
                    }
                })();
            }
        } catch (error) {
            console.error('백업 불러오기 실패:', error);
            const message = error instanceof SyntaxError
                ? '파일 내용이 손상되었거나 JSON 백업 파일이 아닙니다.'
                : (error.message || '백업 파일을 복원하지 못했습니다.');
            showConfirmModal(message, null);
        } finally {
            input.value = '';
        }
    };
    reader.onerror = function() {
        showConfirmModal('선택한 백업 파일을 읽지 못했습니다. 파일 권한을 확인해 주세요.', null);
        input.value = '';
    };
    reader.readAsText(file, 'utf-8');
}

function changeMonth(delta) {
    viewDate.setDate(1);
    viewDate.setMonth(viewDate.getMonth() + delta);
    buildCalendar();
}

function buildCalendar() {
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    const today = new Date();

    const yearSelect = document.getElementById('yearSelect');
    const monthSelect = document.getElementById('monthSelect');
    if (yearSelect && monthSelect) {
        yearSelect.value = currentYear;
        monthSelect.value = currentMonth;
        yearSelect.parentElement?._dropdownSync?.();
        monthSelect.parentElement?._dropdownSync?.();
    }

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const totalWeeks = Math.ceil((firstDay + lastDate) / 7);
    const totalVisibleCells = totalWeeks * 7;

    let monthTotalWork = 0;
    let monthTotalFare = 0;
    let monthTotalPalletFare = 0;
    let monthTotalMaintFare = 0;
    let monthTotalFuelFare = 0;
    let monthTotalMiscFare = 0;
    let monthTotalCommission = 0;
    let monthTotalDistance = 0; 
    let monthTotalUnpaid = 0; // 미수금 총액 합산 변수 추가

    let fixedBaseFare = 0;
    let defaultBaseFare = 0; 
    let monthFareByClient = {}; 
    let monthCommByClient = {};
    let clientCommLabels = {};

    const savedSettings = getUserSettings();
    const isMain = activeLogId === 'main';
    const activeFixedOn = isMain ? savedSettings.fixedOn : savedSettings.subFixedOn;
    // 고정 거래처/단가/파렛트는 이제 앱설정이 아니라 거래처 등록 화면에서 지정한다(계정
    // 전체에서 "고정노선과 연동" 표시된 거래처 1곳) — 메인/기사차량 구분이 없어졌다.
    const fixedRouteClient = getFixedRouteClient(savedSettings);
    const activePalletOn = !!fixedRouteClient?.palletOn;

    const displayMode = isMain ? (savedSettings.inputMode || 'count') : (savedSettings.subInputMode || 'count');

    const fixedUnitPrice = parseCurrencyValue(fixedRouteClient?.fixedUnitPrice);
    const palletUnitPrice = parseCurrencyValue(fixedRouteClient?.palletPrice);

    for (let i = 0; i < calendarCells.length; i++) {
        const cell = calendarCells[i];
        
        if (i >= totalVisibleCells) {
            cell.style.display = 'none';
        } else {
            cell.style.display = 'flex';
        }

        const dateText = cell.querySelector('.cell-date-text');
        
        // 기존 뱃지 및 점 제거
        const oldBadges = cell.querySelectorAll('.work-badge, .off-badge, .maint-badge, .unpaid-dot');
        oldBadges.forEach(b => b.remove());

        cell.className = 'date-cell';
        cell.removeAttribute('data-date-key');
        cell.removeAttribute('data-month');
        cell.removeAttribute('data-day');
        dateText.textContent = '';

        const dayIndex = i - firstDay + 1;
        if (dayIndex >= 1 && dayIndex <= lastDate) {
            dateText.textContent = dayIndex;

            const dayOfWeek = new Date(currentYear, currentMonth, dayIndex).getDay();
            if (dayOfWeek === 0) cell.classList.add('sunday');
            if (dayOfWeek === 6) cell.classList.add('saturday');

            if (dayIndex === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
                cell.classList.add('today');
            }

            const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayIndex).padStart(2, '0')}`;
            cell.dataset.dateKey = dateKey;
            cell.dataset.month = currentMonth + 1;
            cell.dataset.day = dayIndex;

            const record = workData[dateKey];

            if (record) {
                if (record.isOff) {
                    const badge = document.createElement('span');
                    badge.classList.add('off-badge');
                    badge.textContent = `휴무`;
                    cell.appendChild(badge);
                }

                let dayWorkCount = 0;
                let dayFare = 0;
                let dayPalletFare = 0;
                let dayFixedFare = 0;
                let dayDefaultFare = 0; 
                let hasUnpaidToday = false; // 오늘 하루에 미수 건이 하나라도 있는지 확인

                if (record.fixedCount > 0) {
                    dayWorkCount += parseInt(record.fixedCount, 10);
                    let fAmount = record.fixedCount * fixedUnitPrice;
                    dayFare += fAmount;
                    // 고정 거래처가 지정돼 있으면 "기본 운송료"가 아니라 그 거래처 매출로
                    // 집계한다(고정노선 거래처 연동) — dayFare(당일 총액)는 동일하게 유지되고,
                    // 어느 버킷(기본요금 vs 거래처별)으로 잡히는지만 달라진다.
                    const fixedClientName = fixedRouteClient?.companyName || '';
                    if (fixedClientName) {
                        monthFareByClient[fixedClientName] = (monthFareByClient[fixedClientName] || 0) + fAmount;
                        // 콜상세 거래처와 동일하게, 고정 거래처도 수수료가 켜져 있으면 그대로
                        // 적용한다 — 고정노선이라고 수수료 계산에서 예외를 둘 이유가 없다.
                        const fixedClientObj = fixedRouteClient;
                        if (fixedClientObj?.commEnabled) {
                            let fixedComm = 0;
                            if (fixedClientObj.commType === 'percent' || !fixedClientObj.commType) {
                                fixedComm = Math.floor(fAmount * (parseFloat(fixedClientObj.commValue) / 100));
                                clientCommLabels[fixedClientName] = `${fixedClientObj.commValue}%`;
                            } else {
                                fixedComm = parseCurrencyValue(fixedClientObj.commValue) * Math.max(1, record.fixedCount || 0);
                                clientCommLabels[fixedClientName] = `${parseCurrencyValue(fixedClientObj.commValue).toLocaleString()}원`;
                            }
                            monthCommByClient[fixedClientName] = (monthCommByClient[fixedClientName] || 0) + fixedComm;
                            monthTotalCommission += fixedComm;
                        }
                    } else {
                        dayFixedFare += fAmount;
                    }
                }

                if (record.palletCount > 0 && activeFixedOn && activePalletOn) {
                    dayPalletFare += record.palletCount * palletUnitPrice;
                }

                monthTotalDistance += getRecordTotalDistance(record);

                if (record.callDetails && record.callDetails.length > 0) {
                    record.callDetails.forEach(detail => {
                        let type = detail.distanceType || '';
                        if (type === '공차') {
                            // 0회 처리
                        } else if (type === '혼짐') {
                            if (detail.linkedLoadIndex === 'pending' || detail.linkedLoadIndex === '-1' || detail.linkedLoadIndex === undefined) {
                                dayWorkCount += 1;
                            }
                        } else {
                            dayWorkCount += 1;
                        }

                        let gross = parseCurrencyValue(detail.fare);
                        
                        // 미수금 로직 (결제 기능이 켜져있고, payments 기준으로 완납이 아닐 때 잔액을 합산)
                        if (savedSettings.paymentOn) {
                            const paymentSummary = getDetailPaymentSummary(detail);
                            if (paymentSummary.status !== 'paid') {
                                hasUnpaidToday = true;
                                monthTotalUnpaid += paymentSummary.remainingAmount;
                            }
                        }

                        let comm = 0;
                        let clientName = detail.client ? detail.client.trim() : '';
                        let isRegisteredClient = false;

                        if (clientName) {
                            const clientObj = savedSettings.clients?.find(c => c.companyName === clientName);
                            if (clientObj) {
                                isRegisteredClient = true;
                            }

                            // 수수료 계산은 저장 시점의 스냅샷을 우선 사용한다(거래처명/수수료율이
                            // 나중에 바뀌어도 이미 저장된 기록의 표시값이 소급 변경되지 않도록).
                            // 스냅샷이 없는(마이그레이션 이전) 과거 기록만 현재 거래처 설정을
                            // 참조하는 기존 방식으로 폴백한다.
                            const commSnapshot = detail.commissionSnapshot;
                            const commEnabled = commSnapshot ? commSnapshot.enabled : !!clientObj?.commEnabled;
                            const commType = commSnapshot ? commSnapshot.type : clientObj?.commType;
                            const commValue = commSnapshot ? commSnapshot.value : clientObj?.commValue;

                            if (commEnabled) {
                                if (commType === 'percent' || !commType) {
                                    comm = Math.floor(gross * (parseFloat(commValue) / 100));
                                    clientCommLabels[clientName] = `${commValue}%`;
                                } else {
                                    comm = parseCurrencyValue(commValue);
                                    clientCommLabels[clientName] = `${comm.toLocaleString()}원`;
                                }
                                monthCommByClient[clientName] = (monthCommByClient[clientName] || 0) + comm;
                            }
                        }

                        if (isRegisteredClient) {
                            monthFareByClient[clientName] = (monthFareByClient[clientName] || 0) + gross;
                        } else {
                            dayDefaultFare += gross;
                        }

                        dayFare += gross;
                        monthTotalCommission += comm;
                    });
                }
                
                fixedBaseFare += dayFixedFare;
                defaultBaseFare += dayDefaultFare;

                // 설정의 횟수/금액 표시 방식에 맞춰 홈 달력에는 한 가지만 표시
                if (dayWorkCount > 0 || dayFare > 0 || dayPalletFare > 0) {
                    monthTotalWork += dayWorkCount;
                    monthTotalFare += dayFare;
                    monthTotalPalletFare += dayPalletFare;

                    const badge = document.createElement('span');
                    badge.classList.add('work-badge');

                    if (displayMode === 'fare') {
                        badge.textContent = formatFareShort(dayFare + dayPalletFare);
                    } else {
                        badge.textContent = `${dayWorkCount}회`;
                    }

                    cell.appendChild(badge);
                }

                let dayMaintSum = 0;
                let dayFuelSum = 0;
                let dayMiscSum = 0;

                if (record.maintItems && record.maintItems.length > 0) {
                    dayMaintSum = record.maintItems.reduce((a, b) => a + parseCurrencyValue(b.fare), 0);
                }
                if (record.fuelItems && record.fuelItems.length > 0) {
                    dayFuelSum = record.fuelItems.reduce((a, b) => a + parseCurrencyValue(b.cost), 0);
                }
                if (record.miscItems && record.miscItems.length > 0) {
                    dayMiscSum = record.miscItems.reduce((a, b) => a + parseCurrencyValue(b.fare), 0);
                }

                if (dayMaintSum > 0 || dayFuelSum > 0 || dayMiscSum > 0) {
                    monthTotalMaintFare += dayMaintSum;
                    monthTotalFuelFare += dayFuelSum;
                    monthTotalMiscFare += dayMiscSum;
                    const expBadge = document.createElement('span');
                    expBadge.classList.add('maint-badge');
                    expBadge.textContent = formatFareShort(dayMaintSum + dayFuelSum + dayMiscSum);
                    cell.appendChild(expBadge);
                }

                // 당일에 미수 건이 있을 경우 빨간 점 추가
                if (hasUnpaidToday) {
                    const dot = document.createElement('div');
                    dot.className = 'unpaid-dot';
                    cell.appendChild(dot);
                }
            }
        } else {
            cell.classList.add('empty');
        }
    }

    // 하단 미수금 미니 카드 노출 처리
    const unpaidSummaryCard = document.getElementById('unpaidSummaryCard');
    if (unpaidSummaryCard && savedSettings.paymentOn) {
        if (monthTotalUnpaid > 0) {
            unpaidSummaryCard.style.display = 'flex';
            unpaidSummaryCard.innerHTML = `
                <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round;">
                    <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                이번 달 총 ${monthTotalUnpaid.toLocaleString()}원의 미수금이 있습니다.
            `;
        } else {
            unpaidSummaryCard.style.display = 'none';
        }
    } else if (unpaidSummaryCard) {
        unpaidSummaryCard.style.display = 'none';
    }

    let subCarComm = 0;
    let subCarCommLabel = '기사차량 수수료';
    if (activeLogId !== 'main') {
        const currentCar = savedSettings.cars?.find(c => c.number === activeLogId);
        if (currentCar?.commEnabled && currentCar.commission) {
            subCarComm = calculateDriverVehicleCommission(currentCar, monthTotalFare + monthTotalPalletFare - monthTotalCommission, monthTotalWork);
            subCarCommLabel = currentCar.commType === 'direct'
                ? `${getShortCarNum(currentCar.number)} 차량 건당 ${parseCurrencyValue(currentCar.commission).toLocaleString()}원`
                : `${getShortCarNum(currentCar.number)} 차량 ${parseFloat(currentCar.commission) || 0}%`;
        }
    }

    const isDistanceOn = activeLogId === 'main' ? !!savedSettings.distanceOn : !!savedSettings.subDistanceOn;
    updateSummary(monthTotalWork, monthTotalFare, monthTotalPalletFare, monthTotalMaintFare, monthTotalFuelFare, monthTotalCommission, subCarComm, subCarCommLabel, fixedBaseFare, defaultBaseFare, monthFareByClient, monthCommByClient, clientCommLabels, monthTotalDistance, isDistanceOn, monthTotalMiscFare);
}

function updateSummary(totalCount, fareTotal, palletTotal, maintTotal, fuelTotal = 0, commissionTotal = 0, subCarComm = 0, subCarCommLabel = '', fixedBaseFare = 0, defaultBaseFare = 0, monthFareByClient = {}, monthCommByClient = {}, clientCommLabels = {}, monthTotalDistance = 0, isDistanceOn = false, miscTotal = 0) {
    document.getElementById('summaryTotalWork').textContent = `총 ${totalCount}회 운행`;
    
    const distanceRow = document.getElementById('summaryDistanceRow');
    const distanceEl = document.getElementById('summaryTotalDistance');
    if (distanceRow && distanceEl) {
        if (isDistanceOn) {
            distanceRow.style.display = 'flex';
            distanceEl.textContent = `${monthTotalDistance} km`;
        } else {
            distanceRow.style.display = 'none';
        }
    }
    
    const baseFareContainer = document.getElementById('dynamicBaseFareContainer');
    if (baseFareContainer) {
        let html = '';
        if (fixedBaseFare > 0) {
            html += `
                <div class="summary-row">
                    <span>고정 기본 운송료</span>
                    <span class="summary-value">${fixedBaseFare.toLocaleString()} 원</span>
                </div>
            `;
        }
        if (defaultBaseFare > 0) {
            html += `
                <div class="summary-row">
                    <span>미지정 거래처 운송료</span>
                    <span class="summary-value">${defaultBaseFare.toLocaleString()} 원</span>
                </div>
            `;
        }
        for (let client in monthFareByClient) {
            html += `
                <div class="summary-row">
                    <span>${escapeDetailText(client)} 기본 운송료</span>
                    <span class="summary-value">${monthFareByClient[client].toLocaleString()} 원</span>
                </div>
            `;
            if (monthCommByClient[client] > 0) {
                html += `
                    <div class="summary-row summary-client-commission-row">
                        <span class="summary-client-commission-label">${escapeDetailText(client)} 수수료 (${clientCommLabels[client]})</span>
                        <span class="summary-value">- ${monthCommByClient[client].toLocaleString()} 원</span>
                    </div>
                `;
            }
        }
        baseFareContainer.innerHTML = html;
    }

    const subCommRow = document.getElementById('summarySubCarCommissionRow');
    if (subCarComm > 0) {
        subCommRow.style.display = 'flex';
        document.getElementById('summarySubCarCommissionLabel').textContent = subCarCommLabel;
        document.getElementById('summarySubCarCommissionFare').textContent = `- ${subCarComm.toLocaleString()} 원`;
    } else {
        subCommRow.style.display = 'none';
    }

    const savedSettings = getUserSettings();
    const palletRow = document.getElementById('summaryPalletRow');

    const isMain = activeLogId === 'main';
    const activeFixedOn = isMain ? savedSettings.fixedOn : savedSettings.subFixedOn;
    const activePalletOn = !!getFixedRouteClient(savedSettings)?.palletOn;

    if (activeFixedOn && activePalletOn && palletTotal > 0) {
        palletRow.style.display = 'flex';
        document.getElementById('summaryPalletFare').textContent = `${palletTotal.toLocaleString()} 원`;
    } else {
        palletRow.style.display = 'none';
    }

    const vat = Math.round((fareTotal + palletTotal) * 0.1);
    const grandTotal = fareTotal + palletTotal - commissionTotal - subCarComm + vat;

    document.getElementById('summaryVat').textContent = `${vat.toLocaleString()} 원`;
    document.getElementById('summaryTotal').textContent = `${grandTotal.toLocaleString()} 원`;

    const maintRow = document.getElementById('summaryMaintRow');
    if (maintTotal > 0) {
        maintRow.style.display = 'flex';
        document.getElementById('summaryMaintFare').textContent = `${maintTotal.toLocaleString()} 원`;
    } else {
        maintRow.style.display = 'none';
    }

    const fuelRow = document.getElementById('summaryFuelRow');
    if (fuelTotal > 0 && fuelRow) {
        fuelRow.style.display = 'flex';
        document.getElementById('summaryFuelFare').textContent = `${fuelTotal.toLocaleString()} 원`;
    } else if (fuelRow) {
        fuelRow.style.display = 'none';
    }

    const miscRow = document.getElementById('summaryMiscRow');
    if (miscTotal > 0 && miscRow) {
        miscRow.style.display = 'flex';
        document.getElementById('summaryMiscFare').textContent = `${miscTotal.toLocaleString()} 원`;
    } else if (miscRow) {
        miscRow.style.display = 'none';
    }

    updateOverdueNotification();
}

function setFixedCount(count) {
    const input = document.getElementById('modalFixedCountInput');
    if (!input) return;
    const currentCount = parseInt(input.value, 10) || 0;
    input.value = currentCount === count ? '' : count;
    syncFixedCountQuickButtons();
    autoSaveWorkRecord();
}

function syncFixedCountQuickButtons() {
    const input = document.getElementById('modalFixedCountInput');
    const selectedCount = input ? parseInt(input.value, 10) : 0;
    document.querySelectorAll('.fixed-count-quick-buttons button').forEach(button => {
        button.classList.toggle('active', selectedCount === parseInt(button.dataset.count, 10));
    });
}

// 예전엔 항상 정확히 5개로 고정(부족하면 1,2,3...으로 채움)이었는데, 이제 "+ 버튼 추가"로
// 늘릴 수 있으니 5개로 강제하지 않는다 — 입력된 개수를 그대로 쓰되 RUN_COUNT_PRESET_MAX를
// 넘지 않게만 자르고, 완전히 빈 값(최초 진입 등)일 때만 기존 기본값 1~5로 채운다.
const RUN_COUNT_PRESET_MAX = 10;

function normalizeRunCountPresets(value) {
    const source = Array.isArray(value) ? value : String(value || '').split(/[\s,]+/);
    const values = [];
    source.forEach(item => {
        const count = parseInt(item, 10);
        if (count > 0 && !values.includes(count) && values.length < RUN_COUNT_PRESET_MAX) values.push(count);
    });
    if (!values.length) return [1, 2, 3, 4, 5];
    return values;
}

function getRunCountPresetChipValues(scope = 'main') {
    const containerId = scope === 'sub' ? 'subRunCountPresetChips' : 'runCountPresetChips';
    const inputs = document.querySelectorAll(`#${containerId} .run-count-preset-chip`);
    const used = [];
    return Array.from(inputs, (input, index) => {
        let count = parseInt(input.value, 10);
        if (!(count > 0) || used.includes(count)) {
            count = index + 1;
            while (used.includes(count)) count++;
        }
        used.push(count);
        return count;
    });
}

// 이제 입력칸 자체를 이 함수가 직접 그린다(예전엔 정적 5개 <input>에 값만 채웠음) — 개수가
// 가변적이라 매번 다시 그리는 게 "몇 개가 있어야 하는지"를 따로 추적하는 것보다 단순하다.
function setRunCountPresetChipValues(scope = 'main', value) {
    const containerId = scope === 'sub' ? 'subRunCountPresetChips' : 'runCountPresetChips';
    const container = document.getElementById(containerId);
    if (!container) return;
    const presets = normalizeRunCountPresets(value);

    container.innerHTML = '';
    presets.forEach((count, index) => {
        const wrap = document.createElement('span');
        wrap.className = 'run-count-preset-chip-wrap';

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'run-count-preset-chip';
        input.setAttribute('inputmode', 'numeric');
        input.min = '1';
        input.value = count;
        input.setAttribute('aria-label', `${index + 1}번째 횟수 버튼`);
        input.addEventListener('input', () => saveSettings());
        input.addEventListener('blur', () => {
            if (scope === 'sub') normalizeSubRunCountPresetInput(); else normalizeRunCountPresetInput();
            saveSettings();
        });
        wrap.appendChild(input);

        // 버튼이 딱 1개 남았을 땐 지울 수 없게 한다(횟수 버튼 자체가 없어지면 안 되므로).
        if (presets.length > 1) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'run-count-preset-chip-remove';
            removeBtn.textContent = '×';
            removeBtn.title = '이 버튼 삭제';
            removeBtn.setAttribute('aria-label', `${count}회 버튼 삭제`);
            removeBtn.addEventListener('click', () => removeRunCountPresetChip(scope, index));
            wrap.appendChild(removeBtn);
        }

        container.appendChild(wrap);
    });

    const addBtn = document.getElementById(scope === 'sub' ? 'subRunCountPresetAddBtn' : 'runCountPresetAddBtn');
    if (addBtn) addBtn.disabled = presets.length >= RUN_COUNT_PRESET_MAX;
}

// "+ 버튼 추가" — 마지막 값 다음(안 겹치면)이나 안 쓰인 가장 작은 양수를 새 버튼으로 붙인다.
function addRunCountPresetChip(scope = 'main') {
    const current = getRunCountPresetChipValues(scope);
    if (current.length >= RUN_COUNT_PRESET_MAX) {
        showToastMessage(`횟수 버튼은 최대 ${RUN_COUNT_PRESET_MAX}개까지 추가할 수 있습니다.`);
        return;
    }
    let next = (current[current.length - 1] || 0) + 1;
    while (current.includes(next)) next++;
    setRunCountPresetChipValues(scope, [...current, next]);
    saveSettings();
}

function removeRunCountPresetChip(scope, index) {
    const current = getRunCountPresetChipValues(scope);
    if (current.length <= 1) return;
    current.splice(index, 1);
    setRunCountPresetChipValues(scope, current);
    saveSettings();
}

function normalizeRunCountPresetInput() {
    setRunCountPresetChipValues('main', getRunCountPresetChipValues('main'));
}

function toggleRunCountPresetSettings() {
    const toggle = document.getElementById('runCountToggle');
    const setting = document.getElementById('runCountPresetSettings');
    setSettingsGroupExpanded(setting, !!toggle?.checked, 'flex');
}

function renderFixedCountQuickButtons(settings, isMain) {
    const container = document.getElementById('fixedCountQuickButtons');
    if (!container) return;
    const enabled = isMain ? !!settings.runCountToggle : !!settings.subRunCountToggle;
    container.style.display = enabled ? 'grid' : 'none';
    container.innerHTML = '';
    if (!enabled) return;

    const presets = isMain ? settings.runCountPresets : settings.subRunCountPresets;
    normalizeRunCountPresets(presets).forEach(count => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.count = count;
        button.textContent = `${count}회`;
        button.addEventListener('click', () => setFixedCount(count));
        container.appendChild(button);
    });
}

// ========== 고정노선 "상하차지 사용" — 자주 다니는 노선 등록 & 원탭 기록 ==========
// 고정노선(기존)은 그날 총 운행 "횟수"만 기록했다. 매일 같은 구간(부산→대구 등)만 도는
// 기사에게는 그 횟수가 "몇 번 눌렀는지"만 남고 "어느 노선이었는지"는 안 남아서, 상하차지가
// 필요한 세부 기록이나 통계에는 못 썼다. 이 기능은 그 갭을 메운다 — 앱 설정에서 자주 다니는
// 노선을 미리 등록해 두면, 일일운행에서 원탭으로 "이 노선 1회"를 기록할 수 있고, 노선별
// 횟수(fixedRouteCounts)와 전체 총 횟수(fixedCount, 기존 계산 로직 그대로 재사용)가 함께
// 올라간다. 총 횟수 입력칸 자체는 그대로 남겨둬서, 노선 없이 그냥 숫자만 쓰던 기존 방식도
// 계속 쓸 수 있다.

function toggleFixedRoutePresetSettings(scope) {
    const toggle = document.getElementById(scope === 'sub' ? 'subFixedRouteToggle' : 'fixedRouteToggle');
    const setting = document.getElementById(scope === 'sub' ? 'subFixedRoutePresetSettings' : 'fixedRoutePresetSettings');
    setSettingsGroupExpanded(setting, !!toggle?.checked, 'flex');
}

function getFixedRoutePresets(settings, scope) {
    const key = scope === 'sub' ? 'subFixedRoutePresets' : 'fixedRoutePresets';
    return Array.isArray(settings[key]) ? settings[key] : [];
}

// 앱 설정 화면의 "자주 다니는 노선 등록" 목록을 다시 그린다.
function renderFixedRoutePresetList(scope) {
    const container = document.getElementById(scope === 'sub' ? 'subFixedRoutePresetList' : 'fixedRoutePresetList');
    if (!container) return;
    const presets = getFixedRoutePresets(getUserSettings(), scope);

    if (!presets.length) {
        container.innerHTML = '<div class="fixed-route-preset-empty">등록된 노선이 없습니다.</div>';
        return;
    }
    container.innerHTML = '';
    presets.forEach(route => {
        const row = document.createElement('div');
        row.className = 'fixed-route-preset-row';
        const label = document.createElement('span');
        label.textContent = `${route.loadLoc} → ${route.unloadLoc}`;
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '×';
        removeBtn.title = '노선 삭제';
        removeBtn.setAttribute('aria-label', `${route.loadLoc} → ${route.unloadLoc} 삭제`);
        removeBtn.addEventListener('click', () => removeFixedRoutePreset(scope, route.id));
        row.append(label, removeBtn);
        container.appendChild(row);
    });
}

function addFixedRoutePreset(scope) {
    const loadInput = document.getElementById(scope === 'sub' ? 'subFixedRoutePresetLoadInput' : 'fixedRoutePresetLoadInput');
    const unloadInput = document.getElementById(scope === 'sub' ? 'subFixedRoutePresetUnloadInput' : 'fixedRoutePresetUnloadInput');
    const loadLoc = loadInput?.value.trim() || '';
    const unloadLoc = unloadInput?.value.trim() || '';
    if (!loadLoc || !unloadLoc) {
        showToastMessage('상차지와 하차지를 모두 입력해 주세요.');
        return;
    }

    const settings = getUserSettings();
    const key = scope === 'sub' ? 'subFixedRoutePresets' : 'fixedRoutePresets';
    const presets = Array.isArray(settings[key]) ? [...settings[key]] : [];
    if (presets.length >= 10) {
        showToastMessage('노선은 최대 10개까지 등록할 수 있습니다.');
        return;
    }
    presets.push({ id: generateLocalId('route'), loadLoc, unloadLoc });
    settings[key] = presets;
    setUserSettings(settings);

    if (loadInput) loadInput.value = '';
    if (unloadInput) unloadInput.value = '';
    renderFixedRoutePresetList(scope);
}

function removeFixedRoutePreset(scope, routeId) {
    const settings = getUserSettings();
    const key = scope === 'sub' ? 'subFixedRoutePresets' : 'fixedRoutePresets';
    settings[key] = (Array.isArray(settings[key]) ? settings[key] : []).filter(route => route.id !== routeId);
    setUserSettings(settings);
    renderFixedRoutePresetList(scope);
}

// 일일운행 입력 화면의 노선 원탭 칩을 그린다. 각 칩은 "상차지 → 하차지 (오늘 횟수)"를
// 보여주고, 누르면 그 노선 1회가 추가된다. 1회 이상 기록된 노선에는 되돌리기(−) 버튼도 같이
// 보인다.
function renderFixedRouteQuickButtons(settings, isMain) {
    const container = document.getElementById('fixedRouteQuickButtons');
    if (!container) return;
    const enabled = isMain ? !!settings.fixedRouteOn : !!settings.subFixedRouteOn;
    const presets = getFixedRoutePresets(settings, isMain ? 'main' : 'sub');
    container.style.display = (enabled && presets.length) ? 'flex' : 'none';
    container.innerHTML = '';
    if (!enabled || !presets.length) return;

    presets.forEach(route => {
        const count = currentTempFixedRouteCounts[route.id] || 0;
        const chip = document.createElement('span');
        chip.className = 'fixed-route-chip';

        const selectButton = document.createElement('button');
        selectButton.type = 'button';
        selectButton.className = 'fixed-route-chip-select';
        selectButton.innerHTML = `${escapeDetailText(route.loadLoc)} → ${escapeDetailText(route.unloadLoc)}${count > 0 ? ` <span class="fixed-route-chip-count">${count}회</span>` : ''}`;
        selectButton.addEventListener('click', () => addFixedRouteRun(route.id, isMain));
        chip.appendChild(selectButton);

        if (count > 0) {
            const minusButton = document.createElement('button');
            minusButton.type = 'button';
            minusButton.className = 'fixed-route-chip-minus';
            minusButton.textContent = '−';
            minusButton.title = '한 번 취소';
            minusButton.setAttribute('aria-label', `${route.loadLoc} → ${route.unloadLoc} 1회 취소`);
            minusButton.addEventListener('click', () => removeFixedRouteRun(route.id, isMain));
            chip.appendChild(minusButton);
        }

        container.appendChild(chip);
    });
}

// 노선 칩 원탭 — 그 노선 카운트를 1 늘리고, 기존 "총 횟수" 입력칸에도 그대로 더한다(모든
// 매출/세금계산서 계산이 이미 fixedCount 하나만 보고 있으므로, 이렇게 해야 기존 계산 로직을
// 하나도 안 건드리고 노선별 기록만 얹을 수 있다).
function addFixedRouteRun(routeId, isMain) {
    currentTempFixedRouteCounts[routeId] = (currentTempFixedRouteCounts[routeId] || 0) + 1;
    const countInput = document.getElementById('modalFixedCountInput');
    if (countInput) countInput.value = (parseInt(countInput.value, 10) || 0) + 1;

    const settings = getUserSettings();
    renderFixedRouteQuickButtons(settings, isMain);
    syncFixedCountQuickButtons();
    autoSaveWorkRecord();
}

function removeFixedRouteRun(routeId, isMain) {
    const current = currentTempFixedRouteCounts[routeId] || 0;
    if (current <= 0) return;
    currentTempFixedRouteCounts[routeId] = current - 1;
    if (currentTempFixedRouteCounts[routeId] <= 0) delete currentTempFixedRouteCounts[routeId];

    const countInput = document.getElementById('modalFixedCountInput');
    if (countInput) countInput.value = Math.max(0, (parseInt(countInput.value, 10) || 0) - 1);

    const settings = getUserSettings();
    renderFixedRouteQuickButtons(settings, isMain);
    syncFixedCountQuickButtons();
    autoSaveWorkRecord();
}

function openModal(dateKey, month, day) {
    selectedDateKey = dateKey;
    appState.selectedDateKey = dateKey; // appState 객체 동기화 추가
    document.getElementById('modalTitle').textContent = `${month}월 ${day}일 운행 일지`;

    const savedSettings = getUserSettings();
    const isMain = activeLogId === 'main';
    const fixedOn = isMain ? savedSettings.fixedOn : savedSettings.subFixedOn;
    const palletOn = !!getFixedRouteClient(savedSettings)?.palletOn;
    const callDetailOn = isMain
        ? (savedSettings.hasOwnProperty('callDetailOn') ? !!savedSettings.callDetailOn : true)
        : (savedSettings.hasOwnProperty('subCallDetailOn') ? !!savedSettings.subCallDetailOn : true);

    document.getElementById('modalFixedSection').style.display = fixedOn ? 'block' : 'none';
    document.getElementById('modalPalletSection').style.display = (fixedOn && palletOn) ? 'block' : 'none';
    document.getElementById('modalCallDetailSection').style.display = callDetailOn ? 'block' : 'none';
    renderFixedCountQuickButtons(savedSettings, isMain);

    const record = workData[dateKey];

    currentTempMaintItems = [];
    currentTempCallDetails = [];
    currentTempFuelItems = [];
    currentTempMiscItems = [];
    currentTempFixedRouteCounts = {};

    if (record) {
        setOffState(!!record.isOff);
        document.getElementById('modalFixedCountInput').value = record.fixedCount || '';
        document.getElementById('modalPalletCount').value = record.palletCount || '';

        if (record.maintItems && record.maintItems.length > 0) {
            currentTempMaintItems = JSON.parse(JSON.stringify(record.maintItems));
        }
        if (record.fuelItems && record.fuelItems.length > 0) {
            currentTempFuelItems = JSON.parse(JSON.stringify(record.fuelItems));
        }
        if (record.miscItems && record.miscItems.length > 0) {
            currentTempMiscItems = JSON.parse(JSON.stringify(record.miscItems));
        }
        if (record.callDetails && record.callDetails.length > 0) {
            currentTempCallDetails = JSON.parse(JSON.stringify(record.callDetails));
        }
        if (record.fixedRouteCounts && typeof record.fixedRouteCounts === 'object') {
            currentTempFixedRouteCounts = JSON.parse(JSON.stringify(record.fixedRouteCounts));
        }
    } else {
        setOffState(false);
        document.getElementById('modalFixedCountInput').value = '';
        document.getElementById('modalPalletCount').value = '';
    }

    renderFixedRouteQuickButtons(savedSettings, isMain);
    syncFixedCountQuickButtons();

    renderMaintSummaryInMainModal();
    renderFuelSummaryInMainModal();
    renderMiscSummaryInMainModal();
    renderCallDetailSummaryInMainModal();
    
    hideAllPages();
    document.getElementById('workModal').classList.remove('hidden');
    setActiveNav('workModal');
}

function toggleOffState() {
    setOffState(!isOffSelected);
    autoSaveWorkRecord();
}

function setOffState(off) {
    isOffSelected = off;
    const btnOff = document.getElementById('btnOffToggle');
    const workDetails = document.getElementById('modalWorkDetails');

    if (isOffSelected) {
        btnOff.classList.add('active-off');
        workDetails.style.opacity = '0.3';
        workDetails.style.pointerEvents = 'none';
    } else {
        btnOff.classList.remove('active-off');
        workDetails.style.opacity = '1';
        workDetails.style.pointerEvents = 'auto';
    }
}

function renderCallDetailSummaryInMainModal() {
    const container = document.getElementById('callDetailSummaryContainer');
    const listCard = document.getElementById('callDetailSummaryList');
    if (!container || !listCard) return;

    if (currentTempCallDetails.length === 0) {
        container.style.display = 'none';
        listCard.innerHTML = '';
        return;
    }

    container.style.display = 'block';
    const settings = getActiveLogSettings();
    let totalFare = 0;
    let totalCommission = 0;
    let totalInsuranceFee = 0;
    let totalVat = 0;
    let totalDistance = 0;

    const formatTime = value => {
        if (!value) return '-';
        const [hourText, minute = '00'] = value.split(':');
        const hour = Number(hourText);
        return `${hour < 12 ? 'AM' : 'PM'}${hour % 12 || 12}시${minute === '00' ? '' : minute + '분'}`;
    };
    const durationText = (start, end) => {
        if (!start || !end) return '';
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        let minutes = eh * 60 + em - (sh * 60 + sm);
        if (minutes < 0) minutes += 1440;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return ` (${hours ? hours + '시간' : ''}${mins ? mins + '분' : ''})`;
    };
    const getClientInfo = name => settings.clients?.find(client => client.companyName === name);
    // 저장 시점의 수수료 스냅샷(commissionSnapshot)이 있으면 그 값을 우선 사용해서, 이후
    // 거래처명 변경이나 수수료율 수정이 이미 저장된 기록의 표시값을 소급해서 바꾸지 않도록 한다.
    // 스냅샷이 없는(마이그레이션 이전) 과거 기록만 현재 거래처 설정을 참조하는 기존 방식으로 폴백한다.
    const getCommission = (item, fare) => {
        const snapshot = item.commissionSnapshot;
        let enabled, type, value;
        if (snapshot) {
            enabled = snapshot.enabled;
            type = snapshot.type;
            value = snapshot.value;
        } else {
            const client = getClientInfo(item.client);
            enabled = !!client?.commEnabled;
            type = client?.commType;
            value = client?.commValue;
        }
        if (!enabled) return { amount: 0, label: '' };
        const amount = type === 'direct'
            ? parseCurrencyValue(value)
            : Math.floor(fare * (parseFloat(value) || 0) / 100);
        const label = type === 'direct'
            ? `${parseCurrencyValue(value).toLocaleString()}원`
            : `${value}%`;
        return { amount, label };
    };

    const cardsHtml = currentTempCallDetails.map((item, index) => {
        const fare = parseCurrencyValue(item.fare);
        const commission = getCommission(item, fare);
        const vat = item.vatExempt ? 0 : Math.round(fare * 0.1);
        const insuranceFee = parseCurrencyValue(item.insuranceFee);
        const distance = parseFloat(item.distanceKm) || 0;
        const client = getClientInfo(item.client);
        const unpaid = getDetailPaymentSummary(item).status !== 'paid';
        totalFare += fare;
        totalCommission += commission.amount;
        totalInsuranceFee += insuranceFee;
        totalVat += vat;
        totalDistance += distance;

        const phoneButton = settings.paymentOn && unpaid
            ? (client?.phone
                ? `<a href="tel:${escapeDetailText(client.phone)}" class="call-phone-btn detail-call-phone" onclick="event.stopPropagation()" title="전화걸기">${callPhoneSvg()}</a>`
                : `<button type="button" class="call-phone-btn detail-call-phone" onclick="showConfirmModal('거래처에 등록된 연락처가 없습니다.', null); event.stopPropagation()" title="연락처 없음">${callPhoneSvg()}</button>`)
            : '';
        const messageButton = settings.paymentOn && unpaid
            ? `<button type="button" class="call-phone-btn detail-message-btn" onclick="openMessageTemplate(${index}); event.stopPropagation()" title="문자 보내기">${messageSvg()}</button>`
            : '';
        const badges = [
            settings.platformOn && item.platform ? item.platform : '',
            settings.paymentOn && item.receipt ? item.receipt : ''
        ].filter(Boolean).map(value => `<span class="detail-badge">${escapeDetailText(value)}</span>`).join('');
        const timeRow = settings.timeOn && (item.departureTime || item.arrivalTime)
            ? `<div class="detail-meta-line">출발:${formatTime(item.departureTime)} ➜ 도착:${formatTime(item.arrivalTime)}${durationText(item.departureTime, item.arrivalTime)}</div>`
            : '';
        const specs = [
            settings.distanceOn && distance ? `운행거리:${distance}km` : '',
            settings.cargoTonnageOn && item.cargoTonnage ? `${escapeDetailText(item.cargoTonnage)}톤` : ''
        ].filter(Boolean).join('　');

        return `<article class="call-detail-card ${unpaid ? 'unpaid-card' : ''}">
            <div class="call-detail-card-head">
                <div class="call-detail-route"><strong>${escapeDetailText(item.loadLoc || '상차지 미상')}</strong><span>➜</span><strong>${escapeDetailText(item.unloadLoc || '하차지 미상')}</strong></div>
                <div class="call-detail-actions">
                    <button type="button" class="action-icon-btn" onclick="openCallDetailModal(${index})" title="수정">${editDetailSvg()}</button>
                    <button type="button" class="action-icon-btn del" onclick="deleteCallDetail(${index})" title="삭제">${deleteDetailSvg()}</button>
                </div>
            </div>
            ${timeRow}
            <div class="detail-meta-line">거래처: ${escapeDetailText(item.client || '-')} ${commission.label ? `<span class="commission-rate">수수료 ${escapeDetailText(commission.label)}</span>` : ''}</div>
            ${specs ? `<div class="detail-meta-line">${specs}</div>` : ''}
            <div class="detail-meta-line">비고:${escapeDetailText(item.remarks || '-')}</div>
            <div class="call-detail-fare-line"><span>운송료</span><strong>${fare.toLocaleString()}원</strong></div>
            <div class="call-detail-card-foot"><div class="detail-badges">${badges}</div><div class="detail-payment-actions">${phoneButton}${messageButton}${settings.paymentOn ? `<button type="button" onclick="toggleCallPaymentStatus(${index})" class="payment-toggle-btn ${unpaid ? 'unpaid' : 'paid'}">${unpaid ? '미수' : '수금'}</button>` : ''}</div></div>
        </article>`;
    }).join('');

    const grandTotal = totalFare - totalCommission - totalInsuranceFee + totalVat;
    listCard.innerHTML = `${cardsHtml}
        <div class="call-detail-daily-summary">
            <div><b>일일 운행거리</b><strong>${totalDistance} km</strong></div>
            ${totalCommission ? `<div class="commission-row"><b>수수료</b><strong>- ${totalCommission.toLocaleString()}원</strong></div>` : ''}
            ${totalInsuranceFee ? `<div class="commission-row"><b>산재보험료</b><strong>- ${totalInsuranceFee.toLocaleString()}원</strong></div>` : ''}
            <div><b>부가세(공급가액 기준 10%)</b><strong>${totalVat.toLocaleString()}원</strong></div>
            <div class="summary-grand-total"><b>세부 내역 합계 (${currentTempCallDetails.length}건)</b><strong>${grandTotal.toLocaleString()}원</strong></div>
        </div>`;
}

function escapeDetailText(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

// onclick="fn('${value}')" 처럼 인라인 핸들러의 작은따옴표 문자열 인자로 사용자 입력값을 넣을 때 쓴다.
// 1) JS 문자열 리터럴 이스케이프(백슬래시/따옴표/줄바꿈) → 2) HTML 속성 이스케이프 순서로 처리해야
// onclick="..." 속성 자체를 깨거나 안의 JS 문자열 경계를 깨는 인젝션을 동시에 막을 수 있다.
function escapeForInlineHandlerArg(value) {
    const jsEscaped = String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
    return escapeDetailText(jsEscaped);
}

function callPhoneSvg() {
    return '<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 1 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>';
}

function messageSvg() {
    return '<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path><path d="M8 9h8M8 13h5"></path></svg>';
}

function getDefaultMessageTemplatePatterns() {
    return [
        '안녕하세요, {거래처} 담당자님. {운행구간} 운송료 {운송료}원이 미수 상태입니다. 확인 부탁드립니다.',
        '안녕하세요. {운행구간} 운송 건 운송료 {운송료}원 입금 부탁드립니다. 감사합니다.',
        '안녕하세요, {거래처} 담당자님. {운행구간} 운행이 완료되었습니다. 이용해 주셔서 감사합니다.'
    ];
}

function getMessageTemplatePatterns() {
    const defaults = getDefaultMessageTemplatePatterns();

    try {
        const saved = JSON.parse(localStorage.getItem('messageTemplateCustomBodies') || 'null');
        return Array.isArray(saved) && saved.length === defaults.length
            ? defaults.map((body, index) => String(saved[index] || body))
            : defaults;
    } catch (error) {
        return defaults;
    }
}

function fillMessageTemplatePattern(pattern, values) {
    return String(pattern)
        .replaceAll('{거래처}', values.company)
        .replaceAll('{운행구간}', values.route)
        .replaceAll('{운송료}', values.fare);
}

function openMessageTemplate(index) {
    const item = currentTempCallDetails[index];
    if (!item) {
        showToastMessage('문자 전송 내역을 찾을 수 없습니다.');
        return;
    }
    const settings = getActiveLogSettings();
    const client = settings.clients?.find(entry => entry.companyName === item.client);
    if (!client?.phone) {
        showConfirmModal('거래처에 등록된 연락처가 없습니다.', null);
        return;
    }
    document.getElementById('messageTemplateSheet')?.remove();
    const fare = parseCurrencyValue(item.fare).toLocaleString();
    const company = item.client || '거래처';
    const route = `${item.loadLoc || '상차지'} → ${item.unloadLoc || '하차지'}`;
    const templateTitles = ['미수금 안내', '입금 요청', '운행 완료'];
    const patterns = getMessageTemplatePatterns();
    const templates = patterns.map((pattern, templateIndex) => ({
        title: templateTitles[templateIndex],
        body: fillMessageTemplatePattern(pattern, { company, route, fare })
    }));
    const sheet = document.createElement('div');
    sheet.id = 'messageTemplateSheet';
    sheet.className = 'message-template-overlay';
    sheet.onclick = event => { if (event.target === sheet) sheet.remove(); };
    sheet.innerHTML = `<section class="message-template-sheet" role="dialog" aria-modal="true" aria-label="문자 양식 선택"><div class="message-template-head"><div><strong>문자 보내기</strong><span>${escapeDetailText(company)} · ${escapeDetailText(client.phone)}</span></div><button type="button" onclick="this.closest('.message-template-overlay').remove()" aria-label="닫기">×</button></div><p class="message-template-help">보낼 양식을 선택하면 문자 앱에서 내용을 확인하고 수정할 수 있습니다.</p><div class="message-template-list">${templates.map((template, templateIndex) => `<button type="button" onclick="sendMessageTemplate(${templateIndex})"><strong>${template.title}</strong><span>${escapeDetailText(template.body)}</span></button>`).join('')}</div></section>`;
    sheet._templates = templates;
    sheet._phone = client.phone;
    document.body.appendChild(sheet);
}

function sendMessageTemplate(templateIndex) {
    const sheet = document.getElementById('messageTemplateSheet');
    const phone = sheet?._phone || '';
    const body = sheet?._templates?.[templateIndex]?.body || '';
    if (!phone || !body) {
        showToastMessage('문자 내용을 불러오지 못했습니다.');
        return;
    }
    const separator = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?';
    window.location.href = `sms:${phone}${separator}body=${encodeURIComponent(body)}`;
    sheet?.remove();
}

function editDetailSvg() {
    return '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
}

function fuelIconSvg(className = '', style = '') {
    const classAttribute = className ? ` class="${className}"` : '';
    const styleAttribute = style ? ` style="${style}"` : '';
    return `<svg${classAttribute} viewBox="0 0 24 24"${styleAttribute} aria-hidden="true"><line x1="3" x2="15" y1="22" y2="22"></line><line x1="4" x2="14" y1="9" y2="9"></line><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"></path><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9.83a2 2 0 0 0-.59-1.42L18 5"></path></svg>`;
}

function deleteDetailSvg() {
    return '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
}

function calculateCallDetailComm() {
    const fareInput = document.getElementById('callDetailFare').value;
    const clientName = document.getElementById('callClient').value;
    const infoDiv = document.getElementById('callDetailCommInfo');
    
    let gross = parseCurrencyValue(fareInput);
    if(gross === 0 || !clientName) {
        infoDiv.style.display = 'none';
        return;
    }

    const settings = getUserSettings();
    const clientObj = settings.clients?.find(c => c.companyName === clientName);

    if(clientObj && clientObj.commEnabled) {
        let comm = 0;
        if(clientObj.commType === 'percent' || !clientObj.commType) {
            comm = Math.floor(gross * (parseFloat(clientObj.commValue) / 100));
        } else {
            comm = parseCurrencyValue(clientObj.commValue);
        }
        
        document.getElementById('callDetailCommText').textContent = comm.toLocaleString();
        document.getElementById('callDetailNetFare').textContent = (gross - comm).toLocaleString();
        infoDiv.style.display = 'block';
    } else {
        infoDiv.style.display = 'none';
    }
}

// 운송료 입력창 바로 아래에 "부가세 포함 예상 금액"을 실시간으로 보여준다.
// 계산 로직은 기존 vat = Math.round(fare * 0.1)과 동일하게 맞춰 표시용으로만 재사용한다.
function updateCallDetailVatPreview() {
    const fareInput = document.getElementById('callDetailFare');
    const previewEl = document.getElementById('callDetailVatPreview');
    if (!fareInput || !previewEl) return;

    const fare = parseCurrencyValue(fareInput.value);
    if (!fare) {
        previewEl.style.display = 'none';
        previewEl.textContent = '';
        return;
    }

    const vatExemptToggle = document.getElementById('callVatExemptToggle');
    const isVatExempt = !!vatExemptToggle?.checked;

    if (isVatExempt) {
        previewEl.textContent = '면세 거래로 부가세가 적용되지 않습니다.';
        previewEl.style.display = 'block';
        return;
    }

    const vat = Math.round(fare * 0.1);
    previewEl.textContent = `부가세 포함 ${(fare + vat).toLocaleString()}원`;
    previewEl.style.display = 'block';
}

function selectCallReceipt(value) {
    const container = document.getElementById('callReceiptGroup');
    const hiddenInput = document.getElementById('callReceiptValue');
    if (!container || !hiddenInput) return;

    const isAlreadyActive = hiddenInput.value === value;
    hiddenInput.value = isAlreadyActive ? '' : value;
    container.querySelectorAll('.dark-pill-btn').forEach(button => {
        button.classList.toggle('active', !isAlreadyActive && button.textContent.trim() === value);
    });
}
// 세부입력 "직전 항목과 동일하게 채우기"용 — 오늘 이미 넣어둔 게 있으면 그중 마지막 것,
// 없으면 가장 최근 날짜의 마지막 콜상세를 돌려준다. getFrequentAndRecentLocations()와 같은
// 데이터 소스(currentTempCallDetails → workData 역순)를 쓰되, 여긴 "가장 최근 1건 전체"만
// 필요하므로 훨씬 단순하다.
function getMostRecentCallDetail() {
    if (currentTempCallDetails.length) return currentTempCallDetails[currentTempCallDetails.length - 1];
    const dates = Object.keys(workData).sort().reverse();
    for (const dateKey of dates) {
        const details = workData[dateKey]?.callDetails || [];
        if (details.length) return details[details.length - 1];
    }
    return null;
}

// "손으로 몇 글자만 적으면 되는 수첩"과의 입력 속도 격차를 줄이기 위한 원탭 기능 — 매번
// 거래처/상차지/하차지를 처음부터 타이핑하지 않고, 같은 노선을 반복 운행하는 경우 직전
// 항목을 그대로 채운 뒤 운송료 등 달라지는 값만 고치면 되게 한다. 시간/거리/영수증/결제
// 상태처럼 "이번 건에만 해당하는" 필드는 일부러 복사하지 않는다.
function copyPreviousCallDetail() {
    const prev = getMostRecentCallDetail();
    if (!prev) {
        showToastMessage('복사할 이전 입력 내역이 없습니다.');
        return;
    }
    document.getElementById('callLoadLoc').value = prev.loadLoc || '';
    document.getElementById('callUnloadLoc').value = prev.unloadLoc || '';
    document.getElementById('callClient').value = prev.client || '';
    if (prev.fare) document.getElementById('callDetailFare').value = parseCurrencyValue(prev.fare).toLocaleString();
    if (document.getElementById('callCargoTonnage') && prev.cargoTonnage) {
        document.getElementById('callCargoTonnage').value = prev.cargoTonnage;
    }
    clearCallDetailRequiredError();
    calculateCallDetailComm();
    applyClientPaymentTerms();
    updateCallDetailVatPreview();
    showToastMessage('직전 항목 내용을 채웠습니다. 달라진 부분만 고쳐 주세요.');
}

function openCallDetailModal(index = -1) {
    if (isOffSelected) setOffState(false);
    
    const settings = getActiveLogSettings();

    populateClientDataList();
    populateLocationDataLists();
    renderPinnedClientShortcuts();
    activeLocationShortcutTarget = 'load';
    renderLocationShortcuts();

    // "직전 항목과 동일하게" 버튼은 새로 추가할 때만 의미가 있다(수정 중엔 이미 값이 다
    // 채워져 있음) — 그리고 복사할 대상이 아예 없으면(첫 입력) 굳이 보여줄 필요가 없다.
    const copyPrevBtn = document.getElementById('callDetailCopyPrevBtn');
    if (copyPrevBtn) copyPrevBtn.hidden = index !== -1 || !getMostRecentCallDetail();

    const titleEl = document.getElementById('callDetailModalTitle');
    if (titleEl && selectedDateKey) {
        const dayMatch = selectedDateKey.split('-');
        if (dayMatch.length === 3) {
            titleEl.textContent = `${parseInt(dayMatch[2], 10)}일 일지 세부 입력`;
        }
    }

    const timeEl = document.getElementById('callDetailTimeSection');
    const receiptEl = document.getElementById('callDetailReceiptSection');
    const distEl = document.getElementById('callDetailDistanceSection');
    const platformEl = document.getElementById('callPlatformContainer');
    
    if(timeEl) timeEl.style.display = settings.timeOn ? 'grid' : 'none';
    if(receiptEl) receiptEl.style.display = settings.paymentOn ? 'block' : 'none';
    if(distEl) distEl.style.display = settings.distanceOn ? 'grid' : 'none';
    if(platformEl) platformEl.style.display = settings.platformOn ? 'block' : 'none';

    const cargoTonnageSection = document.getElementById('callCargoTonnageSection');
    if (cargoTonnageSection) {
        cargoTonnageSection.style.display = settings.hasOwnProperty('cargoTonnageOn') ? (settings.cargoTonnageOn ? 'grid' : 'none') : 'grid';
    }

    document.getElementById('callDetailEditIndex').value = index;

    document.getElementById('callLoadLoc').value = '';
    document.getElementById('callUnloadLoc').value = '';
    document.getElementById('callDetailFare').value = '';
    clearCallDetailRequiredError();
    if (document.getElementById('callEndOdometer')) document.getElementById('callEndOdometer').classList.remove('input-error');
    document.getElementById('callClient').value = '';
    document.getElementById('callRemarks').value = '';
    if(document.getElementById('callCargoTonnage')) document.getElementById('callCargoTonnage').value = '';
    
    if(document.getElementById('callDepartureTime')) document.getElementById('callDepartureTime').value = '';
    if(document.getElementById('callArrivalTime')) document.getElementById('callArrivalTime').value = '';
    if(document.getElementById('callDistanceKm')) document.getElementById('callDistanceKm').value = '';
    if(document.getElementById('callStartOdometer')) document.getElementById('callStartOdometer').value = '';
    if(document.getElementById('callEndOdometer')) document.getElementById('callEndOdometer').value = '';
    if(document.getElementById('callVatExemptToggle')) document.getElementById('callVatExemptToggle').checked = false;
    if(document.getElementById('callInsuranceFee')) document.getElementById('callInsuranceFee').value = '';
    if(document.getElementById('callPaymentDueDate')) document.getElementById('callPaymentDueDate').value = '';
    
    if(document.getElementById('callReceiptValue')) document.getElementById('callReceiptValue').value = '';
    if(document.getElementById('callPlatform')) document.getElementById('callPlatform').value = '';
    
    document.querySelectorAll('#callReceiptGroup .dark-pill-btn').forEach(b => b.classList.remove('active'));
    if (index >= 0 && currentTempCallDetails[index]) {
        const item = currentTempCallDetails[index];
        document.getElementById('callLoadLoc').value = item.loadLoc || '';
        document.getElementById('callUnloadLoc').value = item.unloadLoc || '';
        document.getElementById('callDetailFare').value = parseCurrencyValue(item.fare).toLocaleString() || '';
        document.getElementById('callClient').value = item.client || '';
        document.getElementById('callRemarks').value = item.remarks || '';
        if(document.getElementById('callCargoTonnage')) document.getElementById('callCargoTonnage').value = item.cargoTonnage || '';
        
        if(item.departureTime && document.getElementById('callDepartureTime')) document.getElementById('callDepartureTime').value = item.departureTime;
        if(item.arrivalTime && document.getElementById('callArrivalTime')) document.getElementById('callArrivalTime').value = item.arrivalTime;
        if(item.distanceKm && document.getElementById('callDistanceKm')) document.getElementById('callDistanceKm').value = item.distanceKm;
        if(document.getElementById('callStartOdometer')) document.getElementById('callStartOdometer').value = item.startOdometer || '';
        if(document.getElementById('callEndOdometer')) document.getElementById('callEndOdometer').value = item.endOdometer || '';
        if(document.getElementById('callVatExemptToggle')) document.getElementById('callVatExemptToggle').checked = !!item.vatExempt;
        if(document.getElementById('callInsuranceFee')) document.getElementById('callInsuranceFee').value = item.insuranceFee ? parseCurrencyValue(item.insuranceFee).toLocaleString() : '';
        if(document.getElementById('callPaymentDueDate')) document.getElementById('callPaymentDueDate').value = item.paymentDueDate || '';
        
        if (item.receipt) selectCallReceipt(item.receipt);
        if (item.platform && document.getElementById('callPlatform')) document.getElementById('callPlatform').value = item.platform;
    }
    
    const detailContainer = document.getElementById('callDetailModal');
    const inlineHost = document.getElementById('callDetailInlineHost');
    if (detailContainer && inlineHost) {
        if (!detailContainer.dataset.originalParentReady) {
            detailContainer.dataset.originalParentReady = 'true';
        }
        inlineHost.appendChild(detailContainer);
        detailContainer.classList.remove('hidden');
        detailContainer.classList.add('inline-expanded');
        inlineHost.classList.add('is-open');
        inlineHost.setAttribute('aria-hidden', 'false');
        if (!detailContainer._inlineResizeObserver && typeof ResizeObserver !== 'undefined') {
            detailContainer._inlineResizeObserver = new ResizeObserver(() => {
                if (inlineHost.classList.contains('is-open')) {
                    inlineHost.style.maxHeight = `${Math.ceil(detailContainer.scrollHeight) + 4}px`;
                }
            });
            detailContainer._inlineResizeObserver.observe(detailContainer);
        }
        requestAnimationFrame(() => {
            detailContainer.classList.add('is-visible');
            inlineHost.style.maxHeight = `${Math.ceil(detailContainer.scrollHeight) + 4}px`;
            setTimeout(() => {
                inlineHost.style.maxHeight = `${Math.ceil(detailContainer.scrollHeight) + 4}px`;
                detailContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 80);
        });
    }
    calculateCallDetailComm();
    updateCallDetailVatPreview();
}

function closeCallDetailModal() {
    const detailContainer = document.getElementById('callDetailModal');
    const inlineHost = document.getElementById('callDetailInlineHost');
    if (!detailContainer || !inlineHost || !detailContainer.classList.contains('inline-expanded')) {
        detailContainer?.classList.add('hidden');
        return;
    }

    detailContainer.classList.remove('is-visible');
    inlineHost.style.maxHeight = '0px';
    inlineHost.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => {
        detailContainer.classList.add('hidden');
        detailContainer.classList.remove('inline-expanded');
        inlineHost.classList.remove('is-open');
    }, 420);
}

function setCallPlatform(platformName) {
    const input = document.getElementById('callPlatform');
    if (!input) return;
    input.value = input.value === platformName ? '' : platformName;
    document.querySelectorAll('.call-platform-quick-list .dark-pill-btn').forEach(button => {
        button.classList.toggle('active', button.textContent.trim() === input.value);
    });
}

// 필수 입력 필드 인라인 오류 표시(.input-error)를 다루는 범용 헬퍼.
// id 또는 엘리먼트를 직접 받아, 값이 비어있으면 표시하고(markFieldError) 사용자가 입력하면 지운다(clearFieldError).
function markFieldError(idOrEl) {
    const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
    if (el && el.classList) el.classList.add('input-error');
}

function clearFieldError(idOrEl) {
    const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
    if (el && el.classList) el.classList.remove('input-error');
}

function clearCallDetailRequiredError(input) {
    [document.getElementById('callDetailFare'), document.getElementById('callLoadLoc'), document.getElementById('callUnloadLoc')]
        .forEach(clearFieldError);
}

// 정비/기타지출 저장 시 "항목명 또는 비용 중 하나만 있으면 통과"하는 필드 쌍의 인라인
// 오류를 함께 지운다(둘 중 하나만 채워도 검증을 통과하므로, 어느 쪽에 입력해도 둘 다 해제).
function clearMaintRequiredError() {
    [document.getElementById('maintRecordName'), document.getElementById('maintRecordFare')]
        .forEach(clearFieldError);
}

// 주유 기록 저장 시 "비용 또는 주유량 중 하나만 있으면 통과"하는 필드 쌍의 인라인 오류를
// 함께 지운다.
function clearFuelRequiredError() {
    [document.getElementById('fuelDetailCost'), document.getElementById('fuelDetailLiter')]
        .forEach(clearFieldError);
}

function updateCallDetailDistance() {
    const startInput = document.getElementById('callStartOdometer');
    const endInput = document.getElementById('callEndOdometer');
    const distanceInput = document.getElementById('callDistanceKm');
    if (!startInput || !endInput || !distanceInput) return;

    const hasBoth = startInput.value.trim() !== '' && endInput.value.trim() !== '';
    const start = parseCurrencyValue(startInput.value);
    const end = parseCurrencyValue(endInput.value);
    distanceInput.value = hasBoth && end >= start ? end - start : '';
    endInput.classList.toggle('input-error', hasBoth && end < start);
}

function saveCallDetail() {
    const idx = parseInt(document.getElementById('callDetailEditIndex').value, 10);
    const loadLoc = document.getElementById('callLoadLoc').value.trim();
    const unloadLoc = document.getElementById('callUnloadLoc').value.trim();
    const fare = document.getElementById('callDetailFare').value.trim();
    const client = document.getElementById('callClient').value.trim();
    const remarks = document.getElementById('callRemarks').value.trim();
    const paymentDueDate = document.getElementById('callPaymentDueDate').value;
    const cargoTonnage = document.getElementById('callCargoTonnage') ? document.getElementById('callCargoTonnage').value.trim() : '';

    const departureTime = document.getElementById('callDepartureTime') ? document.getElementById('callDepartureTime').value : '';
    const arrivalTime = document.getElementById('callArrivalTime') ? document.getElementById('callArrivalTime').value : '';
    const receipt = document.getElementById('callReceiptValue') ? document.getElementById('callReceiptValue').value : '';
    const distanceKm = document.getElementById('callDistanceKm') ? document.getElementById('callDistanceKm').value.trim() : '';
    const startOdometer = document.getElementById('callStartOdometer') ? document.getElementById('callStartOdometer').value.trim() : '';
    const endOdometer = document.getElementById('callEndOdometer') ? document.getElementById('callEndOdometer').value.trim() : '';
    const vatExempt = document.getElementById('callVatExemptToggle') ? document.getElementById('callVatExemptToggle').checked : false;
    const insuranceFee = document.getElementById('callInsuranceFee') ? document.getElementById('callInsuranceFee').value.trim() : '';
    const platform = document.getElementById('callPlatform') ? document.getElementById('callPlatform').value.trim() : '';

    const fareInput = document.getElementById('callDetailFare');
    const loadLocInput = document.getElementById('callLoadLoc');
    const unloadLocInput = document.getElementById('callUnloadLoc');
    const missingRequired = !fare && !loadLoc && !unloadLoc;
    [fareInput, loadLocInput, unloadLocInput].forEach(input => {
        if (input) input.classList.toggle('input-error', missingRequired);
    });
    if (missingRequired) {
        if (fareInput) fareInput.focus();
        return;
    }

    const existingItem = idx >= 0 && currentTempCallDetails[idx] ? currentTempCallDetails[idx] : null;
    const paymentStatus = existingItem ? (existingItem.paymentStatus || '미수') : '미수';
    // 수금 이력(payments)은 이 화면에서 건드리지 않는 값이므로 수정 시에도 그대로 보존한다.
    const payments = existingItem && Array.isArray(existingItem.payments) ? existingItem.payments : [];

    // 저장 시점의 거래처 연결과 수수료 조건을 스냅샷으로 함께 남긴다. 이후 거래처명 변경이나
    // 수수료율 수정이 이미 저장된 이 기록의 표시값을 소급해서 바꾸지 않도록 하기 위함이다.
    // (신규 저장뿐 아니라 기존 기록을 수정해서 다시 저장할 때도, 그 시점의 최신 거래처 조건으로
    // 스냅샷이 새로 갱신된다.)
    const savedSettings = getUserSettings();
    const matchedClient = savedSettings.clients?.find(c => c.companyName === client);
    const clientId = matchedClient?.id || null;
    const commissionSnapshot = (matchedClient && matchedClient.commEnabled)
        ? { enabled: true, type: matchedClient.commType, value: matchedClient.commValue }
        : { enabled: false, type: null, value: null };

    const newItem = {
        loadLoc,
        unloadLoc,
        fare,
        client,
        clientId,
        commissionSnapshot,
        remarks,
        departureTime,
        arrivalTime,
        receipt,
        distanceKm,
        startOdometer,
        endOdometer,
        vatExempt,
        insuranceFee,
        platform,
        paymentStatus,
        payments,
        paymentDueDate,
        cargoTonnage,
        workDate: selectedDateKey
    };

    if (idx >= 0) {
        currentTempCallDetails[idx] = newItem;
    } else {
        currentTempCallDetails.push(newItem);
    }

    renderCallDetailSummaryInMainModal();
    if (!document.getElementById('workModal').classList.contains('hidden')) {
        autoSaveWorkRecord();
    }
    closeCallDetailModal();
}

function deleteCallDetail(index) {
    showConfirmModal('삭제하시겠습니까?', () => {
        currentTempCallDetails.splice(index, 1);
        renderCallDetailSummaryInMainModal();
        if (!document.getElementById('workModal').classList.contains('hidden')) {
            autoSaveWorkRecord();
        }
    });
}

function closeModal() {
    const openDetail = document.getElementById('callDetailModal');
    if (openDetail?.classList.contains('inline-expanded')) {
        closeCallDetailModal();
    }
    ['maintFuelSelectModal', 'maintRecordModal', 'fuelDetailModal'].forEach(id => {
        const panel = document.getElementById(id);
        if (panel?.classList.contains('inline-expanded')) {
            closeMaintFuelInlinePanel(panel);
        }
    });
    document.getElementById('workModal').classList.add('hidden');
    // showMain()을 인자 없이 호출하면 skipRedirect 기본값(false) 때문에 activeLogId가 'main'이
    // 아닐 때(기사차량 운행일지를 보던 중) switchCarLog('main')으로 강제 전환해 버린다 — 일일운행
    // 상세를 열었던 차량 컨텍스트(activeLogId)와 무관하게 항상 메인차량으로 튕기는 버그였다.
    // 이 모달은 "지금 activeLogId인 차량"의 달력에서 열렸으므로, 닫을 때도 그 차량으로 그대로
    // 돌아가야 한다 — activeLogId를 바꾸지 않고 그냥 메인 페이지(현재 로그의 달력)만 다시 보여준다.
    showMain(true);
}

let autoSaveStatusHideTimer = null;

// #workModal 제목 아래 작은 자동저장 상태 텍스트 ("저장 중..." → "저장됨"/"저장 실패", 잠시 후 자동 소멸)
function setAutoSaveStatus(state) {
    const el = document.getElementById('autoSaveStatus');
    if (!el) return;
    if (autoSaveStatusHideTimer) {
        clearTimeout(autoSaveStatusHideTimer);
        autoSaveStatusHideTimer = null;
    }
    if (state === 'saving') {
        el.textContent = '저장 중...';
        el.classList.remove('error');
        el.classList.add('visible');
    } else if (state === 'saved') {
        el.textContent = '저장되었습니다.';
        el.classList.remove('error');
        el.classList.add('visible');
        autoSaveStatusHideTimer = setTimeout(() => el.classList.remove('visible'), 1200);
    } else if (state === 'error') {
        el.textContent = '저장 실패';
        el.classList.add('error');
        el.classList.add('visible');
        autoSaveStatusHideTimer = setTimeout(() => el.classList.remove('visible'), 1800);
    }
}

function autoSaveWorkRecord() {
    if (!selectedDateKey) return;

    setAutoSaveStatus('saving');

    try {
        const savedSettings = getUserSettings();
        const isMain = activeLogId === 'main';
        const fixedOn = isMain ? savedSettings.fixedOn : savedSettings.subFixedOn;
        const palletOn = !!getFixedRouteClient(savedSettings)?.palletOn;

        let fixedCount = 0;
        let palletCount = 0;

        if (!isOffSelected) {
            if (fixedOn) {
                fixedCount = parseInt(document.getElementById('modalFixedCountInput').value, 10) || 0;

                if (palletOn) {
                    palletCount = parseInt(document.getElementById('modalPalletCount').value, 10) || 0;
                }
            }
        }

        const maintItems = currentTempMaintItems;
        const fuelItems = currentTempFuelItems;
        const miscItems = currentTempMiscItems;
        const callDetails = currentTempCallDetails;

        if (!isOffSelected && fixedCount === 0 && palletCount === 0 && maintItems.length === 0 && fuelItems.length === 0 && miscItems.length === 0 && callDetails.length === 0) {
            delete workData[selectedDateKey];
        } else {
            workData[selectedDateKey] = {
                isOff: isOffSelected,
                fixedCount,
                palletCount,
                maintItems,
                fuelItems,
                miscItems,
                callDetails,
                // 고정노선 "상하차지 사용"으로 노선별 원탭 기록을 쓰는 경우에만 값이 채워진다.
                // autoSaveWorkRecord()가 항상 workData[date]를 통째로 다시 만들기 때문에, 여기서
                // 같이 안 넣으면 다른 입력(콜상세 등)을 저장할 때마다 노선별 기록이 조용히
                // 사라진다 — 실제로 그렇게 유실되는 걸 막기 위해 처음부터 여기 넣어둔다.
                fixedRouteCounts: currentTempFixedRouteCounts
            };
        }

        saveDataToStorage();
        buildCalendar();
        setAutoSaveStatus('saved');
    } catch (error) {
        console.error('자동 저장 실패:', error);
        setAutoSaveStatus('error');
    }
}

function createTableHTML(items, showPallet) {
    const headerHTML = `
        <table class="report-table">
            <thead>
                <tr>
                    <th style="width: ${showPallet ? '30%' : '35%'};">날짜</th>
                    <th style="width: ${showPallet ? '20%' : '25%'};">운행</th>
                    ${showPallet ? '<th style="width: 20%;">파렛트</th>' : ''}
                    <th style="width: ${showPallet ? '30%' : '40%'};">금액</th>
                </tr>
            </thead>
            <tbody>`;
    
    let bodyHTML = '';
    const currentMonth = viewDate.getMonth() + 1;

    items.forEach(item => {
        const palletStr = item.palletCount > 0 ? `${item.palletCount}장` : '-';
        const workStr = item.isOff ? '휴무' : `${item.workVal}회`;
        bodyHTML += `
            <tr>
                <td>${currentMonth}월 ${item.day}일</td>
                <td>${workStr}</td>
                ${showPallet ? `<td>${palletStr}</td>` : ''}
                <td class="amount">${item.amount.toLocaleString()}원</td>
            </tr>`;
    });

    const footerHTML = `</tbody></table>`;
    return headerHTML + bodyHTML + footerHTML;
}

function buildReportPage(isForExport = false) {
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();

    document.getElementById('reportMonthTitle').textContent = `${currentYear}년 ${currentMonth + 1}월 운송비 내역서`;

    const savedSettings = getUserSettings();
    let rptName = savedSettings.userName || '-';
    let rptPhone = savedSettings.userPhone || '-';
    let rptBank = savedSettings.bankName || '-';
    let rptAccount = savedSettings.accountNumber || '-';
    let rptAccountHolder = savedSettings.accountHolder || '-';

    if (activeLogId !== 'main') {
        const currentCar = (savedSettings.cars || []).find(c => c.number === activeLogId);
        if (currentCar) {
            document.getElementById('rptCarNumber').textContent = currentCar.number || '-';
            document.getElementById('rptCarTonnage').textContent = currentCar.tonnage || '-';

            if (currentCar.logEnabled && currentCar.infoType === 'new' && currentCar.personalInfo) {
                rptName = currentCar.personalInfo.name || rptName;
                rptPhone = currentCar.personalInfo.phone || rptPhone;
                rptBank = currentCar.personalInfo.bank || rptBank;
                rptAccount = currentCar.personalInfo.account || rptAccount;
                rptAccountHolder = currentCar.personalInfo.accountHolder || rptAccountHolder;
            }
        }
    } else if (savedSettings.cars && savedSettings.cars.length > 0) {
        // 예전엔 메인 차량이 없으면(데이터 이상 등 정상적으론 발생 안 함) 그냥 목록의 첫 번째
        // 차량으로 대신했는데, 그게 서브 차량이면 그 기사 개인정보(이름/계좌 등)가 메인 차량
        // 자리에 잘못 표시될 수 있었다(§전수 점검에서 발견). 위의 서브 차량 분기(activeLogId
        // !== 'main')와 동일하게, 못 찾으면 아무 것도 대신 채우지 않고 그대로 둔다 — 엉뚱한
        // 차량 정보를 보여주는 것보다 기본값(차주 개인정보) 그대로가 안전하다.
        const mainCar = savedSettings.cars.find(c => c.type === 'main');
        if (mainCar) {
            if (mainCar.logEnabled && mainCar.infoType === 'new' && mainCar.personalInfo) {
                rptName = mainCar.personalInfo.name || rptName;
                rptPhone = mainCar.personalInfo.phone || rptPhone;
                rptBank = mainCar.personalInfo.bank || rptBank;
                rptAccount = mainCar.personalInfo.account || rptAccount;
                rptAccountHolder = mainCar.personalInfo.accountHolder || rptAccountHolder;
            }

            document.getElementById('rptCarNumber').textContent = mainCar.number || '-';
            document.getElementById('rptCarTonnage').textContent = mainCar.tonnage || '-';
        } else {
            // 이전 렌더링에서 남아있던 값이 그대로 보이지 않도록 확실히 기본값으로 되돌린다.
            document.getElementById('rptCarNumber').textContent = '-';
            document.getElementById('rptCarTonnage').textContent = '-';
        }

    } else {
        document.getElementById('rptCarNumber').textContent = '-';
        document.getElementById('rptCarTonnage').textContent = '-';
    }

    document.getElementById('rptUserName').textContent = rptName;
    document.getElementById('rptUserPhone').textContent = rptPhone;
    document.getElementById('rptBankName').textContent = rptBank;
    document.getElementById('rptAccountNumber').textContent = rptAccount;
    if (document.getElementById('rptAccountHolder')) document.getElementById('rptAccountHolder').textContent = rptAccountHolder;

    const isMain = activeLogId === 'main';
    const fixedRouteClient = getFixedRouteClient(savedSettings);
    const fixedUnitPrice = parseCurrencyValue(fixedRouteClient?.fixedUnitPrice);
    const palletUnitPrice = parseCurrencyValue(fixedRouteClient?.palletPrice);
    const showPallet = !!((isMain ? savedSettings.fixedOn : savedSettings.subFixedOn) && fixedRouteClient?.palletOn);

    let workList = [];
    let totalMonthWork = 0;
    let totalFare = 0;
    let totalPalletFare = 0;
    let totalCommission = 0;
    let totalMonthDistance = 0; // 추가: 운송비 내역서 총 운행거리 표기

    let defaultBaseFare = 0;
    let monthFareByClient = {};
    let monthCommByClient = {};
    let clientCommLabels = {};

    for (let d = 1; d <= lastDate; d++) {
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const record = workData[dateKey];

        if (record) {
            if (record.isOff) {
                workList.push({
                    day: d,
                    isOff: true,
                    workVal: 0,
                    palletCount: 0,
                    amount: 0
                });
            } else {
                let dayWorkCount = 0;
                let dayFare = 0;
                let dayPalletCount = showPallet ? (record.palletCount || 0) : 0;
                let dayDefaultFare = 0;

                if (record.fixedCount > 0) {
                    dayWorkCount += parseInt(record.fixedCount, 10);
                    let fAmt = record.fixedCount * fixedUnitPrice;
                    dayFare += fAmt;
                    // 고정 거래처가 지정돼 있으면 그 거래처 매출로 집계한다(고정노선 거래처 연동).
                    const fixedClientName = fixedRouteClient?.companyName || '';
                    if (fixedClientName) {
                        monthFareByClient[fixedClientName] = (monthFareByClient[fixedClientName] || 0) + fAmt;
                        // 콜상세 거래처와 동일하게, 고정 거래처도 수수료가 켜져 있으면 그대로 적용한다.
                        const fixedClientObj = fixedRouteClient;
                        if (fixedClientObj?.commEnabled) {
                            let fixedComm = 0;
                            if (fixedClientObj.commType === 'percent' || !fixedClientObj.commType) {
                                fixedComm = Math.floor(fAmt * (parseFloat(fixedClientObj.commValue) / 100));
                                clientCommLabels[fixedClientName] = `${fixedClientObj.commValue}%`;
                            } else {
                                fixedComm = parseCurrencyValue(fixedClientObj.commValue) * Math.max(1, record.fixedCount || 0);
                                clientCommLabels[fixedClientName] = `${parseCurrencyValue(fixedClientObj.commValue).toLocaleString()}원`;
                            }
                            monthCommByClient[fixedClientName] = (monthCommByClient[fixedClientName] || 0) + fixedComm;
                            totalCommission += fixedComm;
                        }
                    } else {
                        dayDefaultFare += fAmt;
                    }
                }
                totalMonthDistance += getRecordTotalDistance(record);

                if (record.callDetails && record.callDetails.length > 0) {
                    record.callDetails.forEach(detail => {
                        let type = detail.distanceType || '';
                        if (type === '공차') {
                            // +0
                        } else if (type === '혼짐') {
                            if (detail.linkedLoadIndex === 'pending' || detail.linkedLoadIndex === '-1' || detail.linkedLoadIndex === undefined) {
                                dayWorkCount += 1;
                            }
                        } else {
                            dayWorkCount += 1;
                        }

                        let gross = parseCurrencyValue(detail.fare);
                        let comm = 0;
                        let clientName = detail.client ? detail.client.trim() : '';
                        let isRegisteredClient = false;
                        
                        if (clientName) {
                            const clientObj = savedSettings.clients?.find(c => c.companyName === clientName);
                            if (clientObj) {
                                isRegisteredClient = true;
                            }

                            // 수수료 계산은 저장 시점의 스냅샷을 우선 사용한다(거래처명/수수료율이
                            // 나중에 바뀌어도 이미 저장된 기록의 표시값이 소급 변경되지 않도록).
                            // 스냅샷이 없는(마이그레이션 이전) 과거 기록만 현재 거래처 설정을
                            // 참조하는 기존 방식으로 폴백한다.
                            const commSnapshot = detail.commissionSnapshot;
                            const commEnabled = commSnapshot ? commSnapshot.enabled : !!clientObj?.commEnabled;
                            const commType = commSnapshot ? commSnapshot.type : clientObj?.commType;
                            const commValue = commSnapshot ? commSnapshot.value : clientObj?.commValue;

                            if (commEnabled) {
                                if (commType === 'percent' || !commType) {
                                    comm = Math.floor(gross * (parseFloat(commValue) / 100));
                                    clientCommLabels[clientName] = `${commValue}%`;
                                } else {
                                    comm = parseCurrencyValue(commValue);
                                    clientCommLabels[clientName] = `${comm.toLocaleString()}원`;
                                }
                                monthCommByClient[clientName] = (monthCommByClient[clientName] || 0) + comm;
                            }
                        }

                        if (isRegisteredClient) {
                            monthFareByClient[clientName] = (monthFareByClient[clientName] || 0) + gross;
                        } else {
                            dayDefaultFare += gross;
                        }

                        dayFare += gross;
                        totalCommission += comm;
                    });
                }

                defaultBaseFare += dayDefaultFare;
                const dayPalletFare = dayPalletCount * palletUnitPrice;

                if (dayWorkCount > 0 || dayPalletCount > 0) {
                    totalMonthWork += dayWorkCount;
                    totalFare += dayFare;
                    totalPalletFare += dayPalletFare;

                    workList.push({
                        day: d,
                        isOff: false,
                        workVal: dayWorkCount,
                        palletCount: dayPalletCount,
                        amount: dayFare + dayPalletFare
                    });
                }
            }
        }
    }


    const container = document.getElementById('reportTableContainer');
    container.innerHTML = '';

    if (workList.length === 0) {
        container.innerHTML = `
            <table class="report-table">
                <tbody>
                    <tr><td style="text-align:center; padding: 15px; color: var(--sub-text-color);">해당 월의 운송 내역이 없습니다.</td></tr>
                </tbody>
            </table>`;
    } else if (isForExport) {
        const half = Math.ceil(workList.length / 2);
        const leftList = workList.slice(0, half);
        const rightList = workList.slice(half);

        container.innerHTML = `
            <div class="report-split-container">
                <div class="report-split-column">${createTableHTML(leftList, showPallet)}</div>
                <div class="report-split-column">${rightList.length > 0 ? createTableHTML(rightList, showPallet) : ''}</div>
            </div>`;
    } else {
        container.innerHTML = createTableHTML(workList, showPallet);
    }

    let subCarComm = 0;
    let subCarCommLabel = '기사차량 수수료';
    if (activeLogId !== 'main') {
        const currentCar = savedSettings.cars?.find(c => c.number === activeLogId);
        if (currentCar?.commEnabled && currentCar.commission) {
            subCarComm = calculateDriverVehicleCommission(currentCar, totalFare + totalPalletFare - totalCommission, totalMonthWork);
            subCarCommLabel = currentCar.commType === 'direct'
                ? `${getShortCarNum(currentCar.number)}차량 건당 ${parseCurrencyValue(currentCar.commission).toLocaleString()}원`
                : `${getShortCarNum(currentCar.number)}차량 ${parseFloat(currentCar.commission) || 0}%`;
        }
    }

    const totalVat = Math.round((totalFare + totalPalletFare) * 0.1);
    const grandTotal = totalFare + totalPalletFare - totalCommission - subCarComm + totalVat;

    const summaryBox = document.querySelector('.report-summary-box');
    
    let baseFareHtml = `
        <div class="summary-row" style="color: var(--primary-color); font-weight: 700; border-bottom: 1px dashed var(--border-color); padding-bottom: 10px; margin-bottom: 10px;">
            <span>월간 총 운행거리</span>
            <span class="summary-value">${totalMonthDistance} km</span>
        </div>
    `;

    if (defaultBaseFare > 0 || Object.keys(monthFareByClient).length === 0) {
        baseFareHtml += `
            <div class="summary-row">
                <span>기본 운송료</span>
                <span class="summary-value">${defaultBaseFare.toLocaleString()} 원</span>
            </div>
        `;
    }
    for (let client in monthFareByClient) {
        baseFareHtml += `
            <div class="summary-row">
                <span>${escapeDetailText(client)} 기본 운송료</span>
                <span class="summary-value">${monthFareByClient[client].toLocaleString()} 원</span>
            </div>
        `;
        if (monthCommByClient[client] > 0) {
            baseFareHtml += `
                <div class="summary-row">
                    <span style="padding-left: 10px; font-size: 0.9rem; color: var(--sub-text-color);">└ ${escapeDetailText(client)} 수수료 (${clientCommLabels[client]})</span>
                    <span class="summary-value">- ${monthCommByClient[client].toLocaleString()} 원</span>
                </div>
            `;
        }
    }
    
    summaryBox.innerHTML = `
        ${baseFareHtml}
        <div class="summary-row">
            <span>부가세 (공급가액 기준 10%)</span>
            <span class="summary-value">${totalVat.toLocaleString()} 원</span>
        </div>
        <div class="summary-row total">
            <span>계</span>
            <span class="summary-value">${grandTotal.toLocaleString()} 원</span>
        </div>
    `;
}

function openDetailReportModal() {
    const clientSelect = document.getElementById('detailReportClientSelect');
    clientSelect.innerHTML = '<option value="ALL">전체 (모두)</option>';
    
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const clientSet = new Set();
    const settings = getUserSettings();
    if (settings.clients) {
        settings.clients.forEach(c => clientSet.add(c.companyName));
    }

    for (let d = 1; d <= lastDate; d++) {
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const record = workData[dateKey];
        if (record && !record.isOff && record.callDetails && record.callDetails.length > 0) {
            record.callDetails.forEach(item => {
                if (item.client) clientSet.add(item.client);
            });
        }
    }
    
    clientSet.forEach(client => {
        const opt = document.createElement('option');
        opt.value = client;
        opt.textContent = client;
        clientSelect.appendChild(opt);
    });
    
    const optUnspecified = document.createElement('option');
    optUnspecified.value = '미지정';
    optUnspecified.textContent = '미지정';
    clientSelect.appendChild(optUnspecified);

    document.getElementById('detailReportSelectModal').classList.remove('hidden');
}

function closeDetailReportModal() {
    document.getElementById('detailReportSelectModal').classList.add('hidden');
}

function createDetailTableHTML(items, isForExport, totalItems, showClientColumn = true) {
    let fontSize = '0.8rem';
    let cellPadding = '10px 4px';
    
    if (isForExport) {
        if (totalItems > 70) {
            fontSize = '0.5rem';
            cellPadding = '2px 1px';
        } else if (totalItems > 45) {
            fontSize = '0.55rem';
            cellPadding = '3px 1px';
        } else if (totalItems > 25) {
            fontSize = '0.65rem';
            cellPadding = '4px 2px';
        } else {
            fontSize = '0.75rem';
            cellPadding = '6px 3px';
        }
    }

    const columnWidths = showClientColumn
        ? { date: '16%', location: '23%', client: '17%', amount: '21%' }
        : { date: '17%', location: '29.5%', amount: '24%' };

    return `
        <table class="report-table detail-report-table" style="font-size: ${fontSize};">
            <thead>
                <tr>
                    <th class="detail-date-cell" style="width: ${columnWidths.date}; padding: ${cellPadding};">날짜</th>
                    <th class="detail-text-cell detail-location-cell" style="width: ${columnWidths.location}; padding: ${cellPadding};">상차지</th>
                    <th class="detail-text-cell detail-location-cell" style="width: ${columnWidths.location}; padding: ${cellPadding};">하차지</th>
                    ${showClientColumn ? `<th class="detail-text-cell" style="width: ${columnWidths.client}; padding: ${cellPadding};">거래처</th>` : ''}
                    <th class="detail-amount-cell" style="width: ${columnWidths.amount}; padding: ${cellPadding};">금액</th>
                </tr>
            </thead>
            <tbody>
                ${items.length > 0 ? items.map(item => `
                    <tr>
                        <td class="detail-date-cell" style="padding: ${cellPadding};">${item.dateStr}</td>
                        <td class="detail-text-cell detail-location-cell" style="padding: ${cellPadding};">${escapeDetailText(item.loadLoc)}</td>
                        <td class="detail-text-cell detail-location-cell" style="padding: ${cellPadding};">${escapeDetailText(item.unloadLoc)}</td>
                        ${showClientColumn ? `<td class="detail-text-cell" style="padding: ${cellPadding};">${escapeDetailText(item.client)}</td>` : ''}
                        <td class="amount detail-amount-cell" style="padding: ${cellPadding};">${item.fare.toLocaleString()}원</td>
                    </tr>
                `).join('') : `<tr><td colspan="${showClientColumn ? 5 : 4}" style="text-align:center; padding: 15px;">해당 내역이 없습니다.</td></tr>`}
            </tbody>
        </table>
    `;
}

function viewDetailReport(isForExport) {
    if (typeof isForExport !== 'boolean') isForExport = false;
    isDetailReportView = true;

    if (!isForExport) {
        const selectEl = document.getElementById('detailReportClientSelect');
        if (selectEl) {
            currentDetailClientFilter = selectEl.value;
        }
    }
    const clientFilter = currentDetailClientFilter;

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();

    const savedSettings = getUserSettings();
    let detailsList = [];
    let totalFare = 0;
    let totalCommission = 0;

    let defaultBaseFare = 0;
    let monthFareByClient = {};
    let monthCommByClient = {};
    let clientCommLabels = {};

    for (let d = 1; d <= lastDate; d++) {
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const record = workData[dateKey];
        if (record && !record.isOff && record.callDetails && record.callDetails.length > 0) {
            record.callDetails.forEach(item => {
                const clientName = item.client || '미지정';
                if (clientFilter === 'ALL' || clientFilter === clientName) {
                    const fareVal = parseCurrencyValue(item.fare);
                    
                    let comm = 0;
                    let isRegisteredClient = false;

                    if (item.client) {
                        const clientObj = savedSettings.clients?.find(c => c.companyName === item.client);
                        if (clientObj) {
                            isRegisteredClient = true;
                        }

                        // 수수료 계산은 저장 시점의 스냅샷을 우선 사용한다(거래처명/수수료율이
                        // 나중에 바뀌어도 이미 저장된 기록의 표시값이 소급 변경되지 않도록).
                        // 스냅샷이 없는(마이그레이션 이전) 과거 기록만 현재 거래처 설정을
                        // 참조하는 기존 방식으로 폴백한다.
                        const commSnapshot = item.commissionSnapshot;
                        const commEnabled = commSnapshot ? commSnapshot.enabled : !!clientObj?.commEnabled;
                        const commType = commSnapshot ? commSnapshot.type : clientObj?.commType;
                        const commValue = commSnapshot ? commSnapshot.value : clientObj?.commValue;

                        if (commEnabled) {
                            if (commType === 'percent' || !commType) {
                                comm = Math.floor(fareVal * (parseFloat(commValue) / 100));
                                clientCommLabels[clientName] = `${commValue}%`;
                            } else {
                                comm = parseCurrencyValue(commValue);
                                clientCommLabels[clientName] = `${comm.toLocaleString()}원`;
                            }
                            monthCommByClient[clientName] = (monthCommByClient[clientName] || 0) + comm;
                        }
                    }

                    if (isRegisteredClient) {
                        monthFareByClient[clientName] = (monthFareByClient[clientName] || 0) + fareVal;
                    } else {
                        defaultBaseFare += fareVal;
                    }
                    
                    detailsList.push({
                        dateStr: `${currentMonth + 1}월 ${d}일`,
                        loadLoc: item.loadLoc || '-',
                        unloadLoc: item.unloadLoc || '-',
                        client: clientName,
                        fare: fareVal
                    });
                    totalFare += fareVal;
                    totalCommission += comm;
                }
            });
        }
    }

    let tableHTML = '';
    const showClientColumn = clientFilter === 'ALL';

    if (isForExport && detailsList.length > 15) {
        const half = Math.ceil(detailsList.length / 2);
        const leftList = detailsList.slice(0, half);
        const rightList = detailsList.slice(half);

        tableHTML = `
            <div class="report-split-container">
                <div class="report-split-column">${createDetailTableHTML(leftList, true, detailsList.length, showClientColumn)}</div>
                <div class="report-split-column">${rightList.length > 0 ? createDetailTableHTML(rightList, true, detailsList.length, showClientColumn) : ''}</div>
            </div>`;
    } else {
        tableHTML = createDetailTableHTML(detailsList, isForExport, detailsList.length, showClientColumn);
    }

    const clientText = clientFilter === 'ALL' ? '전체' : clientFilter;
    document.getElementById('reportMonthTitle').textContent = `${currentYear}년 ${currentMonth + 1}월 운송비 내역서 (${clientText})`;
    document.getElementById('reportTableContainer').innerHTML = tableHTML;
    
    let subCarComm = 0;
    let subCarCommLabel = '기사차량 수수료';
    if (activeLogId !== 'main') {
        const currentCar = savedSettings.cars?.find(c => c.number === activeLogId);
        if (currentCar?.commEnabled && currentCar.commission) {
            subCarComm = calculateDriverVehicleCommission(currentCar, totalFare - totalCommission, detailsList.length);
            subCarCommLabel = currentCar.commType === 'direct'
                ? `${getShortCarNum(currentCar.number)}차량 건당 ${parseCurrencyValue(currentCar.commission).toLocaleString()}원`
                : `${getShortCarNum(currentCar.number)}차량 ${parseFloat(currentCar.commission) || 0}%`;
        }
    }

    const vat = Math.round(totalFare * 0.1);
    const grandTotal = totalFare - totalCommission - subCarComm + vat;

    const summaryBox = document.querySelector('.report-summary-box');
    
    let baseFareHtml = '';
    if (defaultBaseFare > 0 || Object.keys(monthFareByClient).length === 0) {
        baseFareHtml += `
            <div class="summary-row">
                <span>기본 운송료</span>
                <span class="summary-value">${defaultBaseFare.toLocaleString()} 원</span>
            </div>
        `;
    }
    for (let client in monthFareByClient) {
        baseFareHtml += `
            <div class="summary-row">
                <span>${escapeDetailText(client)} 기본 운송료</span>
                <span class="summary-value">${monthFareByClient[client].toLocaleString()} 원</span>
            </div>
        `;
        if (monthCommByClient[client] > 0) {
            baseFareHtml += `
                <div class="summary-row">
                    <span style="padding-left: 10px; font-size: 0.9rem; color: var(--sub-text-color);">└ ${escapeDetailText(client)} 수수료 (${clientCommLabels[client]})</span>
                    <span class="summary-value">- ${monthCommByClient[client].toLocaleString()} 원</span>
                </div>
            `;
        }
    }

    summaryBox.innerHTML = `
        ${baseFareHtml}
        <div class="summary-row">
            <span>부가세 (공급가액 기준 10%)</span>
            <span class="summary-value">${vat.toLocaleString()} 원</span>
        </div>
        <div class="summary-row total">
            <span>계</span>
            <span class="summary-value">${grandTotal.toLocaleString()} 원</span>
        </div>
    `;

    if (!isForExport) {
        closeDetailReportModal();
        showToastMessage("세부 내역서가 조회되었습니다.");
    }
}

// 앱 초기화 구문
normalizeLegacyData();
normalizeLegacyClientIds();
normalizeLegacyPinnedLocations();
try {
    syncNormalizedEntityStore();
} catch (error) {
    console.error('정규화 데이터 초기화 실패:', error);
}
loadSettings();
initDateSelects();
initMaintDateSelects();
initFuelDateSelects();
initMiscDateSelects();
initRevenueDateSelects();
initCalendarDOM();
buildCalendar();
renderSubCarMenu();
updateAccountRoleUI();
checkBackupReminder();

// 스플래시 화면(시작 화면) 제어 로직
// 이미 로그인된 재방문 유저는 매번 2초씩 기다릴 필요가 없으므로 대기 없이 짧게 페이드아웃하고,
// 최초 진입(계정 유형 미선택/로그인 전) 유저에게만 기존 브랜딩 노출 시간을 유지한다.
window.addEventListener('load', () => {
    const splashScreen = document.getElementById('splashScreen');
    if (!splashScreen) return;

    (async () => {
        // Supabase 세션이 실제로 남아있는지 먼저 확인하고, 로컬의 isLoggedIn 플래그를
        // 그 결과에 맞게 보정한다(다른 기기에서 로그아웃했거나 세션이 만료된 경우 등 대비).
        let hasSupabaseSession = false;
        if (typeof getSupabaseUser === 'function') {
            try {
                hasSupabaseSession = !!(await getSupabaseUser());
            } catch (error) {
                console.error('Supabase 세션 확인 실패(로컬 상태로 계속 진행):', error);
            }
        }

        let settings = getUserSettings();
        // 주의: 여기서는 반드시 setUserSettings()가 아니라 localStorage에 직접 써야 한다.
        // setUserSettings()는 호출될 때마다 600ms 뒤 "지금 로컬 settings 전체"를 그대로
        // Supabase profiles에 업로드(동기화)한다. 이 시점은 바로 아래 hydrateFromSupabaseAndMigrate()가
        // 서버 데이터를 아직 불러오기도 전이라, 새 기기/브라우저처럼 로컬 userSettings가 비어있는
        // 상태일 수 있다 — 그 "빈 상태"로 배경 동기화가 hydrate보다 먼저 끝나버리면(네트워크 상황에
        // 따라 실제로 이렇게 됨) 서버에 이미 저장돼 있던 accountType/사업자정보/계좌정보 등이
        // 통째로 null로 덮어써지는 심각한 데이터 유실 버그가 있었다(실제 계정에서 재현 확인됨).
        // isLoggedIn 플래그는 로컬에만 즉시 반영하고, 서버 동기화는 트리거하지 않는다 — 실제
        // 서버 동기화는 hydrate가 끝난 뒤 사용자가 무언가 저장할 때 정상적인 최신 데이터로 일어난다.
        if (hasSupabaseSession && !settings.isLoggedIn) {
            settings.isLoggedIn = true;
            settings.onboardingCompleted = true;
            localStorage.setItem('userSettings', JSON.stringify(settings));
        } else if (!hasSupabaseSession && settings.isLoggedIn) {
            settings.isLoggedIn = false;
            localStorage.setItem('userSettings', JSON.stringify(settings));
        }
        settings = getUserSettings();

        if (hasSupabaseSession && typeof hydrateFromSupabaseAndMigrate === 'function') {
            try {
                await hydrateFromSupabaseAndMigrate();
                settings = getUserSettings();
            } catch (error) {
                console.error('Supabase 초기 동기화 실패(로컬 데이터로 계속 진행):', error);
            }
        }

        const isReturningUser = !!settings.isLoggedIn;
        const holdMs = isReturningUser ? 0 : 1500;
        const fadeMs = isReturningUser ? 200 : 500;

        setTimeout(() => {
            splashScreen.style.transition = `opacity ${fadeMs}ms ease`;
            splashScreen.style.opacity = '0';

            setTimeout(() => {
                splashScreen.style.display = 'none';

                // guestMode(비회원으로 시작하기)를 선택한 사용자는 isLoggedIn이 계속 false라도
                // 새로고침할 때마다 로그인 화면으로 돌려보내지 않는다 — 그러면 "비회원으로
                // 시작하기"가 사실상 매번 다시 눌러야 하는 무의미한 버튼이 된다.
                if (!settings.isLoggedIn && !settings.guestMode) {
                    // 아직 로그인 전(로그인/회원가입 선택 화면으로 보내지는 상태)이다 — 이
                    // 시점의 로컬 백업 이력(lastBackupAt)은 항상 비어있으므로(브라우저에
                    // 저장된 적 없는 완전 신규 방문자 포함) getBackupNotificationItem()이
                    // 무조건 "백업이 필요하다"고 판단해, 계정도 없고 데이터도 하나 없는
                    // 사용자에게 로그인 화면이 뜨자마자 "데이터 백업을 권장합니다" 토스트가
                    // 뜨는 결함이 있었다(실제로 재현됨). 실제로 지킬 데이터가 있는 로그인/
                    // 비회원 사용자에게만 안내하도록, 로그인 화면으로 보낼 때는 이 안내를
                    // 건너뛴다.
                    showLocalLoginPage();
                } else {
                    // guestMode든 실제 로그인 계정이든 여기선 똑같이 메인 화면으로 보낸다.
                    // 예전엔 guestMode만 showMain(true)을 호출하고 로그인 계정 분기는
                    // updateOverdueNotification(true)만 불러서, 알림벨(#notificationBtn)이
                    // index.html에 style="display: none;"으로 시작하는데 showMain()이 그걸
                    // 'flex'로 되돌려주는 유일한 경로라 — 로그인 상태로 새로고침할 때마다
                    // 알림벨이 계속 숨어있다가 다른 화면을 한 번 갔다 와야만(그때 다른 경로로
                    // showMain이 불려서) 나타나는 버그가 있었다(실제로 재현해서 확인).
                    showMain(true);
                    updateOverdueNotification(true);
                }
            }, fadeMs);
        }, holdMs);
    })();
});

function handleLogin() {
    showLocalLoginPage();
}

function handleLogout() {
    showConfirmModal('로그아웃하시겠습니까? 기기에 저장된 기록은 유지됩니다.', () => {
        const settings = getUserSettings();
        settings.isLoggedIn = false;
        setUserSettings(settings);
        updateAccountRoleUI();
        showLocalLoginPage();
        if (typeof supabaseSignOutSafely === 'function') supabaseSignOutSafely();
    });
}

// 운행 일지 카드의 미수/수금 빠른 토글. payments 원장을 기준으로 동작하도록 맞춰서
// 미수금 관리 화면(부분입금 포함)과 상태가 어긋나지 않게 한다.
function toggleCallPaymentStatus(index) {
    if (index < 0 || !currentTempCallDetails[index]) return;

    const detail = currentTempCallDetails[index];
    const summary = getDetailPaymentSummary(detail);

    if (!Array.isArray(detail.payments)) detail.payments = [];

    if (summary.status === 'paid') {
        // 완전 취소: 이 카드에서 쌓인 입금 기록을 전부 초기화
        detail.payments = [];
    } else {
        // 빠른 전액 수금 처리: 남은 금액을 한 건의 결제로 등록
        const fare = parseCurrencyValue(detail.fare);
        const remaining = Math.max(fare - summary.paidAmount, 0);
        if (remaining > 0) {
            detail.payments.push({ id: generateLocalId('pay'), amount: remaining, paidAt: new Date().toISOString(), note: '' });
        }
    }
    syncDetailPaymentStatus(detail);

    // UI 즉시 업데이트
    renderCallDetailSummaryInMainModal();
    if (!document.getElementById('workModal').classList.contains('hidden')) {
        autoSaveWorkRecord();
    }
}

function openTodayWorkModal() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const dateKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
    openModal(dateKey, currentMonth, currentDay);
}

function getDetailPaymentSummary(detail) {
    const fare = parseCurrencyValue(detail?.fare);

    if (!Array.isArray(detail?.payments)) {
        const legacyPaid = (detail?.paymentStatus || '미수') !== '미수';
        return {
            paidAmount: legacyPaid ? fare : 0,
            remainingAmount: legacyPaid ? 0 : fare,
            status: legacyPaid ? 'paid' : 'unpaid' // 'unpaid' | 'partial' | 'paid'
        };
    }

    const paidAmount = detail.payments.reduce((sum, payment) => sum + (parseCurrencyValue(payment.amount) || 0), 0);
    const remainingAmount = Math.max(fare - paidAmount, 0);
    let status = 'unpaid';
    if (paidAmount > 0 && remainingAmount > 0) status = 'partial';
    else if (paidAmount > 0 && remainingAmount <= 0) status = 'paid';

    return { paidAmount, remainingAmount, status };
}

// payments 배열을 바꾼 뒤에는 항상 호출: 레거시 paymentStatus('미수'/'수금 완료') 필드를
// 새 상태와 계속 동기화해 다른 화면이 paymentStatus만 봐도 완료 여부가 어긋나지 않게 한다.
function syncDetailPaymentStatus(detail) {
    const summary = getDetailPaymentSummary(detail);
    detail.paymentStatus = summary.status === 'paid' ? '수금 완료' : '미수';
    return summary;
}

// (getReceivableItems, getOverdueReceivableItems → finance.js)

function getDdayText(paymentDueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(`${paymentDueDate}T00:00:00`);
    dueDate.setHours(0, 0, 0, 0);

    const difference = Math.round((dueDate - today) / 86400000);

    if (difference === 0) return 'D-Day';
    if (difference > 0) return `D-${difference}`;
    return `D+${Math.abs(difference)} 연체`;
}

// (renderReceivablesManagement부터 markMonthlyReceivablesPaid까지 → finance.js)

// ========== 돈 관련 화면(매출/미수금/세금계산서/기사 정산) ==========
// 세금계산서·미수금·월매출·기사 정산 관련 상태/함수는 전부 finance.js로 옮겼다
// (§코드 쪼개기 1·2차 — 테스트 저장소 한정). readWorkDataStorage만 여기 남겨뒀다 —
// 이 함수는 finance.js뿐 아니라 백업/정규화 스냅샷 같은 완전히 무관한 코드에서도
// 쓰이는 범용 유틸리티라서, finance.js로 옮기면 나중에 엉뚱한 파일에서 찾게 된다.

function readWorkDataStorage(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        return data && typeof data === 'object' ? data : {};
    } catch (error) {
        return {};
    }
}

// (getDriverCarWorkData, getMonthlyDriverTotals, calculateDriverVehicleCommission,
// getMonthlyFareRevenue → finance.js. getTaxInvoiceSourceGroups부터 exportTaxInvoiceCsv까지도
// 이미 finance.js에 있음 — §코드 쪼개기 1·2차)

