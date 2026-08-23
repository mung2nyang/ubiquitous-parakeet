// ============================================================================
// 차량관리 — 목록/등록·수정 모달/수수료/사업자정보/기사연동 초대(차량쪽 진입점)
// (코드 쪼개기 9차: script.js에서 분리)
// ============================================================================
// script.js 안 3곳(차량관리 화면 진입점, 목록·모달·수수료·삭제, 콜상세 모달 인접의
// 기사연동 상태 표시/차량폼)에 흩어져 있던 걸 모았다. driver-link.js(기사 초대/연동
// 관련 다수), supabase-sync.js(ensureVehicleSyncedToSupabase 등, 전부 typeof 가드됨),
// finance.js/client-management.js/mypage.js 호출은 전부 함수 몸통 안 런타임 참조라
// 로드 순서와 무관하다.
//
// dedupeEntityList/dedupeCars/dedupeClients는 차량 전용처럼 보이지만 거래처 중복
// 제거에도 쓰이고 supabase-sync.js가 직접 참조해서(typeof 가드) script.js에 그대로
// 남겼다 — 차량/거래처 어느 한쪽 도메인 파일로 옮기면 반대쪽에서 엉뚱한 파일을
// 뒤지게 된다.
// ============================================================================

function showCarManagement(returnPage = 'main') {
    setUtilityReturnPage(returnPage);
    hideAllPages();
    document.getElementById('carManagementPage').classList.remove('hidden');
    loadCarList();
}

function loadCarList() {
    const settings = getUserSettings();

    if (!settings.cars) {
        settings.cars = [];
        if (settings.carNumber) {
            settings.cars.push({ number: settings.carNumber, tonnage: settings.carTonnage || '', type: 'main' });
            delete settings.carNumber;
            delete settings.carTonnage;
            setUserSettings(settings);
        }
    }

    // 중복된 차량 항목(같은 메인 차량 여러 개, 또는 번호가 같은 기사차량 여러 개)이 있으면
    // 정리한다 — supabaseId가 저장 때마다 사라지던 예전 버그 등으로 실제 중복이 쌓이는
    // 문제가 있었다. 화면에는 항상 차량마다 한 줄만 보이도록 열 때마다 다시 정리한다.
    const { cars: dedupedCars, removed } = dedupeCars(settings.cars);
    if (removed > 0) {
        settings.cars = dedupedCars;
        setUserSettings(settings);
        showToastMessage(`중복된 차량 항목 ${removed}건을 정리했습니다.`);
    }

    const container = document.getElementById('carListContainer');
    container.innerHTML = '';

    if (settings.cars.length === 0) {
        container.innerHTML = '<div class="empty-state">등록된 차량이 없습니다.</div>';
    } else {
        settings.cars.forEach((car, idx) => {
            const typeBadge = car.type === 'main' 
                ? '<span class="management-badge car-type main">메인</span>' 
                : '<span class="management-badge car-type sub">기사차량</span>';
            
            const savedDriverName = car.driverName || car.personalInfo?.driverName || '';
            const driverInfo = car.type === 'sub' && savedDriverName ? ` [기사: ${savedDriverName}]` : '';
            const settlementBadge = car.type === 'sub' ? `<span class="management-badge commission">${escapeDetailText(getDriverSettlementModeMeta(getEffectiveDriverSettlementMode(car, settings)).label)}</span>` : '';

            const div = document.createElement('div');
            div.className = 'car-card management-list-card car-list-card';
            div.innerHTML = `
                <div class="management-card-copy">
                    <div class="car-info-text">${typeBadge}${escapeDetailText(car.number)}${escapeDetailText(driverInfo)}${settlementBadge}${car.type === 'sub' && car.driverLinkEnabled ? '<span class="management-badge log-enabled">기사연동</span>' : ''}${car.type === 'sub' && car.logEnabled ? '<span class="management-badge log-enabled">운행일지</span>' : ''}</div>
                    <div class="car-sub-text">${car.tonnage ? '(' + escapeDetailText(car.tonnage) + ')' : ''}${car.commEnabled && car.commission ? ' · 수수료 ' + escapeDetailText(car.commission) + (car.commType === 'direct' ? '원' : '%') : ''}</div>
                </div>
                <div class="car-action-btns">
                    <button type="button" class="action-icon-btn" onclick="editCar(${idx})" title="수정">${editDetailSvg()}</button>
                    <button type="button" class="action-icon-btn del" onclick="deleteCar(${idx})" title="삭제">${deleteDetailSvg()}</button>
                </div>
            `;
            container.appendChild(div);
        });
    }
}

function toggleCarAddMenu() {
    document.getElementById('carAddMenu')?.classList.toggle('hidden');
}

function closeCarAddMenu() {
    document.getElementById('carAddMenu')?.classList.add('hidden');
}

