// ============================================================================
// 기사연동(driver_links) — 차주 쪽(기사 초대/할당/기록조회) + 기사 쪽(소속 연결) UI
// (코드 쪼개기 6차: script.js에서 분리)
// ============================================================================
// 이 화면들이 실제 서버 반영에 쓰는 함수(upsertDriverLinkOnSupabase 등)는 전부
// supabase-sync.js에 있고, 정산 합산에 쓰는 calculateDriverVehicleCommission/
// getMonthlyDriverTotals는 finance.js에 있다 — 함수 몸통 안에서만 참조하므로(런타임
// 호출, 파싱 시점 호출 아님) 파일 로드 순서는 상관없다. 반대 방향(supabase-sync.js가
// assignmentRangesOverlap()/applyEmployerAutoFilledInfo()를 부르는 것)은 이미
// typeof === 'function' 가드가 돼 있어 안전하다.
//
// isDateWithinAssignment()와 generateLocalId()는 이 도메인 소속처럼 보이지만
// script.js에 그대로 남겨뒀다: isDateWithinAssignment는 tests/core-logic.test.js가
// script.js를 통째로 읽어 검증하는 대상이라 옮기면 테스트가 깨지고, generateLocalId는
// 거래처/문의/노선/결제 등 이 도메인과 무관한 곳에서도 두루 쓰는 범용 ID 생성기다.
// ============================================================================