function openCarModal(mode = 'main') {
    resetCarForm();
    const modeEl = document.getElementById('carModalMode');
    if (modeEl) modeEl.value = mode;

    const settings = getUserSettings();
    const cars = settings.cars || [];

    if (mode === 'main') {
        // 소속 기사는 메인 차량이 곧 "차주가 연동해 준 그 차량"이어야 한다(운행기록이 그
        // 차량으로 올라가야 차주가 조회할 수 있다 — resolveVehicleIdForLogId 참고). 아직
        // 차주와 연동 전인데 기사가 직접 메인 차량을 새로 등록해 버리면, 나중에 연동해도
        // 이 임의의 차량과 실제 차주 차량이 서로 다른 두 대처럼 꼬여서 운행기록이 갈라지는
        // 문제가 생긴다 — 그래서 연동 전에는 메인 차량 등록 자체를 막고 먼저 연동하게 한다.
        if (settings.accountType === 'employed_driver' && settings.employerLink?.status !== 'linked' && editingCarIndex < 0) {
            showConfirmModal('아직 소속 사장님과 연결되지 않았습니다.\n마이페이지 > 소속 연결에서 먼저 사장님과 연결한 뒤 차량 정보를 등록해 주세요.', null);
            return;
        }
        let hasMain = cars.some((c, idx) => idx !== editingCarIndex && c.type === 'main');
        if (hasMain && editingCarIndex < 0) {
            showConfirmModal('메인 차량이 이미 등록되어 있습니다.', null);
            return;
        }
        document.getElementById('carModalTitle').textContent = '차량 등록';
        document.getElementById('driverBasicInfoFields').style.display = 'none';
        document.getElementById('carBusinessInfoFields').style.display = 'none';
        document.getElementById('logToggleContainer').style.display = 'none';
    } else {
        let subCount = cars.filter((c, idx) => idx !== editingCarIndex && c.type === 'sub').length;
        if (subCount >= 3 && editingCarIndex < 0) {
            showConfirmModal('기사 차량은 최대 3대까지 등록 가능합니다.', null);
            return;
        }
        document.getElementById('carModalTitle').textContent = '기사 등록';
        document.getElementById('driverBasicInfoFields').style.display = 'block';
        document.getElementById('carBusinessInfoFields').style.display = 'block';
        document.getElementById('logToggleContainer').style.display = 'block';
    }

    document.getElementById('carModal').classList.remove('hidden');
}

function closeCarModal() {
    document.getElementById('carModal').classList.add('hidden');
    resetCarForm();
}

function setCarCommType(type) {
    const hiddenType = document.getElementById('newCarCommType');
    const previousType = hiddenType?.value || 'percent';
    if (hiddenType) hiddenType.value = type;

    const btnPercent = document.getElementById('btnCarCommPercent');
    const btnDirect = document.getElementById('btnCarCommDirect');
    const label = document.getElementById('carCommLabel');
    const input = document.getElementById('newCarCommission');
    const unit = document.getElementById('carCommUnit');

    if (!btnPercent || !btnDirect || !label || !input || !unit) return;
    if (previousType !== type) input.value = '';

    if (type === 'percent') {
        btnPercent.classList.add('active');
        btnDirect.classList.remove('active');
        btnPercent.setAttribute('aria-pressed', 'true');
        btnDirect.setAttribute('aria-pressed', 'false');
        label.textContent = '기사(차량) 수수료율';
        input.placeholder = '0';
        input.inputMode = 'decimal';
        unit.textContent = '%';
        // formatCommValue는 client-management.js에 정의돼 있다(index.html이 이 파일보다
        // 먼저 client-management.js를 로드하므로 안전하다) — 거래처/차량 양쪽의 수수료율
        // 자릿수 제한(0~100%) 로직을 여기서 또 인라인으로 베끼지 않고 한 곳만 고치면 되게 한다.
        formatCommValue(input);
    } else {
        btnDirect.classList.add('active');
        btnPercent.classList.remove('active');
        btnDirect.setAttribute('aria-pressed', 'true');
        btnPercent.setAttribute('aria-pressed', 'false');
        label.textContent = '기사(차량) 건당 수수료';
        input.placeholder = '0';
        input.inputMode = 'numeric';
        unit.textContent = '원';
        formatCurrencyInput(input);
    }
}

function formatCarCommInput(input) {
    const typeEl = document.getElementById('newCarCommType');
    const type = typeEl ? typeEl.value : 'percent';
    if (type === 'percent') {
        formatCommValue(input);
    } else {
        formatCurrencyInput(input);
    }
}

function toggleNewCarCommSettings() {
    const isChecked = document.getElementById('newCarCommToggle').checked;
    setSettingsGroupExpanded(document.getElementById('newCarCommSettings'), isChecked);
}

// 기사차량(sub car)의 차량 단위 사업자정보를 읽는다. "내 사업자 정보와 동일" ON이면 값을
// 저장/스냅샷하지 않고, 조회 시점에 항상 차주의 최신 개인정보 사업자정보를 그대로 참조한다
// (차주가 나중에 주소/이메일 등을 고쳐도 "동일" 차량들이 자동으로 최신값을 따라가야 하므로).
// 메인 차량은 애초에 차주 본인 사업자를 쓰는 것이 기본이라 항상 차주 기본 사업자정보를 쓴다.
function getCarBusinessInfo(car, settings = getUserSettings()) {
    const ownerBiz = {
        name: settings.bizName || '',
        bizNumber: settings.bizNumber || '',
        representative: settings.bizRepresentative || settings.userName || '',
        address: settings.bizAddress || '',
        bizType: settings.bizType || '',
        bizItem: settings.bizItem || '',
        email: settings.bizEmail || ''
    };
    if (!car || car.type !== 'sub') return { sameAsOwner: true, ...ownerBiz };

    const info = car.businessInfo;
    // 기존 차량(이번 기능 이전에 등록됨)은 businessInfo가 아예 없다 — "사업자정보 미설정"이
    // 아니라 안전하게 "차주와 동일"로 취급해서 이전과 동일하게 차주 기본 사업자를 쓴다(요구사항 11:
    // 기존 차량은 오류 없이 정상 동작해야 한다).
    if (!info || info.sameAsOwner) return { sameAsOwner: true, ...ownerBiz };

    return {
        sameAsOwner: false,
        name: info.name || '',
        bizNumber: info.bizNumber || '',
        representative: info.representative || '',
        address: info.address || '',
        bizType: info.bizType || '',
        bizItem: info.bizItem || '',
        email: info.email || ''
    };
}

// 이 차량의 운행 매출을 차주의 "월매출" 화면에서 볼 수 있는지 여부. 값이 아예 없으면(기존
// 차량) 항상 true로 취급한다 — 이 기능 도입 전에는 전부 보였으므로 기존 동작을 그대로 유지.
function isVehicleRevenueSharedWithOwner(car) {
    return car?.shareRevenueWithOwner !== false;
}

// 세금계산서(매출 발행) 집계에서 "이 운행이 어느 사업자 명의로 나가야 하는지" 식별한다.
// - 메인 차량, 또는 "내 사업자 정보와 동일" ON인 기사차량 → 차주 기본 사업자와 같은 키를
//   부여해서, 서로 다른 차량이라도 실제로는 같은 사업자라면 하나의 계산서로 자연스럽게
//   합산되게 한다(요구사항 18의 "차량이 달라도 동일 사업자면 합산 가능" 부분).
// - 사업자정보를 따로 입력한 기사차량 → bizNumber(없으면 상호명) 기준의 고유 키를 부여해서
//   다른 사업자와 절대 섞이지 않게 한다.
// - 그마저도 없는(아직 사업자정보를 안 채운) 기사차량 → 차량번호 기준으로 키를 만들어, 서로
//   다른 미입력 차량끼리도 섞이지 않게 한다(요구사항 18: "합치는 것보다 분리를 우선한다").
function getVehicleSupplierIdentity(car, settings = getUserSettings()) {
    const ownerBiz = { sameAsOwner: true, name: settings.bizName || '', bizNumber: settings.bizNumber || '', representative: settings.bizRepresentative || settings.userName || '', address: settings.bizAddress || '', bizType: settings.bizType || '', bizItem: settings.bizItem || '', email: settings.bizEmail || '' };
    if (!car || car.type !== 'sub') {
        return { key: `owner:${ownerBiz.bizNumber || ownerBiz.name || 'default'}`, biz: ownerBiz, carLabel: '메인 차량', carNumber: null };
    }
    const biz = getCarBusinessInfo(car, settings);
    if (biz.sameAsOwner) {
        return { key: `owner:${ownerBiz.bizNumber || ownerBiz.name || 'default'}`, biz: ownerBiz, carLabel: getShortCarNum(car.number), carNumber: car.number };
    }
    const key = `car:${car.number}:${biz.bizNumber || biz.name || 'noinfo'}`;
    return { key, biz, carLabel: biz.name ? `${biz.name} · ${getShortCarNum(car.number)}` : getShortCarNum(car.number), carNumber: car.number };
}