function renderLinkedDriverMenu() {
    const container = document.getElementById('linkedDriverMenuContainer');
    if (!container) return;
    container.innerHTML = '';
    const settings = getUserSettings();
    if (!isOwnerAccountType(settings.accountType)) return;

    (settings.driverLinks || [])
        .filter(link => link.status === 'linked')
        .forEach(link => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'dropdown-item linked-driver-menu-item';
            const shortNumber = getShortCarNum(link.vehicleNumber || '차량');
            button.title = `${link.driverName || '기사'} · ${link.vehicleNumber || '차량 미지정'} 기록 관리`;
            button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="7" r="4"></circle><path d="M2 21v-2a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v2"></path><path d="M17 11h5M19.5 8.5v5"></path></svg><span class="sub-car-menu-label">${escapeDetailText(shortNumber)} 관리</span>`;
            button.onclick = () => showLinkedDriverManagement(link.id);
            container.appendChild(button);
        });
}

function getAssignmentState(link) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = link.assignmentStart ? new Date(`${link.assignmentStart}T00:00:00`) : null;
    const end = link.assignmentEnd ? new Date(`${link.assignmentEnd}T23:59:59`) : null;
    if (start && start > today) return { key: 'scheduled', label: '할당 예정' };
    if (end && end < today) return { key: 'ended', label: '할당 종료' };
    return { key: 'active', label: '할당 중' };
}

// 같은 차량에 할당 기간이 겹치는 기사가 있는지 확인 (assignmentStart/End 중복 체크)
function assignmentRangesOverlap(startA, endA, startB, endB) {
    const aEnd = endA || '9999-12-31';
    const bEnd = endB || '9999-12-31';
    return startA <= bEnd && startB <= aEnd;
}

function findOverlappingDriverLink(links, vehicleNumber, start, end, excludeId) {
    if (!vehicleNumber || !start) return null;
    return (links || []).find(link => {
        if (excludeId && link.id === excludeId) return false;
        if (link.status === 'disconnected') return false;
        if ((link.vehicleNumber || '') !== vehicleNumber) return false;
        if (!link.assignmentStart) return false;
        return assignmentRangesOverlap(start, end, link.assignmentStart, link.assignmentEnd || '');
    });
}


function generateDriverInviteCode(targetInputId = 'linkedDriverInviteCode') {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const input = document.getElementById(targetInputId);
    if (input) input.value = code;
}

// 기사 연동 초대코드를 기사 연락처로 문자 발송한다("기사 연동 관리" 화면과 차량등록의 2차
// 기사연동 모달 양쪽에서 재사용). 실제 발송은 서버 SMS API가 아니라 기기의 문자 앱을
// sms: 스킴으로 열어주는 방식이라 별도 발송 인프라/RLS가 필요 없다.
function sendDriverInviteSms(source = 'management') {
    const isManagement = source === 'management';
    const name = isManagement
        ? document.getElementById('linkedDriverName')?.value.trim()
        : document.getElementById('carInviteDriverName')?.value.trim();
    const phone = isManagement
        ? document.getElementById('linkedDriverPhone')?.value.trim()
        : document.getElementById('carInvitePhone')?.value.trim();
    const code = isManagement
        ? document.getElementById('linkedDriverInviteCode')?.value.trim()
        : document.getElementById('carInviteCode')?.value.trim();
    const vehicle = isManagement
        ? document.getElementById('linkedDriverVehicle')?.value.trim()
        : document.getElementById('carInviteVehicleNumber')?.value.trim();

    if (!phone || phone.replace(/\D/g, '').length < 10) {
        showToastMessage('기사 전화번호를 먼저 올바르게 입력해 주세요.');
        return;
    }
    if (!code || !/^\d{6}$/.test(code)) {
        showToastMessage('6자리 초대 코드를 먼저 생성해 주세요.');
        return;
    }

    const settings = getUserSettings();
    const ownerDisplayName = settings.bizName || settings.userName || '운송사';
    const message = `[운행일지] 안녕하세요, ${ownerDisplayName}입니다.${name ? ` ${name}기사님,` : ''}\n${vehicle ? `[${vehicle}] 차량 ` : ''}소속 기사 연동 초대 코드입니다.\n\n▶ 초대 코드: ${code}\n\n운행일지 앱 실행 후 [마이페이지 > 소속 연결]에서 위 코드를 입력해 주세요.`;

    const separator = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?';
    window.location.href = `sms:${phone}${separator}body=${encodeURIComponent(message)}`;
}

// "할당 차량" 자동완성 목록. 두 종류를 제외한다:
// 1) 메인 차량 — 메인 차량은 차주 본인 차량이라 애초에 기사에게 할당할 대상이 아니다.
// 2) 지금 이 순간 다른 기사에게 이미(할당 종료일이 없거나 아직 안 지난) 활성 할당돼 있는
//    기사차량 — 겹치는 기간으로 저장하면 performSaveLinkedDriverInvitation()의 겹침 검사에서
//    어차피 막히지만, 애초에 자동완성에 후보로 뜨지 않는 편이 헷갈리지 않는다. 지금 수정
//    중인 초대 자신의 차량은 계속 후보에 남아야 하므로 제외 대상에서 뺀다.
function populateLinkedDriverVehicleOptions() {
    const datalist = document.getElementById('linkedDriverVehicleOptions');
    if (!datalist) return;
    const settings = getUserSettings();
    const cars = settings.cars || [];
    const links = Array.isArray(settings.driverLinks) ? settings.driverLinks : [];
    const editingId = document.getElementById('linkedDriverEditId')?.value || '';
    const today = getTodayDateKey();

    const activelyAssignedNumbers = new Set(
        links
            .filter(link => link.id !== editingId && link.status !== 'disconnected' && link.vehicleNumber && (!link.assignmentEnd || link.assignmentEnd >= today))
            .map(link => link.vehicleNumber)
    );

    datalist.innerHTML = cars
        .filter(car => car.number && car.type !== 'main' && !activelyAssignedNumbers.has(car.number))
        .map(car => `<option value="${escapeDetailText(car.number)}"></option>`)
        .join('');
}

function showDriverConnectionManagement(returnPage = 'main') {
    const settings = getUserSettings();
    if (!isOwnerAccountType(settings.accountType)) {
        // 소속 기사 계정은 이 화면(차주 전용 초대 관리)을 쓸 수 없다 — 경고 모달로 막고 끝내는
        // 대신, 본인이 차주와 연동된 상태를 그대로 볼 수 있는 개인정보 페이지의 "소속 연결"
        // 카드로 데려간다. 이 함수를 부른 곳이 알려준 returnPage를 그대로 넘겨야
        // goBackFromPersonalInfo()가 원래 있던 화면(마이페이지 등)으로 정확히 되돌아간다 —
        // personalInfoReturnPage(이전에 개인정보 화면에 마지막으로 들어왔을 때 남은 값)를
        // 그대로 쓰면, 마이페이지에서 들어왔는데 엉뚱한 화면으로 튕겨 나갈 수 있었다.
        showPersonalInfo(returnPage);
        requestAnimationFrame(() => {
            document.getElementById('employedDriverLinkCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return;
    }
    driverConnectionReturnPage = ['personal', 'car', 'myPage'].includes(returnPage) ? returnPage : 'main';
    hideAllPages();
    document.getElementById('driverConnectionManagementPage').classList.remove('hidden');
    populateLinkedDriverVehicleOptions();
    renderLinkedDriverList();
    // 새 초대 작성 상태로 처음 들어왔다면(수정 중이 아니고 폼이 비어 있으면), 차량 관리에
    // 이미 등록해 둔 기사차량 정보를 기본값으로 채워 같은 정보를 두 번 입력하지 않게 한다.
    initializeLinkedDriverInvitationForm();
    setActiveNav(['personal', 'myPage'].includes(driverConnectionReturnPage) ? 'personal' : 'main');

    // 서버 기준 최신 연동 상태로 갱신한다 — 특히 기사가 그동안 코드를 입력해서 연결을
    // 완료했는지는 오직 서버 조회로만 알 수 있다. 화면을 막지 않도록 기다리지 않고
    // 백그라운드로 돌리고, 끝나면(그리고 아직 이 화면이 보이는 중이면) 다시 그린다.
    if (typeof syncDriverLinksFromSupabase === 'function') {
        syncDriverLinksFromSupabase().then(() => {
            if (!document.getElementById('driverConnectionManagementPage')?.classList.contains('hidden')) {
                renderLinkedDriverList();
            }
        });
    }
}

function goBackFromDriverConnectionManagement() {
    if (driverConnectionReturnPage === 'personal') showPersonalInfo(personalInfoReturnPage);
    else if (driverConnectionReturnPage === 'car') showCarManagement();
    else if (driverConnectionReturnPage === 'myPage') showMyPage();
    else showMain();
}

function returnToDriverConnectionManagement() {
    showDriverConnectionManagement(driverConnectionReturnPage);
}

function resetLinkedDriverForm() {
    ['linkedDriverEditId', 'linkedDriverName', 'linkedDriverPhone', 'linkedDriverInviteCode', 'linkedDriverVehicle', 'linkedDriverAssignmentStart', 'linkedDriverAssignmentEnd']
        .forEach(id => { const input = document.getElementById(id); if (input) input.value = ''; });
    const saveButton = document.getElementById('linkedDriverSaveBtn');
    if (saveButton) saveButton.textContent = '초대 저장';
    generateDriverInviteCode();
    // 폼을 완전히 비웠으니 자동입력 추적 상태도 초기화하고, 새 초대 기준으로 다시 채운다
    // (기사차량이 1대뿐이면 그 차량 정보로, 여러 대면 차주가 직접 고를 때까지 비워 둔다).
    linkedDriverFormAutoFilledVehicle = null;
    initializeLinkedDriverInvitationForm();
    // linkedDriverEditId를 방금 비웠으니 "할당 차량" 자동완성도 새 초대 기준으로 다시 계산한다
    // — 그러지 않으면 방금까지 수정 중이던 초대의 차량 제외 예외가 계속 남아있게 된다.
    populateLinkedDriverVehicleOptions();
}

// ---------- 차량 관리 ↔ 기사연동 기사 기본정보 자동입력 ----------
// 목적: 차주가 "차량 관리 → 기사차량 등록"에서 이미 입력한 기사명/연락처를 "기사연동 관리"
// 화면에서 다시 입력하지 않아도 되게 한다. Supabase/초대코드/RLS 등 기존 연동 로직은
// 전혀 건드리지 않고, settings.cars에 이미 있는 값을 폼 기본값으로 재사용하기만 한다.

// 기사차량(sub)에 저장된 기사 기본정보(이름/연락처)를 우선순위에 따라 뽑아낸다.
// 차량 관리 모달이 최신 필드(car.driverName/driverPhone)에 저장하므로 그것을 우선 쓰고,
// 레거시 데이터 호환을 위해 없으면 car.personalInfo?.driverName/phone까지 폴백한다.
// 둘 다 없으면 빈 값을 그대로 반환한다(임의로 값을 만들어내지 않음).
function getDriverInfoFromCar(car) {
    if (!car) return { driverName: '', driverPhone: '' };
    return {
        driverName: car.driverName || car.personalInfo?.driverName || '',
        driverPhone: car.driverPhone || car.personalInfo?.phone || ''
    };
}

// 마지막으로 자동입력의 기준이 됐던 차량번호. 같은 차량번호에 대해 자동입력을 반복
// 실행하지 않기 위해 기억해 둔다 — 차주가 이름/연락처를 직접 고친 뒤 다른 필드를
// 입력하는 것만으로 다시 원래 값으로 되돌아가는 일이 없게 하기 위함(할당 차량이 실제로
// "바뀔 때"만 다시 채운다).
let linkedDriverFormAutoFilledVehicle = null;

// 할당 차량 입력값(vehicleNumber)이 등록된 기사차량(sub) 번호와 정확히 일치할 때만 그
// 차량의 기사 이름/연락처로 입력란을 채운다. 일치하는 차량이 없으면(입력이 아직 덜
// 끝났거나 등록되지 않은 번호) 아무것도 하지 않는다. options.force가 없으면 직전과
// 같은 차량번호에 대해서는 다시 실행하지 않는다.
function prefillLinkedDriverFromVehicle(vehicleNumber, options = {}) {
    const { force = false } = options;
    if (!vehicleNumber) return false;
    if (!force && linkedDriverFormAutoFilledVehicle === vehicleNumber) return false;

    const settings = getUserSettings();
    const car = (settings.cars || []).find(item => item.type === 'sub' && item.number === vehicleNumber);
    if (!car) return false;

    const info = getDriverInfoFromCar(car);
    const nameInput = document.getElementById('linkedDriverName');
    const phoneInput = document.getElementById('linkedDriverPhone');
    if (nameInput) nameInput.value = info.driverName;
    if (phoneInput) phoneInput.value = info.driverPhone;
    linkedDriverFormAutoFilledVehicle = vehicleNumber;
    return true;
}

// "할당 차량" 입력란(oninput)에서 호출된다. 기존 초대를 수정하는 중(linkedDriverEditId가
// 있음)이면 절대 자동입력하지 않는다 — 자동입력은 "새 초대 작성" 상태에서만 동작해야
// 기존 초대에 저장된 값을 실수로 덮어쓰지 않는다.
function handleLinkedDriverVehicleInput(input) {
    clearFieldError(input);
    const editingId = document.getElementById('linkedDriverEditId')?.value || '';
    if (editingId) return;
    prefillLinkedDriverFromVehicle(input.value.trim());
}

// 기사연동 화면에 "새 초대 작성" 상태로 진입했을 때 실행한다(showDriverConnectionManagement
// 진입 시, resetLinkedDriverForm 실행 시). 이미 수정 중이거나 폼에 뭔가 입력돼 있으면
// 아무것도 하지 않는다. 등록된 기사차량(sub)이 정확히 1대뿐이면 그 차량 정보로 할당
// 차량/이름/연락처를 미리 채워 준다 — 2대 이상이면 어떤 차량인지 임의로 추측하지 않고
// 비워 둔 채로 차주가 직접 고르게 한다(고르는 순간은 handleLinkedDriverVehicleInput이 처리).
function initializeLinkedDriverInvitationForm() {
    const editingId = document.getElementById('linkedDriverEditId')?.value || '';
    if (editingId) return; // 기존 초대 수정 중이면 절대 손대지 않는다.

    const nameInput = document.getElementById('linkedDriverName');
    const phoneInput = document.getElementById('linkedDriverPhone');
    const vehicleInput = document.getElementById('linkedDriverVehicle');
    const inviteCodeInput = document.getElementById('linkedDriverInviteCode');
    if ((nameInput?.value || '') || (phoneInput?.value || '') || (vehicleInput?.value || '')) return;

    // 새 초대 폼이 비어 있는 상태라면 "새로 입력" 버튼과 동일하게 초대 코드부터 준비해 둔다
    // (기존 코드 생성 방식(generateDriverInviteCode)을 그대로 재사용 — 새로 만들지 않음).
    if (inviteCodeInput && !inviteCodeInput.value && typeof generateDriverInviteCode === 'function') {
        generateDriverInviteCode();
    }

    const subCars = (getUserSettings().cars || []).filter(car => car.type === 'sub' && car.number);
    if (subCars.length !== 1) return; // 0대 또는 2대 이상이면 어떤 차량인지 임의로 채우지 않는다.

    const car = subCars[0];
    if (vehicleInput) vehicleInput.value = car.number;
    prefillLinkedDriverFromVehicle(car.number, { force: true });
}

// 초대 저장은 실제로 Supabase에 반영돼야만 의미가 있다(기사가 이 코드로 찾는 대상 자체가
// 그 행이므로) — 그래서 로컬-먼저-저장이 아니라 Supabase 저장을 반드시 기다린 뒤에만 로컬
// driverLinks에 반영한다. 실패하면 로컬은 건드리지 않고 에러를 그대로 던져서(runSaveAction이
// 재시도 모달을 보여줌) 사용자가 "초대는 했는데 실제로는 안 만들어진" 상태를 겪지 않게 한다.
// 기사 초대 저장의 실제 처리(중복 확인 → driver_links upsert → 로컬 driverLinks/차량 반영)만
// 담당하는 공용 함수다. "기사 연동 관리" 화면의 초대 폼(saveLinkedDriverInvitation)과, 차량
// 등록 모달의 2차 기사연동 모달(saveCarDriverInvitation) 양쪽에서 이 함수 하나를 그대로
// 재사용한다 — 기사연동 시스템을 하나 더 만들지 않기 위함. 형식 검증(빈 값/6자리 코드 등)은
// 호출부가 각자의 입력 필드를 대상으로 먼저 하고, 여기서는 그 이후의 공통 로직만 담당한다.
// 실패하면 toast로 이유를 보여준 뒤 null을 반환한다(예외를 던지지 않음).
async function performSaveLinkedDriverInvitation({ name, phone, inviteCode, vehicleNumber, assignmentStart, assignmentEnd, editId }) {
    const settings = getUserSettings();
    const links = Array.isArray(settings.driverLinks) ? settings.driverLinks : [];
    const editing = editId ? links.find(link => link.id === editId) : null;

    // 메인 차량(차주 본인 차량)은 기사에게 할당할 수 없다. populateLinkedDriverVehicleOptions()가
    // 자동완성 목록에서 이미 빼두지만, <input list="...">는 자동완성일 뿐 자유 입력을 막지
    // 않으므로(직접 타이핑하면 그대로 통과된다) 실제 저장 시점에도 반드시 한 번 더 막는다.
    const targetCar = (settings.cars || []).find(item => item.number === vehicleNumber);
    if (targetCar?.type === 'main') {
        showToastMessage('메인 차량은 기사에게 할당할 수 없습니다. 기사차량 번호를 입력해 주세요.');
        return null;
    }

    const conflictingLink = findOverlappingDriverLink(links, vehicleNumber, assignmentStart, assignmentEnd, editId);
    if (conflictingLink) {
        showToastMessage(`같은 차량에 ${conflictingLink.driverName || '다른 기사'}의 할당 기간(${conflictingLink.assignmentStart}~${conflictingLink.assignmentEnd || '계속'})과 겹칩니다.`);
        return null;
    }

    const car = (settings.cars || []).find(item => item.number === vehicleNumber);
    if (!car?.supabaseId) {
        showToastMessage('선택한 차량이 아직 클라우드에 동기화되지 않았습니다. 잠시 후 다시 시도해 주세요.');
        return null;
    }

    let serverConflict;
    try {
        // 로컬 캐시뿐 아니라 서버 기준으로도 한 번 더 겹치는 할당이 있는지 확인한다(다른
        // 기기에서 만든 초대까지 포함해서).
        serverConflict = await findOverlappingDriverLinkOnSupabase(car.supabaseId, assignmentStart, assignmentEnd, editing?.supabaseId);
    } catch (error) {
        console.error('기사 연동 중복 확인 실패:', error);
        showToastMessage('사장님 연결에 실패했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
        return null;
    }
    if (serverConflict) {
        showToastMessage('같은 차량에 이미 겹치는 기간으로 연결되어 있거나 초대된 기록이 있습니다.');
        return null;
    }

    let savedRow;
    try {
        savedRow = await upsertDriverLinkOnSupabase({
            supabaseId: editing?.supabaseId || null,
            vehicleId: car.supabaseId,
            inviteCode,
            assignmentStart,
            assignmentEnd
        });
    } catch (error) {
        console.error('기사 초대 저장 실패:', error);
        showToastMessage(typeof getDriverLinkErrorMessage === 'function' ? getDriverLinkErrorMessage(error) : '초대 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        return null;
    }

    const nextLink = {
        ...(editing || {}),
        id: editing?.id || generateLocalId('driver'),
        supabaseId: savedRow.id,
        driverName: name,
        phone,
        inviteCode: savedRow.invite_code,
        vehicleId: savedRow.vehicle_id,
        vehicleNumber,
        assignmentStart: savedRow.assignment_start,
        assignmentEnd: savedRow.assignment_end,
        status: savedRow.status,
        linkedAt: savedRow.linked_at,
        updatedAt: savedRow.updated_at,
        createdAt: editing?.createdAt || savedRow.created_at
    };

    const existingIndex = links.findIndex(link => link.id === nextLink.id);
    const isNew = existingIndex < 0;
    if (existingIndex >= 0) links[existingIndex] = nextLink;
    else links.push(nextLink);
    settings.driverLinks = links;
    const assignedCar = (settings.cars || []).find(item => item.number === nextLink.vehicleNumber);
    if (assignedCar) {
        assignedCar.driverName = nextLink.driverName;
        assignedCar.driverPhone = nextLink.phone;
    }
    setUserSettings(settings);
    renderSubCarMenu();
    updateAccountRoleUI();
    showToastMessage(isNew ? '기사 초대를 저장했습니다.' : '기사 할당 정보를 수정했습니다.');
    return nextLink;
}

async function saveLinkedDriverInvitation() {
    const name = document.getElementById('linkedDriverName')?.value.trim() || '';
    const phone = document.getElementById('linkedDriverPhone')?.value.trim() || '';
    const inviteCode = document.getElementById('linkedDriverInviteCode')?.value.trim() || '';
    const vehicleNumber = document.getElementById('linkedDriverVehicle')?.value.trim() || '';
    const assignmentStart = document.getElementById('linkedDriverAssignmentStart')?.value || '';
    const assignmentEnd = document.getElementById('linkedDriverAssignmentEnd')?.value || '';
    const editId = document.getElementById('linkedDriverEditId')?.value || '';

    if (!name || !vehicleNumber || !assignmentStart) {
        if (!name) markFieldError('linkedDriverName');
        if (!vehicleNumber) markFieldError('linkedDriverVehicle');
        if (!assignmentStart) markFieldError('linkedDriverAssignmentStart');
        showToastMessage('기사 이름, 할당 차량, 시작일을 입력해 주세요.');
        return;
    }
    if (!/^\d{6}$/.test(inviteCode)) {
        markFieldError('linkedDriverInviteCode');
        showToastMessage('"코드 생성" 버튼으로 6자리 초대 코드를 만들어 주세요.');
        return;
    }
    if (assignmentEnd && assignmentEnd < assignmentStart) {
        showToastMessage('할당 종료일은 시작일 이후로 선택해 주세요.');
        return;
    }

    const link = await performSaveLinkedDriverInvitation({ name, phone, inviteCode, vehicleNumber, assignmentStart, assignmentEnd, editId });
    if (!link) return; // 실패 이유는 이미 toast로 표시됨

    resetLinkedDriverForm();
    renderLinkedDriverList();
}

function getLinkedDriverById(id) {
    return (getUserSettings().driverLinks || []).find(link => link.id === id) || null;
}

function editLinkedDriver(encodedId) {
    const link = getLinkedDriverById(decodeURIComponent(encodedId));
    if (!link) return;
    document.getElementById('linkedDriverEditId').value = link.id;
    document.getElementById('linkedDriverName').value = link.driverName || '';
    document.getElementById('linkedDriverPhone').value = link.phone || '';
    document.getElementById('linkedDriverInviteCode').value = link.inviteCode || '';
    document.getElementById('linkedDriverVehicle').value = link.vehicleNumber || '';
    document.getElementById('linkedDriverAssignmentStart').value = link.assignmentStart || '';
    document.getElementById('linkedDriverAssignmentEnd').value = link.assignmentEnd || '';
    document.getElementById('linkedDriverSaveBtn').textContent = link.status === 'linked' ? '할당 정보 저장' : '초대 수정';
    // linkedDriverEditId가 방금 이 초대의 id로 바뀌었으니, "할당 차량" 자동완성도 다시
    // 계산한다 — 안 그러면 이 초대 자신의 차량이 "이미 다른 초대에 활성 할당됨"으로 오인돼
    // 자동완성 목록에서 빠져 있는 상태로 남는다.
    populateLinkedDriverVehicleOptions();
    document.querySelector('.driver-invite-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 상태 변경(해제/재초대 등)은 초대 생성과 달리 되돌릴 수 있고 급하지 않은 작업이라
// 다른 저장 로직처럼 로컬을 먼저 반영하고 Supabase 반영은 백그라운드(best-effort)로 돌린다.
function updateLinkedDriverStatus(id, status, message) {
    const settings = getUserSettings();
    const link = (settings.driverLinks || []).find(item => item.id === id);
    if (!link) return;
    link.status = status;
    link.updatedAt = new Date().toISOString();
    if (status === 'linked') link.linkedAt = new Date().toISOString();
    setUserSettings(settings);
    renderLinkedDriverList();
    renderSubCarMenu();
    updateAccountRoleUI();
    if (message) showToastMessage(message);

    if (link.supabaseId && typeof updateDriverLinkStatusOnSupabase === 'function') {
        updateDriverLinkStatusOnSupabase(link.supabaseId, status).catch(error => {
            console.error('기사 연동 상태 서버 반영 실패:', error);
        });
    }
}

// "연결 완료"는 더 이상 차주가 스스로 누르는 버튼이 아니다(실제 연결은 기사가 코드를
// 입력해야만 서버에서 일어난다). 이 버튼은 그 대신 서버 상태를 다시 확인해서 반영한다.
async function refreshLinkedDriverConnection(encodedId) {
    if (typeof syncDriverLinksFromSupabase === 'function') {
        await syncDriverLinksFromSupabase();
    }
    renderLinkedDriverList();
    renderSubCarMenu();
    updateAccountRoleUI();
    const link = getLinkedDriverById(decodeURIComponent(encodedId));
    if (link?.status === 'linked') showToastMessage('기사와 연결이 확인되었습니다.');
    else showToastMessage('아직 기사가 초대 코드를 입력하지 않았습니다.');
}

function disconnectLinkedDriver(encodedId) {
    const id = decodeURIComponent(encodedId);
    showConfirmModal('기사 연동을 해제하시겠습니까? 기존 기록은 삭제되지 않습니다.', () => {
        updateLinkedDriverStatus(id, 'disconnected', '기사 연동을 해제했습니다.');
    });
}

function renewLinkedDriverInvitation(encodedId) {
    updateLinkedDriverStatus(decodeURIComponent(encodedId), 'pending', '기사 초대를 다시 열었습니다.');
}

function deleteLinkedDriver(encodedId) {
    const id = decodeURIComponent(encodedId);
    showConfirmModal('해제된 기사 연결 항목을 목록에서 삭제하시겠습니까?', () => {
        const settings = getUserSettings();
        const link = (settings.driverLinks || []).find(item => item.id === id);
        settings.driverLinks = (settings.driverLinks || []).filter(item => item.id !== id);
        setUserSettings(settings);
        renderLinkedDriverList();
        renderSubCarMenu();
        updateAccountRoleUI();
        showToastMessage('기사 연결 항목을 삭제했습니다.');

        if (link?.supabaseId && typeof deleteDriverLinkOnSupabase === 'function') {
            deleteDriverLinkOnSupabase(link.supabaseId).catch(error => {
                console.error('기사 연동 삭제 서버 반영 실패:', error);
            });
        }
    });
}

function renderLinkedDriverList() {
    const settings = getUserSettings();
    const links = Array.isArray(settings.driverLinks) ? settings.driverLinks : [];
    const list = document.getElementById('linkedDriverList');
    if (!list) return;
    const activeCount = links.filter(link => link.status === 'linked').length;
    const pendingCount = links.filter(link => link.status === 'pending').length;
    document.getElementById('linkedDriverActiveCount').textContent = activeCount;
    document.getElementById('linkedDriverPendingCount').textContent = pendingCount;

    if (!links.length) {
        list.innerHTML = '<div class="linked-driver-empty">연결된 기사가 없습니다.<br>위에서 기사 초대와 차량 할당을 등록해 주세요.</div>';
        return;
    }

    list.innerHTML = links.map(link => {
        const encodedId = encodeURIComponent(link.id);
        const statusLabel = link.status === 'linked' ? '연동 중' : link.status === 'pending' ? '초대 대기' : '연동 해제';
        const assignment = getAssignmentState(link);
        const period = `${link.assignmentStart || '-'} ~ ${link.assignmentEnd || '계속'}`;
        const connection = [link.phone, link.inviteCode ? `코드 ${link.inviteCode}` : ''].filter(Boolean).join(' · ');
        let actions = '';
        if (link.status === 'pending') {
            actions = `<button type="button" class="primary" onclick="runSaveAction(this, 'driver-refresh-${encodedId}', () => refreshLinkedDriverConnection('${encodedId}'))">연결 상태 확인</button><button type="button" onclick="editLinkedDriver('${encodedId}')">초대 수정</button><button type="button" class="danger" onclick="disconnectLinkedDriver('${encodedId}')">초대 취소</button>`;
        } else if (link.status === 'linked') {
            actions = `<button type="button" class="primary" onclick="showLinkedDriverManagement('${encodedId}', true)">기록 조회</button><button type="button" onclick="editLinkedDriver('${encodedId}')">할당 변경</button><button type="button" class="danger" onclick="disconnectLinkedDriver('${encodedId}')">연동 해제</button>`;
        } else {
            actions = `<button type="button" onclick="renewLinkedDriverInvitation('${encodedId}')">다시 초대</button><button type="button" onclick="editLinkedDriver('${encodedId}')">정보 수정</button><button type="button" class="danger" onclick="deleteLinkedDriver('${encodedId}')">삭제</button>`;
        }
        return `<article class="linked-driver-card"><div class="linked-driver-card-head"><div><strong>${escapeDetailText(link.driverName || '기사')}</strong><span>${escapeDetailText(connection || '연결 정보 없음')}</span></div><em class="${link.status}">${statusLabel}</em></div><div class="linked-driver-assignment"><span><small>할당 차량</small><b>${escapeDetailText(link.vehicleNumber || '-')}</b></span><span><small>할당 기간</small><b>${escapeDetailText(period)}</b></span></div><div class="linked-driver-state ${assignment.key}">${assignment.label}</div><div class="linked-driver-card-actions">${actions}</div></article>`;
    }).join('');
}

function getLinkedRecordSummary(record) {
    const details = Array.isArray(record?.callDetails) ? record.callDetails : [];
    const fixedCount = Number(record?.fixedCount || record?.count || 0);
    const detailFare = details.reduce((sum, item) => sum + parseCurrencyValue(item?.fare), 0);
    const directFare = parseCurrencyValue(record?.fare || record?.fixedFare || record?.totalFare);
    const count = fixedCount + details.length || (record && Object.keys(record).length ? 1 : 0);
    return { details, count, fare: detailFare + directFare };
}

// ---------- 기사 정산 상세 / 거래처별 세금계산서 (차주가 연동 기사 화면에서 보는 것) ----------
// 핵심 원칙: "기사 정산"(차주가 기사에게 지급할 금액)과 "거래처별 세금계산서"(기사가 실제
// 운송한 거래처 매출)는 서로 다른 업무이지만, 반드시 같은 원본 데이터(연동 기사의 실제
// daily_logs/transport_details, fetchLinkedDriverRecordData가 이미 가져온 data)에서 파생돼야
// 한다 — 그래야 "정산 상세 합계 = 총 운송료", "거래처별 합계 합 = 총 운송료(고정노선 제외)"가
// 항상 성립한다. 두 함수 모두 같은 data를 입력받아 서로 다른 관점으로만 가공한다.

// 연동 기사의 월간 운행 기록(data)을 건별로 펼친다. "콜상세"(callDetails)는 거래처/상차지/
// 하차지가 있는 개별 운송 건이고, "고정노선"(fixedCount/fixedFare)은 그런 세부 항목이 없는
// 월정액성 운행이라 거래처별로 쪼갤 수 없다 — 없는 정보를 임의로 만들지 않고 type:'fixed'로
// 구분해서 그대로 보여준다(운송 상세내역 합계가 기사 정산 총액과 반드시 같아야 하므로 누락
// 없이 전부 포함한다).
function flattenLinkedDriverTrips(data, monthKey, link) {
    const trips = [];
    Object.entries(data || {}).forEach(([dateKey, record]) => {
        if (!dateKey.startsWith(monthKey) || !record || typeof record !== 'object' || record.isOff) return;
        if (!isDateWithinAssignment(dateKey, link?.assignmentStart, link?.assignmentEnd)) return;

        (Array.isArray(record.callDetails) ? record.callDetails : []).forEach(detail => {
            const workDate = detail.workDate || dateKey;
            if (!workDate.startsWith(monthKey) || !isDateWithinAssignment(workDate, link?.assignmentStart, link?.assignmentEnd)) return;
            trips.push({
                type: 'call',
                dateKey: workDate,
                client: (detail.client || '').trim(),
                loadLoc: detail.loadLoc || '',
                unloadLoc: detail.unloadLoc || '',
                fare: parseCurrencyValue(detail.fare),
                vatExempt: !!detail.vatExempt,
                platform: detail.platform || '',
                distanceKm: detail.distanceKm || '',
                cargoTonnage: detail.cargoTonnage || '',
                paymentDueDate: detail.paymentDueDate || '',
                remarks: detail.remarks || ''
            });
        });

        const fixedCount = Number(record.fixedCount || record.count || 0);
        const fixedFare = parseCurrencyValue(record.fare || record.fixedFare || record.totalFare);
        if (fixedCount > 0 || fixedFare > 0) {
            trips.push({ type: 'fixed', dateKey, client: '', loadLoc: '', unloadLoc: '', fare: fixedFare, vatExempt: false, fixedCount });
        }
    });
    return trips.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

// 기사 정산(§A) 계산 — 기존 getMonthlyDriverTotals/calculateDriverVehicleCommission을 그대로
// 재사용한다(새 계산식을 따로 만들지 않음). trips는 위 flattenLinkedDriverTrips의 결과를 그대로
// 붙여서, "이 총액이 왜 이 금액인지" 검증할 수 있는 근거 목록으로 함께 반환한다.
function getLinkedDriverSettlementDetail(data, monthKey, link, car) {
    const totals = getMonthlyDriverTotals(data, monthKey, link);
    const commissionAmount = calculateDriverVehicleCommission(car, totals.grossAmount, totals.count);
    const insuranceAmount = car?.insuranceOn ? totals.insuranceAmount : 0;
    const finalAmount = Math.max(0, totals.grossAmount - commissionAmount - insuranceAmount);
    const trips = flattenLinkedDriverTrips(data, monthKey, link);
    return {
        totalFare: totals.grossAmount,
        tripCount: totals.count,
        commissionAmount,
        insuranceAmount,
        finalAmount,
        trips,
        tripsFareSum: trips.reduce((sum, t) => sum + t.fare, 0)
    };
}

// 거래처별 세금계산서(§B) 집계 — "콜상세" 운송 건만 대상이다(거래처가 있어야 계산서를 만들
// 수 있으므로). 거래처가 비어있는 건은 계산서 대상에 넣지 않고 별도로 카운트만 한다(§18 —
// "미지정 거래처"를 임의로 계산서 대상으로 만들지 않음). 공급자는 이 차량의 사업자정보
// (getCarBusinessInfo — "내 사업자와 동일"이면 차주 기본 사업자)를 그대로 재사용한다.
function getLinkedDriverClientInvoiceGroups(trips, car, ownerSettings) {
    const supplier = getVehicleSupplierIdentity(car, ownerSettings);
    const grouped = {};
    let unassignedCount = 0;
    trips.filter(t => t.type === 'call').forEach(trip => {
        if (!trip.client) { unassignedCount += 1; return; }
        if (trip.fare <= 0) return;
        const key = trip.client;
        if (!grouped[key]) grouped[key] = { clientName: trip.client, count: 0, supplyAmount: 0, taxAmount: 0, trips: [] };
        grouped[key].count += 1;
        grouped[key].supplyAmount += trip.fare;
        grouped[key].taxAmount += trip.vatExempt ? 0 : Math.round(trip.fare * .1);
        grouped[key].trips.push(trip);
    });
    const groups = Object.values(grouped).map(g => ({ ...g, totalAmount: g.supplyAmount + g.taxAmount, supplierBiz: supplier.biz, vehicleLabel: supplier.carLabel }));
    return { groups, unassignedCount };
}

function showLinkedDriverManagement(id, encoded = false) {
    const linkId = encoded ? decodeURIComponent(id) : id;
    const link = getLinkedDriverById(linkId);
    if (!link || link.status !== 'linked') {
        showToastMessage('연동 중인 기사 정보를 찾을 수 없습니다.');
        return;
    }
    activeLinkedDriverId = link.id;
    linkedDriverTripDetailOpen = false;
    hideAllPages();
    document.getElementById('linkedDriverManagementPage').classList.remove('hidden');
    document.getElementById('linkedDriverManagementTitle').textContent = `${getShortCarNum(link.vehicleNumber)} 관리`;
    const assignment = getAssignmentState(link);
    document.getElementById('linkedDriverProfileCard').innerHTML = `<div><span class="linked-driver-avatar">${escapeDetailText((link.driverName || '기').slice(0, 1))}</span><span><strong>${escapeDetailText(link.driverName || '기사')}</strong><small>${escapeDetailText(link.phone || '연락처 없음')}</small></span></div><div><span>${escapeDetailText(link.vehicleNumber || '차량 미지정')}</span><em class="${assignment.key}">${assignment.label}</em></div>`;
    const monthInput = document.getElementById('linkedDriverRecordMonth');
    if (monthInput && !monthInput.value) {
        const now = new Date();
        monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    renderLinkedDriverRecords();
    setActiveNav('main');

    // 거래처 세금계산서 공유 권한은 기사가 언제든 켜고 끌 수 있으므로, 화면에 들어올 때마다
    // 서버 기준으로 다시 확인한다(§21 — 다음 화면 진입/새로고침 시 즉시 반영).
    if (typeof syncDriverLinksFromSupabase === 'function') {
        syncDriverLinksFromSupabase().then(() => {
            if (activeLinkedDriverId === link.id && !document.getElementById('linkedDriverManagementPage')?.classList.contains('hidden')) {
                renderLinkedDriverRecords();
            }
        });
    }
}

// "운송 상세내역 보기" 펼침 상태(§2) — 기사 정산 총액의 근거 목록을 기본은 접어 두고,
// 필요할 때만 펼쳐서 본다.
let linkedDriverTripDetailOpen = false;
function toggleLinkedDriverTripDetail() {
    linkedDriverTripDetailOpen = !linkedDriverTripDetailOpen;
    document.getElementById('linkedDriverRecordList')?.classList.toggle('hidden', !linkedDriverTripDetailOpen);
    const btn = document.getElementById('linkedDriverTripDetailToggleBtn');
    if (btn) btn.textContent = linkedDriverTripDetailOpen ? '운송 상세내역 접기' : '운송 상세내역 보기';
}

// 거래처 카드 펼침/접힘(§16) — 카드마다 독립적으로 상세 운송 건을 열어볼 수 있다.
let linkedDriverOpenClientKeys = new Set();
function toggleLinkedDriverClientDetail(encodedKey) {
    const key = decodeURIComponent(encodedKey);
    if (linkedDriverOpenClientKeys.has(key)) linkedDriverOpenClientKeys.delete(key);
    else linkedDriverOpenClientKeys.add(key);
    document.getElementById(`linkedClientTrips_${encodedKey}`)?.classList.toggle('hidden', !linkedDriverOpenClientKeys.has(key));
}

// 연동된 기사가 실제로 작성한 운행 기록을 Supabase(daily_logs+transport_details)에서
// vehicle_id 기준으로 직접 조회한다. 예전에는 같은 브라우저의 localStorage만 봐서 다른
// 기기에서 작성한 기록은 절대 보이지 않았다 — 이제 그 차량으로 기록된 실제 서버 데이터를 본다.
async function fetchLinkedDriverRecordData(link) {
    if (!link?.vehicleId || typeof getSupabaseClient !== 'function') return {};
    try {
        const client = await getSupabaseClient();
        const [dailyRes, detailsRes] = await Promise.all([
            client.from('daily_logs').select('work_date, raw, fixed_count, pallet_count, is_off').eq('vehicle_id', link.vehicleId),
            client.from('transport_details').select('work_date, raw').eq('vehicle_id', link.vehicleId)
        ]);
        if (dailyRes.error) throw dailyRes.error;
        if (detailsRes.error) throw detailsRes.error;

        const byDate = {};
        (dailyRes.data || []).forEach(row => {
            byDate[row.work_date] = {
                ...(row.raw && typeof row.raw === 'object' ? row.raw : {}),
                isOff: !!row.is_off,
                fixedCount: row.fixed_count || 0,
                palletCount: row.pallet_count || 0,
                callDetails: []
            };
        });
        (detailsRes.data || []).forEach(row => {
            if (byDate[row.work_date]) byDate[row.work_date].callDetails.push(row.raw && typeof row.raw === 'object' ? row.raw : {});
        });
        return byDate;
    } catch (error) {
        console.error('연동 기사 운행 기록 조회 실패:', error);
        return {};
    }
}

async function renderLinkedDriverRecords() {
    const link = getLinkedDriverById(activeLinkedDriverId);
    const list = document.getElementById('linkedDriverRecordList');
    if (!link || !list) return;
    list.innerHTML = '<div class="linked-driver-empty">불러오는 중...</div>';
    const month = document.getElementById('linkedDriverRecordMonth')?.value || '';
    const data = await fetchLinkedDriverRecordData(link);
    // 조회하는 동안 화면을 벗어났거나 다른 기사로 바뀌었으면 반영하지 않는다.
    if (getLinkedDriverById(activeLinkedDriverId)?.id !== link.id || document.getElementById('linkedDriverManagementPage')?.classList.contains('hidden')) return;

    const ownerSettings = getUserSettings();
    const car = (ownerSettings.cars || []).find(c => c.number === link.vehicleNumber) || null;

    // ---------- 기사 정산 (항상 표시, §9/§13/§19) ----------
    const detail = getLinkedDriverSettlementDetail(data, month, link, car);
    document.getElementById('linkedDriverRecordCount').textContent = `${detail.tripCount}건`;
    document.getElementById('linkedDriverRecordFare').textContent = `${detail.totalFare.toLocaleString()}원`;
    document.getElementById('linkedDriverCommissionAmount').textContent = `-${detail.commissionAmount.toLocaleString()}원`;
    document.getElementById('linkedDriverInsuranceAmount').textContent = `-${detail.insuranceAmount.toLocaleString()}원`;
    document.getElementById('linkedDriverFinalAmount').textContent = `${detail.finalAmount.toLocaleString()}원`;

    if (!detail.trips.length) {
        list.innerHTML = '<div class="linked-driver-empty">선택한 달에 작성된 운행 기록이 없습니다.</div>';
    } else {
        list.innerHTML = detail.trips.map(trip => {
            const [, monthPart, dayPart] = trip.dateKey.split('-');
            const dateLabel = `${parseInt(monthPart, 10)}월 ${parseInt(dayPart, 10)}일`;
            if (trip.type === 'fixed') {
                return `<article class="linked-driver-record-card"><div><strong>${dateLabel}</strong><span>고정노선 ${trip.fixedCount || ''}건</span></div><p>거래처/상하차지 구분 없는 고정노선 운행입니다.</p><b>${trip.fare.toLocaleString()}원</b></article>`;
            }
            const badges = [
                trip.platform ? `플랫폼 ${trip.platform}` : '',
                trip.distanceKm ? `${trip.distanceKm}km` : '',
                trip.cargoTonnage ? `${trip.cargoTonnage}` : '',
                trip.paymentDueDate ? `입금예정 ${trip.paymentDueDate}` : '',
                trip.vatExempt ? '부가세 면세' : ''
            ].filter(Boolean).join(' · ');
            return `<article class="linked-driver-record-card"><div><strong>${dateLabel}</strong><span>${escapeDetailText(trip.client || '거래처 미지정')}</span></div><p>${escapeDetailText(trip.loadLoc || '상차지')} → ${escapeDetailText(trip.unloadLoc || '하차지')}${badges ? `<br><small>${escapeDetailText(badges)}</small>` : ''}${trip.remarks ? `<br><small>${escapeDetailText(trip.remarks)}</small>` : ''}</p><b>${trip.fare.toLocaleString()}원</b></article>`;
        }).join('');
    }

    // ---------- 거래처별 세금계산서 (기사 공유 ON일 때만, §6~9/§21) ----------
    const invoiceArea = document.getElementById('linkedDriverClientInvoiceArea');
    if (!invoiceArea) return;
    if (!isSharingClientTaxInvoicesWithOwner(link)) {
        invoiceArea.innerHTML = '<div class="linked-driver-empty">기사의 거래처 세금계산서 공유가 설정되어 있지 않습니다.</div>';
        return;
    }
    const { groups, unassignedCount } = getLinkedDriverClientInvoiceGroups(detail.trips, car, ownerSettings);
    if (!groups.length) {
        invoiceArea.innerHTML = `<div class="linked-driver-empty">선택한 달에 거래처가 연결된 운송 기록이 없습니다.${unassignedCount ? ` (거래처 미지정 운행 ${unassignedCount}건)` : ''}</div>`;
        return;
    }

    // 기사가 입력한 거래처는 기사 본인 계정에만 있고 차주의 거래처 목록(settings.clients)에는
    // 없다 — 세금계산서 발행(getTaxInvoicePartyInfo)이 사업자번호/대표자/주소 등을 이 목록에서
    // 이름으로 찾아서 채우는데, 여기 없으면 조용히 빈 값으로 나온다(실제로 보고됨: "거래처명
    // 외엔 안 보여"). 여기서 이 화면을 열 때마다(=차주가 실제로 그 기사의 실적을 확인하는
    // 시점) 아직 없는 거래처명을 빈 정보로라도 자동 등록해 둬서, 최소한 "이름은 있는데
    // 조회 자체가 실패"하는 상태는 피하고, 아래 "거래처 등록/수정" 버튼으로 차주가 직접
    // 사업자정보를 채워 넣을 수 있게 한다.
    const ownerClients = Array.isArray(ownerSettings.clients) ? ownerSettings.clients : (ownerSettings.clients = []);
    let addedNewClient = false;
    groups.forEach(g => {
        if (!ownerClients.some(c => c.companyName === g.clientName)) {
            ownerClients.push({ id: generateLocalId('client'), companyName: g.clientName });
            addedNewClient = true;
        }
    });
    if (addedNewClient) setUserSettings(ownerSettings);

    invoiceArea.innerHTML = (unassignedCount ? `<p class="linked-driver-readonly-notice" style="margin-bottom:8px;"><span>거래처 미지정 운행 ${unassignedCount}건은 계산서 대상에서 제외됐습니다.</span></p>` : '')
        + groups.map(g => {
            const key = encodeURIComponent(g.clientName);
            // vehicleLabel에 이미 "사업자명 · 차량번호"가 포함돼 있으므로(별도 사업자 차량의
            // 경우) 이름을 또 붙이면 중복 표시된다 — vehicleLabel 하나만 쓴다.
            const supplierLabel = g.vehicleLabel || g.supplierBiz?.name || '';
            const tripRows = g.trips.map(t => `<div class="linked-driver-client-trip-row"><span>${escapeDetailText(t.dateKey.slice(5).replace('-', '/'))} ${escapeDetailText(t.loadLoc || '상차지')} → ${escapeDetailText(t.unloadLoc || '하차지')}</span><b>${t.fare.toLocaleString()}원</b></div>`).join('');
            const registeredClient = ownerClients.find(c => c.companyName === g.clientName);
            const needsBizInfo = !registeredClient?.bizNumber;
            const manageLabel = needsBizInfo ? '⚠ 사업자정보 등록' : '거래처 수정';
            return `<article class="tax-invoice-card">
                <div class="tax-invoice-card-head"><div><strong>${escapeDetailText(g.clientName)}</strong><span>${g.count}건${supplierLabel ? ` · ${escapeDetailText(supplierLabel)}` : ''}</span></div></div>
                <div class="tax-invoice-card-money"><span>공급가액 <b>${g.supplyAmount.toLocaleString()}원</b></span><span>세액 <b>${g.taxAmount.toLocaleString()}원</b></span><strong><small>합계</small>${g.totalAmount.toLocaleString()}원</strong></div>
                <div class="tax-invoice-card-actions two-action"><button type="button" class="${needsBizInfo ? 'needs-attention' : ''}" onclick="manageLinkedDriverClient('${key}')">${manageLabel}</button><button type="button" onclick="toggleLinkedDriverClientDetail('${key}')">상세보기</button></div>
                <div id="linkedClientTrips_${key}" class="linked-driver-client-trip-list hidden">${tripRows}</div>
            </article>`;
        }).join('');
}

// 위 카드의 "거래처 등록/수정" 버튼 — 이 기사가 쓴 거래처명을 차주의 거래처관리 모달로 그대로
// 연다(renderLinkedDriverRecords가 화면에 들어올 때마다 미리 빈 정보로 등록해 두므로 인덱스가
// 항상 존재한다). client-management.js의 openClientModal/saveClient를 그대로 재사용한다 —
// 모달은 페이지 이동 없이 지금 화면(기사 기록 관리) 위에 그냥 뜨고 닫히므로 별도 처리가
// 필요 없다. 저장 후에는 이 화면을 다시 그려서 방금 채운 사업자정보를 카드에 반영한다.
function manageLinkedDriverClient(encodedName) {
    if (typeof openClientModal !== 'function') return;
    const name = decodeURIComponent(encodedName);
    const settings = getUserSettings();
    const index = (settings.clients || []).findIndex(c => c.companyName === name);
    if (index < 0) { showToastMessage('거래처를 찾을 수 없습니다.'); return; }
    openClientModal(index);

    // saveClient()는 clientModalOpenedFromCallDetail일 때만 호출부에 알려주는 후처리를 하므로,
    // 여기서는 모달이 닫힐 때(저장 또는 취소 모두) 이 화면을 다시 그려서 최신 상태를 반영한다.
    const modal = document.getElementById('clientModal');
    if (!modal) return;
    const observer = new MutationObserver(() => {
        if (modal.classList.contains('hidden')) {
            observer.disconnect();
            renderLinkedDriverRecords();
        }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
}

function renderEmployedDriverLinkState() {
    const settings = getUserSettings();
    const linked = settings.employerLink?.status === 'linked';
    document.getElementById('employedDriverDisconnectedPanel')?.classList.toggle('hidden', linked);
    document.getElementById('employedDriverConnectedPanel')?.classList.toggle('hidden', !linked);
    if (!linked) return;
    document.getElementById('employerLinkedName').textContent = settings.employerLink.ownerName || '연동된 운송사';
    document.getElementById('employerLinkedMeta').textContent = [settings.employerLink.ownerPhone, settings.employerLink.inviteCode ? `초대 코드 ${settings.employerLink.inviteCode}` : ''].filter(Boolean).join(' · ');
    const shareToggle = document.getElementById('shareClientTaxInvoicesToggle');
    if (shareToggle) shareToggle.checked = isSharingClientTaxInvoicesWithOwner(settings);
}

// 기사 → 차주 "거래처별 세금계산서 공유" 권한. 차주가 차량 설정에서 켜는 "기사 월매출 조회"
// (shareRevenueWithOwner, 기본 ON)와는 완전히 다른 별개의 값이다 — 이건 기사 본인이 켜고 끄는
// 권한이고, 기본값은 개인정보 보호 원칙상 OFF다(값이 아예 없는 기존 기사 계정도 OFF로 취급).
function isSharingClientTaxInvoicesWithOwner(settingsOrLink) {
    return settingsOrLink?.shareClientTaxInvoicesWithOwner === true;
}

// profiles.settings(jsonb)에 실려서 기존 동기화 경로(setUserSettings → scheduleSupabaseSettingsSync
// → syncSettingsToSupabase → buildSettingsJsonbPayload)로 그대로 서버에 저장된다 — 이 값만을
// 위한 새 컬럼이나 새 동기화 로직을 따로 만들지 않는다. 차주 쪽은 이 값을 로컬(다른 사람의
// localStorage)이 아니라 서버(연동된 기사의 profiles.settings)에서 읽어 판단한다
// (syncDriverLinksFromSupabase 참고).
function toggleShareClientTaxInvoicesWithOwner(checked) {
    const settings = getUserSettings();
    settings.shareClientTaxInvoicesWithOwner = !!checked;
    setUserSettings(settings);
    showToastMessage(checked ? '거래처 세금계산서 공유를 켰습니다.' : '거래처 세금계산서 공유를 껐습니다.');
}

// 실제 연결은 서버(redeem_driver_invite_code RPC)에서만 일어난다 — 전화번호만으로는
// 아직 실제로 연결해 주는 수단이 없으므로(차주 쪽에서 코드 없이 검색할 방법이 없음),
// 반드시 6자리 초대 코드가 있어야 진행한다.
async function connectEmployedDriver() {
    const inviteCode = document.getElementById('employerInviteCode')?.value.trim() || '';
    const ownerPhone = document.getElementById('employerPhone')?.value.trim() || '';
    if (!inviteCode && !ownerPhone) {
        showToastMessage('사장님께 받은 초대 코드를 입력해 주세요.');
        return;
    }
    if (!/^\d{6}$/.test(inviteCode)) {
        showToastMessage('사장님께 받은 6자리 초대 코드를 정확히 입력해 주세요.');
        return;
    }

    try {
        await performEmployedDriverConnect(inviteCode, ownerPhone);
    } catch (error) {
        console.error('기사 연동 실패:', error);
        showToastMessage(getDriverLinkErrorMessage(error));
        return;
    }

    renderEmployedDriverLinkState();
    showToastMessage('소속 사장님과 연결했습니다.');
}

// "기사 연결"의 실제 처리 로직만 담당한다(redeem → 차주 이름 조회 → employerLink 저장 →
// 사업자/차량정보 자동반영 → 과거 기록 backfill). 인증(로그인/회원가입)과는 완전히 분리된
// 별도 단계로, 마이페이지의 "소속 연결하기" 버튼(connectEmployedDriver)과 회원가입 직후
// 자동 연결 시도(executeSignupAction) 양쪽에서 이 함수 하나를 그대로 재사용한다.
// 실패하면 예외를 던지기만 할 뿐 계정/로그인 상태에는 전혀 손대지 않는다 — 호출부가 각자
// 상황에 맞는 안내만 보여주면 된다(연결 실패가 로그인/회원가입 성공을 무효화하지 않음).
async function performEmployedDriverConnect(inviteCode, ownerPhone = '') {
    if (typeof redeemDriverInviteCode !== 'function') {
        throw new Error('연결 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    }
    const linkedRow = await redeemDriverInviteCode(inviteCode);

    // 연결 자체는 이미 완료됐으니, 상대방(차주) 이름 조회가 실패해도 연결 결과는 그대로 살린다.
    let ownerName = '연동된 운송사';
    let ownerPhoneResolved = ownerPhone;
    try {
        const client = await getSupabaseClient();
        const { data: ownerProfile } = await client.from('profiles').select('name, phone, business_name').eq('id', linkedRow.owner_id).maybeSingle();
        if (ownerProfile) {
            ownerName = ownerProfile.business_name || ownerProfile.name || ownerName;
            ownerPhoneResolved = ownerProfile.phone || ownerPhoneResolved;
        }
    } catch (error) {
        console.error('연동된 차주 정보 조회 실패(연결 자체는 완료됨):', error);
    }

    const settings = getUserSettings();
    settings.employerLink = {
        id: linkedRow.id,
        supabaseId: linkedRow.id,
        status: 'linked',
        ownerId: linkedRow.owner_id,
        ownerName,
        ownerPhone: ownerPhoneResolved,
        inviteCode,
        vehicleId: linkedRow.vehicle_id,
        linkedAt: linkedRow.linked_at || new Date().toISOString()
    };
    setUserSettings(settings);

    // 차주가 이미 차량관리/사업자정보에 입력해둔 값을 기사 쪽에도 그대로 채워 넣어서
    // 같은 정보를 두 번 입력하지 않게 한다(기사 개인정보 — 이름/연락처/계좌 — 는 그대로 둠).
    await applyEmployerAutoFilledInfo(linkedRow.owner_id, linkedRow.vehicle_id);

    // 연동 "이전"에 이미 이 기기에 기록해둔 과거 운행 기록(오늘 이전 것 포함)도 차주가
    // 볼 수 있게, 지금 시점에 전부 차주 소유 차량으로 다시 업로드한다. 안 이러면 연동 이후에
    // 새로 쓴 기록만 보이고 과거 기록은 영원히 안 보인다.
    if (typeof backfillDriverWorkDataToOwnerVehicle === 'function') {
        try {
            const { count } = await backfillDriverWorkDataToOwnerVehicle(linkedRow.vehicle_id);
            if (count > 0) showToastMessage(`이전에 작성한 운행 기록 ${count}건도 사장님께 함께 반영했습니다.`);
        } catch (error) {
            console.error('과거 운행기록 반영 실패(연결 자체는 완료됨):', error);
        }
    }

    return linkedRow;
}

// 이미 연동돼 있는 기사가 "과거 기록 다시 동기화"를 눌렀을 때 쓴다. 연동 시점에 자동으로
// 한 번 돌긴 하지만, 그 전에 실패했거나(오프라인 등) 이 업데이트 이전에 이미 연동해둔
// 계정을 위해 수동으로 다시 실행할 수 있게 남겨둔다.
async function resyncEmployedDriverWorkData() {
    const settings = getUserSettings();
    const vehicleId = settings.employerLink?.vehicleId;
    if (settings.employerLink?.status !== 'linked' || !vehicleId) {
        showToastMessage('연동된 사장님이 없습니다.');
        return;
    }
    if (typeof backfillDriverWorkDataToOwnerVehicle !== 'function') {
        showToastMessage('동기화 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.');
        return;
    }
    const { count, failed } = await backfillDriverWorkDataToOwnerVehicle(vehicleId);
    if (failed > 0) {
        showToastMessage(`${count}건 반영, ${failed}건은 실패했습니다. 잠시 후 다시 시도해 주세요.`);
    } else if (count > 0) {
        showToastMessage(`운행 기록 ${count}건을 사장님께 다시 반영했습니다.`);
    } else {
        showToastMessage('반영할 운행 기록이 없습니다.');
    }
}

// 기사가 차주와 연동되면 차주가 입력한 사업자정보/차량정보를 기사 쪽 화면에도 자동으로
// 채운다. 기사 본인의 개인정보(이름/연락처/은행계좌)는 절대 건드리지 않는다 — 그건 말
// 그대로 기사 개인의 정보이기 때문이다. 연동 직후 1회, 그리고 개인정보 화면을 열 때마다
// (showPersonalInfo에서) 최신값으로 다시 채운다.
// 기사 개인정보 화면에 자동으로 채워 넣는 "회사 사업자정보"의 원본은 차주의 대표 사업자가
// 아니라 이 기사가 지금 연결돼 있는 차량의 사업자정보다(그 차량이 "내 사업자와 동일"이면
// 결과적으로 차주 기본 사업자와 같아진다) — resolveVehicleBusinessInfoFromSupabase()가 그
// 판단을 서버 기준으로 대신해 준다. 이전에는 여기서 무조건 ownerProfile.business_*만
// 읽어서, 차량별로 다른 사업자를 설정해도 기사 쪽엔 항상 차주 기본 사업자만 반영되고,
// 차량 사업자를 수정해도 반영되지 않는 문제가 있었다.
async function applyEmployerAutoFilledInfo(ownerId, vehicleId) {
    if (!ownerId || typeof getSupabaseClient !== 'function') return;
    try {
        const client = await getSupabaseClient();
        const { biz, vehicleRow } = typeof resolveVehicleBusinessInfoFromSupabase === 'function'
            ? await resolveVehicleBusinessInfoFromSupabase(client, vehicleId, ownerId)
            : { biz: null, vehicleRow: null };

        const settings = getUserSettings();
        let changed = false;
        const changedBizFields = {};

        if (biz) {
            // biz.representative(대표자명)는 resolveVehicleBusinessInfoFromSupabase가 이미
            // 계산해서 넘겨주는데(차주의 bizRepresentative, 없으면 차주 개인 성명으로 폴백),
            // 이 매핑에 빠져 있어서 조용히 버려지고 있었다 — 그 결과 차주가 대표자명을
            // 입력해도 연동된 기사 계정에는 나머지 사업자정보(상호/사업자번호/주소 등)만
            // 자동입력되고 대표자명만 계속 비어있는 버그였다(실제로 재현해서 확인).
            const bizFieldMap = {
                bizName: biz.name,
                bizNumber: biz.bizNumber,
                bizRepresentative: biz.representative,
                bizAddress: biz.address,
                bizType: biz.bizType,
                bizItem: biz.bizItem,
                bizEmail: biz.email
            };
            Object.entries(bizFieldMap).forEach(([key, value]) => {
                if (value && settings[key] !== value) { settings[key] = value; changed = true; changedBizFields[key] = value; }
            });
        }

        const vehicle = vehicleRow;
        if (vehicle) {
            const cars = Array.isArray(settings.cars) ? settings.cars : [];
            let mainCar = cars.find(c => c.type === 'main');
            if (!mainCar) {
                mainCar = { type: 'main' };
                cars.push(mainCar);
                changed = true;
            }
            if (vehicle.number && mainCar.number !== vehicle.number) { mainCar.number = vehicle.number; changed = true; }
            if (vehicle.tonnage && mainCar.tonnage !== vehicle.tonnage) { mainCar.tonnage = vehicle.tonnage; changed = true; }
            settings.cars = cars;
        }

        if (changed) {
            setUserSettings(settings);
            // 여기서 loadSettings()(개인정보 화면의 모든 입력란을 localStorage 스냅샷으로
            // 통째로 되돌리는 함수)를 부르지 않는다 — 이 함수는 showPersonalInfo()에서 화면이
            // 이미 열려 있는 동안 비동기(네트워크 조회 후)로 실행되므로, 그 사이 사용자가 이름/
            // 전화번호/계좌 같은 다른 입력란에 뭔가 입력하고 있었다면 방금 타이핑한 내용이
            // 화면에서 통째로 사라지는 문제가 있었다(실제로 보고됨 — "개인정보를 입력해도
            // 계속 지워진다"). 이 함수가 실제로 바꾼 사업자정보 입력란만 직접 갱신하고, 지금
            // 사용자가 포커스를 두고 있는 입력란은(그 필드 자체라도) 건드리지 않는다.
            Object.entries(changedBizFields).forEach(([key, value]) => {
                const el = document.getElementById(key);
                if (el && document.activeElement !== el) el.value = value;
            });
        }
    } catch (error) {
        console.error('차주 사업자정보/차량정보 자동입력 실패:', error);
    }
}

function disconnectEmployedDriver() {
    showConfirmModal('소속 연동을 해제하시겠습니까? 작성한 운행 기록은 삭제되지 않습니다.', () => {
        const settings = getUserSettings();
        const linkSupabaseId = settings.employerLink?.supabaseId;
        settings.employerLink = null;
        setUserSettings(settings);
        document.getElementById('employerInviteCode').value = '';
        document.getElementById('employerPhone').value = '';
        renderEmployedDriverLinkState();
        showToastMessage('소속 연동을 해제했습니다.');

        if (linkSupabaseId && typeof updateDriverLinkStatusOnSupabase === 'function') {
            updateDriverLinkStatusOnSupabase(linkSupabaseId, 'disconnected').catch(error => {
                console.error('소속 연동 해제 서버 반영 실패:', error);
            });
        }
    });
}