// 차량 등록 모달의 입력값을 검증하고 settings.cars에 반영(추가/수정)까지 마친 뒤 저장된 차량과
// 인덱스를 반환한다. 검증 실패 시 필드 에러 + 토스트만 띄우고 null을 반환한다. "저장" 버튼
// (saveNewCar)과 "기사 연동하기" 버튼(openCarDriverInviteModal) 둘 다 이 함수를 공유한다 —
// 기사연동하기도 결국 차량을 먼저 정상 저장해야 실제 vehicle_id를 만들 수 있기 때문이다.
function saveCarFromModal() {
    const num = document.getElementById('newCarNumber').value.trim();
    const ton = document.getElementById('newCarTonnage').value.trim();
    const mode = document.getElementById('carModalMode').value;

    if (!num) {
        markFieldError('newCarNumber');
        document.getElementById('newCarNumber').focus();
        return null;
    }

    const carType = mode === 'main' ? 'main' : 'sub';
    const settings = getUserSettings();
    if (!settings.cars) settings.cars = [];

    const driverName = carType === 'sub' ? document.getElementById('newDriverName').value.trim() : '';
    const driverPhone = carType === 'sub' ? document.getElementById('newUserPhone').value.trim() : '';
    const settlementMode = carType === 'sub' ? document.getElementById('newCarSettlementMode').value : 'default';
    if (carType === 'sub' && (!driverName || driverPhone.replace(/\D/g, '').length < 10)) {
        if (!driverName) markFieldError('newDriverName');
        if (driverPhone.replace(/\D/g, '').length < 10) markFieldError('newUserPhone');
        showToastMessage('기사명과 연락처를 확인해 주세요.');
        return null;
    }

    const previousCar = editingCarIndex > -1 ? settings.cars[editingCarIndex] : null;
    // 기사 초대의 생성/수정/해제는 "기사 연동 관리"(및 이 모달의 2차 기사연동 모달) 쪽 실제
    // Supabase 연동 로직 한 곳에서만 한다. 여기서는 기존에 이미 연결/초대된 상태가 있으면 그
    // 상태만 읽어서 표시용으로만 쓰고, 새로 만들거나 바꾸지 않는다.
    const links = Array.isArray(settings.driverLinks) ? settings.driverLinks : [];
    const existingLink = links.find(link =>
        (previousCar?.driverLinkId && link.id === previousCar.driverLinkId)
        || (!previousCar?.driverLinkId && previousCar?.number && link.vehicleNumber === previousCar.number && link.status !== 'disconnected')
    ) || null;
    const driverLinkId = existingLink?.id || '';
    const driverLinkEnabled = carType === 'sub' && !!existingLink;
    const logEnabled = carType === 'main' ? true : (!driverLinkEnabled && document.getElementById('newLogToggle').checked);
    const insuranceOn = carType === 'sub' ? document.getElementById('newCarInsuranceToggle').checked : false;

    const commEnabled = document.getElementById('newCarCommToggle') ? document.getElementById('newCarCommToggle').checked : false;
    const commType = document.getElementById('newCarCommType').value;
    const commission = commEnabled ? document.getElementById('newCarCommission').value.trim() : '';

    // 차량 단위 사업자정보(기사 본인 개인정보 — 이름/연락처/은행/계좌 — 와는 완전히 다른
    // 개념이다. car.personalInfo가 "기사 개인" 정보라면, car.businessInfo는 "이 차량이 속한
    // 사업자"다). "내 사업자 정보와 동일" ON이면 값은 스냅샷하지 않고 플래그만 저장한다 —
    // 조회 시점에 항상 차주의 최신 개인정보를 참조하게(getCarBusinessInfo) 하기 위함.
    // personalInfo(아래)가 대표자명/사업자번호를 이 값에서 그대로 가져다 쓰므로, personalInfo
    // 구성보다 먼저 계산해 둔다.
    let businessInfo = previousCar?.businessInfo || null;
    let shareRevenueWithOwner = previousCar?.shareRevenueWithOwner;
    if (carType === 'sub') {
        const sameAsOwner = document.getElementById('newCarBizSameAsOwner')?.checked ?? true;
        businessInfo = {
            sameAsOwner,
            name: sameAsOwner ? '' : (document.getElementById('newCarBizName')?.value.trim() || ''),
            bizNumber: sameAsOwner ? '' : (document.getElementById('newCarBizNumber')?.value.trim() || ''),
            representative: sameAsOwner ? '' : (document.getElementById('newCarBizRepresentative')?.value.trim() || ''),
            address: sameAsOwner ? '' : (document.getElementById('newCarBizAddress')?.value.trim() || ''),
            bizType: sameAsOwner ? '' : (document.getElementById('newCarBizType')?.value.trim() || ''),
            bizItem: sameAsOwner ? '' : (document.getElementById('newCarBizItem')?.value.trim() || ''),
            email: sameAsOwner ? '' : (document.getElementById('newCarBizEmail')?.value.trim() || '')
        };
        shareRevenueWithOwner = document.getElementById('newCarShareRevenueToggle')?.checked ?? true;
    }

    let infoType = 'existing';
    let personalInfo = null;

    if (carType === 'sub' && logEnabled) {
        const isNewInfo = document.getElementById('btnUseNewInfo').classList.contains('active-work');
        if (isNewInfo) {
            infoType = 'new';
            // 대표자명/사업자번호는 더 이상 여기서 다시 입력받지 않는다(요구사항: 운행일지의
            // 중복 정산정보 입력 제거) — 위에서 계산한 이 차량의 사업자정보(businessInfo,
            // "내 사업자와 동일"이면 차주 기본 사업자)를 그대로 가져다 쓴다. 기존
            // getTaxInvoicePartyInfo(기사 매입 계산서)가 car.personalInfo.name/bizNumber를
            // 그대로 참조하므로, 여기서 값을 채워 둬야 기존 계산이 그대로 유지된다.
            const resolvedBiz = getCarBusinessInfo({ businessInfo, type: 'sub' }, settings);
            personalInfo = {
                driverName: driverName,
                name: resolvedBiz.representative || '',
                bizNumber: resolvedBiz.bizNumber || '',
                phone: driverPhone,
                bank: document.getElementById('newBankName').value.trim(),
                account: document.getElementById('newAccountNumber').value.trim(),
                accountHolder: document.getElementById('newAccountHolder')?.value.trim() || ''
            };
        }
    }

    // previousCar를 베이스로 스프레드해야 한다 — 그렇지 않으면 이 폼이 모르는 필드(특히
    // Supabase에 연결된 뒤 붙는 supabaseId)가 저장할 때마다 사라진다. supabaseId가 사라지면
    // 다음 저장 때 "새 차량"으로 오인해서 서버에 중복 insert되고, 그 상태에서 새로고침/재로그인
    // (하이드레이션)할 때마다 중복된 행이 전부 로컬로 다시 들어와 차량 목록이 계속 불어난다
    // (실제로 이 버그로 "차량이 무한증식"하는 문제가 재현되어 고쳤다).
    const carData = {
        ...(previousCar || {}),
        number: num,
        tonnage: ton,
        type: carType,
        driverName: driverName,
        driverPhone: driverPhone,
        settlementMode: settlementMode,
        driverLinkEnabled: driverLinkEnabled,
        driverLinkId: driverLinkEnabled ? driverLinkId : '',
        logEnabled: logEnabled,
        insuranceOn: insuranceOn,
        commType: commType,
        commission: commission,
        commEnabled: commEnabled,
        infoType: infoType,
        personalInfo: personalInfo,
        businessInfo: businessInfo,
        shareRevenueWithOwner: shareRevenueWithOwner
    };

    // 기존 서브 차량의 번호를 수정한 경우(오타 정정 등), 그 번호를 키로 쓰는 로컬 운행기록
    // 저장소(workData_<번호>)도 함께 옮겨준다 — 안 옮기면 번호만 바뀌고 실제 기록은 옛
    // 번호 키에 그대로 남아, 새 번호로 들어가면 텅 빈 일지처럼 보이는 문제가 있었다.
    if (carType === 'sub' && previousCar?.number && previousCar.number !== num) {
        const oldKey = 'workData_' + previousCar.number;
        const newKey = 'workData_' + num;
        const oldData = localStorage.getItem(oldKey);
        if (oldData && !localStorage.getItem(newKey)) {
            localStorage.setItem(newKey, oldData);
            localStorage.removeItem(oldKey);
        }
        // activeLogId가 지금 수정 중인 이전 차량번호를 가리키고 있었다면 새 번호로 갱신한다.
        if (activeLogId === previousCar.number) {
            activeLogId = num;
        }
    }

    const wasNew = editingCarIndex <= -1;
    let index;
    if (!wasNew) {
        settings.cars[editingCarIndex] = carData;
        index = editingCarIndex;
    } else {
        settings.cars.push(carData);
        index = settings.cars.length - 1;
    }
    // 새로 만든 차량이라도 이 시점부터는 "편집 중인 차량"으로 취급한다 — 이래야 "기사
    // 연동하기"가 실패해서 모달이 다시 열려도 saveCarFromModal()을 재호출했을 때 같은
    // 차량을 계속 수정하지, 매번 새 차량을 또 push해서 중복이 생기지 않는다.
    editingCarIndex = index;

    setUserSettings(settings);
    return { car: settings.cars[index], index, wasNew };
}

function saveNewCar() {
    const result = saveCarFromModal();
    if (!result) return;
    showToastMessage(result.wasNew ? '등록되었습니다.' : '수정되었습니다.');
    closeCarModal();
    loadCarList();
    renderSubCarMenu();
    renderLinkedDriverList();
    updateAccountRoleUI();
    updateTransportSettingsUI();
}

// "기사 연동하기" 버튼 핸들러. 차량을 먼저 정상 저장한 뒤, 디바운스된 배경 동기화를 기다리지
// 않고 이 차량 하나만 즉시 Supabase에 반영해 실제 vehicle_id를 확보하고, 2차 기사연동 모달을
// 연다(요구사항: 저장→수정→기사연동을 사용자가 따로 할 필요 없이 한 흐름처럼 보이게).
async function openCarDriverInviteModal() {
    const result = saveCarFromModal();
    if (!result) return; // 검증 실패 — 이미 에러가 표시됐고, 차량 모달은 그대로 유지된다.
    const { car, index } = result;

    if (typeof ensureVehicleSyncedToSupabase !== 'function' || typeof getSupabaseUser !== 'function') {
        showToastMessage('클라우드 연결 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.');
        return;
    }
    const user = await getSupabaseUser();
    if (!user) {
        showToastMessage('기사 연동은 로그인 후 이용할 수 있습니다.');
        return;
    }

    const btn = document.getElementById('carModalDriverConnectBtn');
    if (btn) { btn.disabled = true; btn.textContent = '차량 저장 중...'; }
    try {
        await ensureVehicleSyncedToSupabase(car, index);
        // ensureVehicleSyncedToSupabase가 car.supabaseId를 즉시 채워준다 — localStorage에도
        // 반영해서 이후 로직(2차 모달의 upsertDriverLinkOnSupabase 등)이 바로 쓸 수 있게 한다.
        const settings = getUserSettings();
        if (settings.cars?.[index]) {
            settings.cars[index] = car;
            setUserSettings(settings);
        }
    } catch (error) {
        console.error('차량 클라우드 동기화 실패(차량 정보 자체는 로컬에 저장됨):', error);
        showToastMessage('차량 정보를 클라우드에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        return;
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '기사 연동하기'; }
    }

    document.getElementById('carModal').classList.add('hidden');
    showCarDriverInviteModal(car);
}

// 2차 기사연동 모달을 연다. 이미 이 차량에 pending/linked 초대가 있으면 그 상태를 그대로
// 보여주고(요구사항 25 — 중복 초대 방지), 없으면 차량 모달에서 이미 입력한 기사명/연락처를
// 그대로 전달해 새 초대를 준비한다(다시 입력하게 하지 않음).
function showCarDriverInviteModal(car) {
    const settings = getUserSettings();
    const links = Array.isArray(settings.driverLinks) ? settings.driverLinks : [];
    const existingLink = links.find(link =>
        (car.driverLinkId && link.id === car.driverLinkId)
        || (!car.driverLinkId && link.vehicleNumber === car.number && link.status !== 'disconnected')
    ) || null;

    document.getElementById('carInviteVehicleNumber').value = car.number;
    const vehicleLabel = document.getElementById('carInviteVehicleLabel');
    if (vehicleLabel) vehicleLabel.textContent = car.number;

    const banner = document.getElementById('carInviteStatusBanner');
    const saveBtn = document.getElementById('carInviteSaveBtn');
    const fullMgmtLink = document.getElementById('carInviteFullManagementLink');

    if (existingLink) {
        document.getElementById('carInviteEditId').value = existingLink.id;
        document.getElementById('carInviteDriverName').value = existingLink.driverName || '';
        document.getElementById('carInvitePhone').value = existingLink.phone || '';
        document.getElementById('carInviteCode').value = existingLink.inviteCode || '';
        document.getElementById('carInviteAssignmentStart').value = existingLink.assignmentStart || '';
        document.getElementById('carInviteAssignmentEnd').value = existingLink.assignmentEnd || '';
        if (banner) {
            banner.textContent = existingLink.status === 'linked'
                ? `이미 ${existingLink.driverName || '기사'}님과 연동되어 있습니다. 필요하면 아래 정보를 수정해 주세요.`
                : `${existingLink.driverName || '기사'}님에게 보낸 초대가 대기 중입니다(코드 ${existingLink.inviteCode || '-'}).`;
            banner.classList.remove('hidden');
        }
        if (saveBtn) saveBtn.textContent = existingLink.status === 'linked' ? '할당 정보 저장' : '초대 수정';
        fullMgmtLink?.classList.remove('hidden');
    } else {
        const info = getDriverInfoFromCar(car);
        document.getElementById('carInviteEditId').value = '';
        document.getElementById('carInviteDriverName').value = info.driverName;
        document.getElementById('carInvitePhone').value = info.driverPhone;
        document.getElementById('carInviteAssignmentStart').value = new Date().toISOString().slice(0, 10);
        document.getElementById('carInviteAssignmentEnd').value = '';
        if (banner) banner.classList.add('hidden');
        if (saveBtn) saveBtn.textContent = '초대 저장';
        fullMgmtLink?.classList.add('hidden');
        generateDriverInviteCode('carInviteCode');
    }

    document.getElementById('carDriverInviteModal').classList.remove('hidden');
}

// 2차 모달을 닫는다. reopenCarModal이 true면(취소/닫기) 1차 차량 등록 모달로 돌아간다 — 이미
// 저장된 차량정보/기사정보/사업자정보/정산옵션이 사라지지 않게(요구사항 24).
function closeCarDriverInviteModal(reopenCarModal = true) {
    document.getElementById('carDriverInviteModal').classList.add('hidden');
    if (reopenCarModal) document.getElementById('carModal').classList.remove('hidden');
}

// "전체 기사연동 관리에서 보기" — 연동 해제 등 이 2차 모달에 없는 고급 기능이 필요할 때만
// 쓰는 탈출구다. 기존 "기사 연동 관리" 전체 화면(디스커넥트/재발급 등 기존 기능 그대로)으로
// 이동한다.
function goToFullDriverConnectionManagementFromCarInviteModal() {
    const vehicleNumber = document.getElementById('carInviteVehicleNumber')?.value || '';
    document.getElementById('carDriverInviteModal').classList.add('hidden');
    closeCarModal();
    showDriverConnectionManagement('car');
    const vehicleInput = document.getElementById('linkedDriverVehicle');
    if (vehicleInput && vehicleNumber) vehicleInput.value = vehicleNumber;
}

async function saveCarDriverInvitation() {
    const name = document.getElementById('carInviteDriverName')?.value.trim() || '';
    const phone = document.getElementById('carInvitePhone')?.value.trim() || '';
    const inviteCode = document.getElementById('carInviteCode')?.value.trim() || '';
    const vehicleNumber = document.getElementById('carInviteVehicleNumber')?.value.trim() || '';
    const assignmentStart = document.getElementById('carInviteAssignmentStart')?.value || '';
    const assignmentEnd = document.getElementById('carInviteAssignmentEnd')?.value || '';
    const editId = document.getElementById('carInviteEditId')?.value || '';

    if (!name || !assignmentStart) {
        if (!name) markFieldError('carInviteDriverName');
        if (!assignmentStart) markFieldError('carInviteAssignmentStart');
        showToastMessage('기사 이름과 할당 시작일을 입력해 주세요.');
        return;
    }
    if (!/^\d{6}$/.test(inviteCode)) {
        markFieldError('carInviteCode');
        showToastMessage('"코드 생성" 버튼으로 6자리 초대 코드를 만들어 주세요.');
        return;
    }
    if (assignmentEnd && assignmentEnd < assignmentStart) {
        showToastMessage('할당 종료일은 시작일 이후로 선택해 주세요.');
        return;
    }

    const link = await performSaveLinkedDriverInvitation({ name, phone, inviteCode, vehicleNumber, assignmentStart, assignmentEnd, editId });
    if (!link) return; // 실패 이유는 이미 toast로 표시됨 — 차량/기사/사업자 정보는 그대로 유지된다.

    document.getElementById('carDriverInviteModal').classList.add('hidden');
    closeCarModal(); // 차량 등록 + 기사연동까지 전체 흐름 완료 — 목록으로 복귀
    loadCarList();
    renderLinkedDriverList();
    showToastMessage('차량 등록과 기사 연동을 모두 완료했습니다.');
}

function deleteCar(idx) {
    showConfirmModal('해당 차량을 삭제하시겠습니까? 이 차량으로 기록된 운행 내역도 함께 삭제되며 복구할 수 없습니다.', () => {
        const settings = getUserSettings();
        const deletedCar = settings.cars?.[idx];
        if (!deletedCar) return;
        const deletedCarNum = deletedCar.number;
        const deletedSupabaseId = deletedCar.supabaseId;
        const linkedDriver = (settings.driverLinks || []).find(link =>
            (deletedCar.driverLinkId && link.id === deletedCar.driverLinkId)
            || (!deletedCar.driverLinkId && link.vehicleNumber === deletedCarNum && link.status !== 'disconnected')
        );
        if (linkedDriver) {
            linkedDriver.status = 'disconnected';
            linkedDriver.updatedAt = new Date().toISOString();
            // disconnectLinkedDriver()/updateLinkedDriverStatus()와 동일하게, 로컬 상태 변경과
            // 별개로 서버 driver_links 행에도 반영한다 — 안 하면 차량을 지워도 서버상으로는
            // 계속 "연결됨"으로 남는다(syncSettingsToSupabase는 driver_links 테이블을 다루지
            // 않는다).
            if (linkedDriver.supabaseId && typeof updateDriverLinkStatusOnSupabase === 'function') {
                updateDriverLinkStatusOnSupabase(linkedDriver.supabaseId, 'disconnected').catch(error => {
                    console.error('기사 연동 상태 서버 반영 실패:', error);
                });
            }
        }
        settings.cars.splice(idx, 1);
        setUserSettings(settings);

        // 이 차량으로 저장된 운행 기록도 함께 삭제한다. 메인 차량은 접두사 없는 'workData'
        // 키를 공용으로 쓰므로(서브 차량과 저장 구조 자체가 다름) 대상에서 제외한다 —
        // 메인 로그 전체를 지워버리는 사고를 막기 위함.
        if (deletedCar.type !== 'main') {
            localStorage.removeItem('workData_' + deletedCarNum);
        }
        // 이 차량의 동기화 diff 기준점도 함께 지운다 — 안 지우면 나중에 같은 차량번호로
        // 새 차량을 등록했을 때, 예전 차량의 "이미 서버와 동일함" 기록이 남아있어 새 차량의
        // 실제 첫 저장이 조용히 스킵될 수 있다(§오늘 찾은 __supabaseWorkDataSyncedSnapshot 패턴).
        if (typeof __supabaseWorkDataSyncedSnapshot === 'object' && __supabaseWorkDataSyncedSnapshot) {
            delete __supabaseWorkDataSyncedSnapshot[deletedCarNum];
        }

        // 로컬에서만 지우고 끝내면, 재로그인/하이드레이션 시 서버 vehicles 테이블에 남아있는
        // 이 차량 행을 다시 읽어와 로컬에 되살려 놓는 문제가 있었다(실제로 재현됨) — 서버에서도
        // 함께 삭제해서 "새로고침하면 삭제한 차량이 부활하는" 결함을 막는다.
        if (deletedSupabaseId && typeof deleteVehicleFromSupabase === 'function') {
            deleteVehicleFromSupabase(deletedSupabaseId).catch(error => {
                console.error('서버 차량 삭제 실패(로컬 삭제는 반영됨, 다음 동기화 때 재확인 필요):', error);
            });
        }

        if (editingCarIndex === idx) resetCarForm();
        loadCarList();
        renderSubCarMenu();
        renderLinkedDriverList();
        updateAccountRoleUI();
        updateTransportSettingsUI();

        if(activeLogId === deletedCarNum) {
            switchCarLog('main');
        }
        showToastMessage('차량을 삭제했습니다.');
    });
}

let editingCarIndex = -1;

function toggleNewLogSettings() {
    const logToggle = document.getElementById('newLogToggle');
    const isChecked = logToggle.checked;
    setSettingsGroupExpanded(document.getElementById('newLogSettings'), isChecked);
}

// 차량 모달의 "기사연동" 상태 문구를 실제 연동 데이터 기준으로 갱신한다.
function updateCarDriverLinkStatusText(existingLink) {
    const el = document.getElementById('carDriverLinkStatusText');
    if (!el) return;
    if (!existingLink) {
        el.textContent = '기사를 초대하고 이 차량에 할당합니다.';
    } else if (existingLink.status === 'linked') {
        el.textContent = `${existingLink.driverName || '기사'}와 연동 중입니다.`;
    } else {
        el.textContent = `${existingLink.driverName || '기사'} 초대가 대기 중입니다(코드 ${existingLink.inviteCode || '-'}).`;
    }
}

// "내 사업자 정보와 동일" 스위치에 따라 차량 사업자정보 입력 필드 묶음을 접고 편다.
function toggleCarBusinessSameAsOwner() {
    const sameAsOwner = document.getElementById('newCarBizSameAsOwner')?.checked ?? true;
    const group = document.getElementById('newCarBizFieldsGroup');
    if (group) group.style.display = sameAsOwner ? 'none' : 'block';
    const preview = document.getElementById('newCarBizSamePreview');
    if (preview && sameAsOwner) {
        const settings = getUserSettings();
        const parts = [settings.bizName, settings.bizNumber].filter(Boolean);
        preview.textContent = parts.length ? parts.join(' · ') : '마이페이지 개인정보에 사업자정보를 먼저 입력해 주세요.';
    }
}

function selectInfoType(type) {
    const btnExisting = document.getElementById('btnUseExistingInfo');
    const btnNew = document.getElementById('btnUseNewInfo');
    const newInfoForm = document.getElementById('newPersonalInfoForm');

    if (type === 'existing') {
        btnExisting.classList.add('active-work');
        btnNew.classList.remove('active-work');
        newInfoForm.style.display = 'none';
    } else {
        btnNew.classList.add('active-work');
        btnExisting.classList.remove('active-work');
        newInfoForm.style.display = 'block';
    }
}

function resetCarForm() {
    document.getElementById('newCarNumber').value = '';
    document.getElementById('newCarTonnage').value = '';
    document.getElementById('carModalMode').value = 'main';
    document.getElementById('driverBasicInfoFields').style.display = 'none';
    document.getElementById('carBusinessInfoFields').style.display = 'none';
    document.getElementById('logToggleContainer').style.display = 'none';
    updateCarDriverLinkStatusText(null);
    document.getElementById('newLogToggle').checked = false;
    toggleNewLogSettings();
    document.getElementById('newCarInsuranceToggle').checked = false;

    if (document.getElementById('newCarCommToggle')) {
        document.getElementById('newCarCommToggle').checked = false;
        toggleNewCarCommSettings();
    }
    setCarCommType('percent');
    document.getElementById('newCarCommission').value = '';

    selectInfoType('existing');
    document.getElementById('newDriverName').value = '';
    document.getElementById('newUserPhone').value = '';
    // "사용자 기본 설정 사용(default)"은 더 이상 차량에 저장하는 값이 아니다 — 차량관리와
    // 마이페이지에 같은 걸 두 군데서 따로 설정하는 것처럼 보여 혼란을 준다는 피드백에 따라,
    // 계산서 처리 방식은 이제 이 차량 드롭다운 하나가 유일한 설정 지점이다. 새 기사차량을
    // 등록할 때는 가입 때 고른 값(onboardingWizard의 정산방식 질문)을 구체적인 값으로 미리
    // 채워만 주고, 이후엔 이 차량 자체의 값으로 독립적으로 남는다(나중에 계정 기본값이
    // 바뀌어도 이미 등록된 차량엔 영향 없음 — 오히려 그게 자연스럽다).
    const settingsForNewCarDefault = getUserSettings();
    document.getElementById('newCarSettlementMode').value = settingsForNewCarDefault.defaultDriverSettlementMode || 'company';
    document.getElementById('newCarSettlementMode').parentElement?._dropdownSync?.();
    updateDriverSettlementModeGuide();
    document.getElementById('newBankName').value = '';
    document.getElementById('newAccountNumber').value = '';
    if (document.getElementById('newAccountHolder')) document.getElementById('newAccountHolder').value = '';

    // 차량 단위 사업자정보 — 기본값은 "내 사업자 정보와 동일" ON(요구사항 대부분의 기사차량이
    // 차주 사업자 하나로 운영될 것이므로, 매번 새 사업자를 입력해야 하는 부담을 줄인다).
    if (document.getElementById('newCarBizSameAsOwner')) document.getElementById('newCarBizSameAsOwner').checked = true;
    toggleCarBusinessSameAsOwner();
    ['newCarBizName', 'newCarBizNumber', 'newCarBizRepresentative', 'newCarBizAddress', 'newCarBizType', 'newCarBizItem', 'newCarBizEmail']
        .forEach(id => { const input = document.getElementById(id); if (input) input.value = ''; });
    // 기사 월매출 조회는 기본 ON(기존 차량들이 전부 보이던 것과 동일한 기본 동작 유지).
    if (document.getElementById('newCarShareRevenueToggle')) document.getElementById('newCarShareRevenueToggle').checked = true;

    editingCarIndex = -1;
}

function editCar(idx) {
    const settings = getUserSettings();
    if (!settings.cars || !settings.cars[idx]) return;

    const car = settings.cars[idx];
    editingCarIndex = idx; 
    
    document.getElementById('newCarNumber').value = car.number || '';
    document.getElementById('newCarTonnage').value = car.tonnage || '';
    document.getElementById('carModalMode').value = car.type || 'main';
    
    if (car.type === 'main') {
        document.getElementById('carModalTitle').textContent = '차량 정보 수정';
        document.getElementById('driverBasicInfoFields').style.display = 'none';
        document.getElementById('carBusinessInfoFields').style.display = 'none';
        document.getElementById('logToggleContainer').style.display = 'none';
    } else {
        document.getElementById('carModalTitle').textContent = '기사 정보 수정';
        document.getElementById('driverBasicInfoFields').style.display = 'block';
        document.getElementById('carBusinessInfoFields').style.display = 'block';
        document.getElementById('logToggleContainer').style.display = 'block';
    }
    
    if (car.type === 'sub') {
        const linkedDriver = (settings.driverLinks || []).find(link =>
            (car.driverLinkId && link.id === car.driverLinkId)
            || (!car.driverLinkId && link.vehicleNumber === car.number && link.status !== 'disconnected')
        );
        const driverLinkEnabled = !!car.driverLinkEnabled || (!!linkedDriver && !car.logEnabled);
        document.getElementById('newDriverName').value = car.driverName || linkedDriver?.driverName || car.personalInfo?.driverName || '';
        document.getElementById('newUserPhone').value = car.driverPhone || linkedDriver?.phone || car.personalInfo?.phone || '';
        // 예전에 만든 차량 중엔 'default'(계정 기본값을 그대로 따름)로 저장된 것이 남아있을
        // 수 있다 — 그 값은 이제 드롭다운 선택지에 없으므로, 지금 계정 기본값(또는 그마저
        // 없으면 '회사 정산') 기준으로 실제 적용되는 구체적인 값을 대신 보여준다.
        document.getElementById('newCarSettlementMode').value =
            (car.settlementMode && car.settlementMode !== 'default') ? car.settlementMode : (settings.defaultDriverSettlementMode || 'company');
        document.getElementById('newCarSettlementMode').parentElement?._dropdownSync?.();
        updateDriverSettlementModeGuide();
        updateCarDriverLinkStatusText(linkedDriver || null);

        // 차량 단위 사업자정보 — 기존 차량(businessInfo 없음)은 "동일" ON으로 표시한다
        // (getCarBusinessInfo와 동일한 기본값 규칙: 없으면 차주와 동일하게 취급).
        const businessInfo = car.businessInfo;
        const sameAsOwner = !businessInfo || businessInfo.sameAsOwner !== false;
        if (document.getElementById('newCarBizSameAsOwner')) document.getElementById('newCarBizSameAsOwner').checked = sameAsOwner;
        toggleCarBusinessSameAsOwner();
        document.getElementById('newCarBizName').value = !sameAsOwner ? (businessInfo?.name || '') : '';
        document.getElementById('newCarBizNumber').value = !sameAsOwner ? (businessInfo?.bizNumber || '') : '';
        document.getElementById('newCarBizRepresentative').value = !sameAsOwner ? (businessInfo?.representative || '') : '';
        document.getElementById('newCarBizAddress').value = !sameAsOwner ? (businessInfo?.address || '') : '';
        document.getElementById('newCarBizType').value = !sameAsOwner ? (businessInfo?.bizType || '') : '';
        document.getElementById('newCarBizItem').value = !sameAsOwner ? (businessInfo?.bizItem || '') : '';
        document.getElementById('newCarBizEmail').value = !sameAsOwner ? (businessInfo?.email || '') : '';

        // 기사 월매출 조회 — 값이 아예 없는 기존 차량은 기본 ON(이전까지 항상 보이던 것과 동일).
        if (document.getElementById('newCarShareRevenueToggle')) {
            document.getElementById('newCarShareRevenueToggle').checked = isVehicleRevenueSharedWithOwner(car);
        }

        document.getElementById('newCarInsuranceToggle').checked = !!car.insuranceOn;
        
        if (document.getElementById('newCarCommToggle')) {
            document.getElementById('newCarCommToggle').checked = !!car.commEnabled;
            toggleNewCarCommSettings();
        }
        setCarCommType(car.commType || 'percent');
        document.getElementById('newCarCommission').value = car.commission || '';

        if (car.logEnabled && !driverLinkEnabled) {
            document.getElementById('newLogToggle').checked = true;
            toggleNewLogSettings();
            if (car.infoType === 'new') {
                selectInfoType('new');
                if (car.personalInfo) {
                    document.getElementById('newBankName').value = car.personalInfo.bank || '';
                    document.getElementById('newAccountNumber').value = car.personalInfo.account || '';
                    if (document.getElementById('newAccountHolder')) document.getElementById('newAccountHolder').value = car.personalInfo.accountHolder || '';
                }
            } else {
                selectInfoType('existing');
            }
        } else {
            document.getElementById('newLogToggle').checked = false;
            toggleNewLogSettings();
            selectInfoType('existing');
        }
    }

    document.getElementById('carModal').classList.remove('hidden');
}
