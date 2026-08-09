const appState = {
    viewDate: new Date(),
    maintViewDate: new Date(),
    fuelViewDate: new Date(),
    selectedDateKey: null,
    activeLogId: 'main',
    workData: JSON.parse(localStorage.getItem('workData')) || {},
    previousPage: 'main',
    isOffSelected: false,
    currentTempMaintItems: [],
    currentTempCallDetails: [],
    currentTempFuelItems: [],
    isDetailReportView: false,
    currentDetailClientFilter: 'ALL',
    calendarCells: [],
    confirmCallback: null
};

// 기존 변수명과의 호환성을 위한 참조 바인딩 (다른 함수들의 대규모 수정 최소화)
let viewDate = appState.viewDate;
let maintViewDate = appState.maintViewDate;
let fuelViewDate = appState.fuelViewDate;
let selectedDateKey = appState.selectedDateKey;
let activeLogId = appState.activeLogId;
let workData = appState.workData;
let previousPage = appState.previousPage;
let isOffSelected = appState.isOffSelected;
let currentTempMaintItems = appState.currentTempMaintItems;
let currentTempCallDetails = appState.currentTempCallDetails;
let currentTempFuelItems = appState.currentTempFuelItems;
let isDetailReportView = appState.isDetailReportView;
let currentDetailClientFilter = appState.currentDetailClientFilter;
const calendarCells = appState.calendarCells;
let confirmCallback = appState.confirmCallback;

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
function setUserSettings(settings) {
    localStorage.setItem('userSettings', JSON.stringify(settings));
}

function showConfirmModal(msg, callback) {
    document.getElementById('confirmModalText').innerText = msg;
    confirmCallback = callback;
    document.getElementById('confirmModal').classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.add('hidden');
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
            const driverLabel = car.personalInfo && car.personalInfo.driverName ? ` (${car.personalInfo.driverName})` : '';
            
            if (activeLogId === car.number) {
                btn.style.cssText = 'display: flex; align-items: center; gap: 10px; color: var(--sub-text-color); padding-right: 0; opacity: 0.4; cursor: default;';
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                    ${shortNum}${driverLabel} 운행일지
                `;
            } else {
                btn.style.cssText = 'display: flex; align-items: center; gap: 10px; color: var(--sub-text-color); padding-right: 0;';
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                    ${shortNum}${driverLabel} 운행일지
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
}

function showSubCarSettings(carNum) {
    previousPage = 'main'; 
    hideAllPages();
    loadSettings(); 
    document.getElementById('subCarSettingsPage').classList.remove('hidden');
    document.getElementById('subCarSettingsTitle').innerText = `${getShortCarNum(carNum)} 운행 일지 설정`;
}

function switchCarLog(carNum) {
    activeLogId = carNum;
    const bannerImg = document.getElementById('mainBannerImage');
    const bannerTxt = document.getElementById('mainBannerText');

    if (carNum === 'main') {
        if(bannerImg) bannerImg.style.display = 'inline-block';
        if(bannerTxt) bannerTxt.innerText = '운행 일지';
        if(bannerTxt) bannerTxt.classList.remove('sub-banner-text');
        workData = JSON.parse(localStorage.getItem('workData')) || {};
    } else {
        if(bannerImg) bannerImg.style.display = 'none';
        if(bannerTxt) bannerTxt.innerText = `${getShortCarNum(carNum)} 운행 일지`;
        if(bannerTxt) bannerTxt.classList.add('sub-banner-text');
        workData = JSON.parse(localStorage.getItem('workData_' + carNum)) || {};
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

function saveDataToStorage() {
    if (activeLogId === 'main') {
        localStorage.setItem('workData', JSON.stringify(workData));
    } else {
        localStorage.setItem('workData_' + activeLogId, JSON.stringify(workData));
    }
}

function normalizeLegacyData() {
    let dataChanged = false;
    for (let key in workData) {
        if (workData[key] === 'off') {
            workData[key] = {
            isOff: true,
            fixedCount: 0,
            palletCount: 0,
            callFares: [],
            maintItems: [],
            fuelItems: [],
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
    }
    if (dataChanged) {
        saveDataToStorage(); 
    }
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

function changeYearMonth() {
    const y = parseInt(document.getElementById('yearSelect').value, 10);
    const m = parseInt(document.getElementById('monthSelect').value, 10);
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

function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    
    document.getElementById('sideMenu').classList.remove('open');
    document.getElementById('sideMenuOverlay').classList.remove('show');
    
    document.getElementById('pdfDownloadBtn').style.display = 'none';
    
    const pdfGroup = document.getElementById('pdfDropdownGroup');
    if (pdfGroup) pdfGroup.style.display = 'none';
    const pdfMenu = document.getElementById('pdfMenuDropdown');
    if (pdfMenu) pdfMenu.classList.remove('show');

    const backBtn = document.getElementById('subCarBackBtn');
    if (backBtn) backBtn.style.display = 'none';
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
    
    const backBtn = document.getElementById('subCarBackBtn');
    if (backBtn && activeLogId !== 'main') {
        backBtn.style.display = 'flex'; 
    }

    document.getElementById('menuReportBtn').style.display = 'flex';
}

function showPersonalInfo() {
    hideAllPages();
    document.getElementById('personalInfoPage').classList.remove('hidden');
}

function showCarManagement() {
    hideAllPages();
    document.getElementById('carManagementPage').classList.remove('hidden');
    loadCarList();
}

function showClientManagement() {
    hideAllPages();
    document.getElementById('clientManagementPage').classList.remove('hidden');
    renderClientList(); 
}

let editingClientIndex = -1;
let clientOrderEditMode = false;
let clientPressTimer = null;

function toggleClientOrderEditMode() {
    clientOrderEditMode = !clientOrderEditMode;
    renderClientList();
}

function moveClientOrder(idx, direction) {
    const settings = getUserSettings();
    if (!settings.clients || !settings.clients[idx]) return;
    
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= settings.clients.length) return;
    
    // 조건 3 (정렬 로직 유지): 고정 거래처와 일반 거래처 간의 그룹은 섞이지 않도록 차단
    if (settings.clients[idx].isPinned !== settings.clients[targetIdx].isPinned) return;

    // 순서 스왑(Swap)
    const temp = settings.clients[idx];
    settings.clients[idx] = settings.clients[targetIdx];
    settings.clients[targetIdx] = temp;
    
    setUserSettings(settings);
    renderClientList();
}

function renderClientList() {
    const settings = getUserSettings();
    let clients = settings.clients || [];
    const container = document.getElementById('clientListContainer');
    container.innerHTML = '';

    // 항상 '고정 거래처'가 최상단으로 오도록 정렬 (단, 동일 그룹 내의 순서는 유지)
    clients.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
    });
    // 정렬된 상태를 저장소에 갱신하여 렌더링 순서와 실제 데이터 인덱스를 동기화
    settings.clients = clients; 
    setUserSettings(settings);

    // 편집 버튼 및 빈 공간 토글 처리
    const editBtn = document.getElementById('clientOrderEditBtn');
    const spacer = document.getElementById('clientOrderEditSpacer');
    if (clients.length > 0) {
        if (editBtn) editBtn.style.display = 'flex';
        if (spacer) spacer.style.display = 'none';
    } else {
        if (editBtn) editBtn.style.display = 'none';
        if (spacer) spacer.style.display = 'block';
        container.innerHTML = '<div class="empty-state">등록된 거래처가 없습니다.</div>';
        return;
    }

    clients.forEach((client, idx) => {
        let badges = '';
        // 고정 거래처 표시 뱃지
        if (client.isPinned) {
            badges += `<span style="font-size:0.75rem; color:#ffffff; background:var(--primary-color); padding:2px 6px; border-radius:4px; margin-left:6px;">고정</span>`;
        }
        if (client.commEnabled) {
            const badgeText = client.commType === 'direct' ? `${client.commValue}원` : `${client.commValue}%`;
            badges += `<span style="font-size:0.75rem; color:#c05621; background:#feebc8; padding:2px 6px; border-radius:4px; margin-left:4px;">수수료 ${badgeText}</span>`;
        }

        const div = document.createElement('div');
        div.className = 'car-card'; 
        // 편집 모드이면 전용 클래스 부착
        if (clientOrderEditMode) {
            div.classList.add('edit-mode-active');
        }
        
        // --- 롱프레스(길게 누르기) 순서 변경 편집 모드 이벤트 등록 ---
        // 모바일 터치 이벤트
        div.addEventListener('touchstart', () => {
            div.classList.add('sort-active');
            clientPressTimer = setTimeout(() => {
                if (!clientOrderEditMode) toggleClientOrderEditMode();
            }, 600);
        }, {passive: true});
        div.addEventListener('touchend', () => {
            div.classList.remove('sort-active');
            clearTimeout(clientPressTimer);
        });
        div.addEventListener('touchmove', () => {
            div.classList.remove('sort-active');
            clearTimeout(clientPressTimer);
        });

        // 데스크탑 마우스 이벤트
        div.addEventListener('mousedown', () => {
            div.classList.add('sort-active');
            clientPressTimer = setTimeout(() => {
                if (!clientOrderEditMode) toggleClientOrderEditMode();
            }, 600);
        });
        div.addEventListener('mouseup', () => {
            div.classList.remove('sort-active');
            clearTimeout(clientPressTimer);
        });
        div.addEventListener('mouseleave', () => {
            div.classList.remove('sort-active');
            clearTimeout(clientPressTimer);
        });

        div.innerHTML = `
            <div style="display: flex; align-items: center; width: 100%;">
                <div class="order-control-btns">
                    <button onclick="moveClientOrder(${idx}, -1); event.stopPropagation();">▲</button>
                    <button onclick="moveClientOrder(${idx}, 1); event.stopPropagation();">▼</button>
                </div>
                <div style="flex: 1;">
                    <div class="car-info-text">${client.companyName} ${client.managerName ? '(' + client.managerName + ')' : ''} ${badges}</div>
                    <div class="car-sub-text">사업자: ${client.bizNumber || '-'} | 연락처: ${client.phone || '-'}</div>
                </div>
                <div class="car-action-btns">
                    <button class="btn-edit" onclick="openClientModal(${idx}); event.stopPropagation();">수정</button>
                    <button class="btn-del" style="padding: 8px 12px;" onclick="deleteClient(${idx}); event.stopPropagation();">삭제</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function toggleClientPinned() {
    const isPinned = document.getElementById('clientPinnedToggle').checked;
    const subSettings = document.getElementById('clientPinnedSubSettings');
    // 고정 거래처 하위 항목(수수료 토글) 노출 여부
    if (subSettings) {
        subSettings.style.display = isPinned ? 'block' : 'none';
    }
    // 고정 거래처가 OFF가 되면 종속되어있는 수수료 적용 항목도 강제로 리셋 및 OFF 처리
    if (!isPinned) {
        document.getElementById('clientCommToggle').checked = false;
        toggleClientComm();
    }
}

function toggleClientComm() {
    const isChecked = document.getElementById('clientCommToggle').checked;
    document.getElementById('clientCommSection').style.display = isChecked ? 'block' : 'none';
}

function formatCommValue(input) {
    let val = input.value.replace(/[^0-9.]/g, '');
    if (parseFloat(val) > 100) val = '100';
    input.value = val;
}

function setClientCommType(type) {
    const typeEl = document.getElementById('clientCommType');
    if (typeEl) typeEl.value = type;
    
    const btnPercent = document.getElementById('btnCommTypePercent');
    const btnDirect = document.getElementById('btnCommTypeDirect');
    const commLabel = document.getElementById('commLabel');
    const commInput = document.getElementById('clientCommValue');

    if (!btnPercent || !btnDirect || !commLabel || !commInput) return;

    if (type === 'percent') {
        btnPercent.classList.add('active-work');
        btnDirect.classList.remove('active-work');
        commLabel.textContent = '수수료율 (%)';
        commInput.placeholder = '비율(%) 입력';
        let val = commInput.value.replace(/[^0-9.]/g, '');
        if (parseFloat(val) > 100) val = '100';
        commInput.value = val;
    } else {
        btnDirect.classList.add('active-work');
        btnPercent.classList.remove('active-work');
        commLabel.textContent = '수수료 (원)';
        commInput.placeholder = '금액(원) 입력';
        formatCurrencyInput(commInput);
    }
}

function formatClientCommValue(input) {
    const typeEl = document.getElementById('clientCommType');
    const type = typeEl ? typeEl.value : 'percent';
    if (type === 'percent') {
        let val = input.value.replace(/[^0-9.]/g, '');
        if (parseFloat(val) > 100) val = '100';
        input.value = val;
    } else {
        formatCurrencyInput(input);
    }
}

function openClientModal(index = -1) {
    editingClientIndex = index;
    const settings = getUserSettings();
    const clients = settings.clients || [];

    if (index >= 0 && clients[index]) {
        document.getElementById('clientModalTitle').textContent = '거래처 수정';
        document.getElementById('clientCompanyName').value = clients[index].companyName || '';
        document.getElementById('clientManagerName').value = clients[index].managerName || '';
        document.getElementById('clientBizNumber').value = clients[index].bizNumber || '';
        document.getElementById('clientPhone').value = clients[index].phone || '';
        
        // 고정 거래처 세팅
        document.getElementById('clientPinnedToggle').checked = !!clients[index].isPinned;
        toggleClientPinned();

        document.getElementById('clientCommToggle').checked = !!clients[index].commEnabled;
        
        const commType = clients[index].commType || 'percent';
        setClientCommType(commType);
        
        const commInput = document.getElementById('clientCommValue');
        commInput.value = clients[index].commValue || '';
        
        if (commType === 'direct') {
            formatCurrencyInput(commInput);
        } else {
            let val = commInput.value.replace(/[^0-9.]/g, '');
            if (parseFloat(val) > 100) val = '100';
            commInput.value = val;
        }
        toggleClientComm();
    } else {
        document.getElementById('clientModalTitle').textContent = '거래처 등록';
        document.getElementById('clientCompanyName').value = '';
        document.getElementById('clientManagerName').value = '';
        document.getElementById('clientBizNumber').value = '';
        document.getElementById('clientPhone').value = '';
        
        // 고정 거래처 세팅 초기화
        document.getElementById('clientPinnedToggle').checked = false;
        toggleClientPinned();

        document.getElementById('clientCommToggle').checked = false;
        setClientCommType('percent');
        document.getElementById('clientCommValue').value = '';
        toggleClientComm();
    }
    
    document.getElementById('clientModal').classList.remove('hidden');
}

function closeClientModal() {
    document.getElementById('clientModal').classList.add('hidden');
}

function saveClient() {
    const companyName = document.getElementById('clientCompanyName').value.trim();
    const managerName = document.getElementById('clientManagerName').value.trim();
    const bizNumber = document.getElementById('clientBizNumber').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();

    // 고정 거래처 값 및 수수료 토글의 종속 로직 처리
    const isPinned = document.getElementById('clientPinnedToggle').checked;
    const commEnabled = isPinned ? document.getElementById('clientCommToggle').checked : false; // 고정 거래처가 켜져 있을 때만 수수료 값 인정
    const commTypeEl = document.getElementById('clientCommType');
    const commType = commTypeEl ? commTypeEl.value : 'percent';
    const commValue = document.getElementById('clientCommValue').value.trim();

    if (!companyName) {
        showConfirmModal('거래처명을 입력해주세요.', null);
        return;
    }
    if (commEnabled && !commValue) {
        showConfirmModal('수수료 수치/금액을 입력해주세요.', null);
        return;
    }

    const settings = getUserSettings();
    if (!settings.clients) settings.clients = [];

    const clientData = { companyName, managerName, bizNumber, phone, isPinned, commEnabled, commType, commValue };

    if (editingClientIndex >= 0) {
        settings.clients[editingClientIndex] = clientData;
        showToastMessage('수정되었습니다.');
    } else {
        settings.clients.push(clientData);
        showToastMessage('등록되었습니다.');
    }

    setUserSettings(settings);
    closeClientModal();
    renderClientList(); // 이곳에서 자동 재정렬 됨
    buildCalendar(); 
}

function deleteClient(idx) {
    showConfirmModal('해당 업체를 삭제하시겠습니까?', () => {
        const settings = getUserSettings();
        if (settings.clients && settings.clients[idx]) {
            settings.clients.splice(idx, 1);
            setUserSettings(settings);
            showToastMessage('삭제되었습니다.');
            renderClientList();
            buildCalendar(); 
        }
    });
}

function populateClientDataList() {
    const settings = getUserSettings();
    const clients = settings.clients || [];
    const dataList = document.getElementById('clientDataList');
    if (dataList) {
        dataList.innerHTML = '';
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.companyName;
            dataList.appendChild(option);
        });
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

    const container = document.getElementById('carListContainer');
    container.innerHTML = '';

    if (settings.cars.length === 0) {
        container.innerHTML = '<div class="empty-state">등록된 차량이 없습니다.</div>';
    } else {
        settings.cars.forEach((car, idx) => {
            const typeBadge = car.type === 'main' 
                ? '<span style="color:var(--primary-color); font-size:0.8rem; border:1px solid var(--primary-color); padding:2px 4px; border-radius:4px; margin-right:6px;">메인</span>' 
                : '<span style="color:#3182ce; font-size:0.8rem; border:1px solid #3182ce; padding:2px 4px; border-radius:4px; margin-right:6px;">기사</span>';
            
            const driverInfo = car.type === 'sub' && car.personalInfo && car.personalInfo.driverName ? ` [기사: ${car.personalInfo.driverName}]` : '';

            const div = document.createElement('div');
            div.className = 'car-card';
            div.innerHTML = `
                <div>
                    <div class="car-info-text">${typeBadge}${car.number}${driverInfo}</div>
                    <div class="car-sub-text">${car.tonnage ? '(' + car.tonnage + ')' : ''}</div>
                </div>
                <div class="car-action-btns">
                    <button class="btn-edit" onclick="editCar(${idx})">수정</button>
                    <button class="btn-del" style="padding: 8px 12px;" onclick="deleteCar(${idx})">삭제</button>
                </div>
            `;
            container.appendChild(div);
        });
    }
}

function openCarModal(mode = 'main') {
    resetCarForm();
    const modeEl = document.getElementById('carModalMode');
    if (modeEl) modeEl.value = mode;

    const settings = getUserSettings();
    const cars = settings.cars || [];

    if (mode === 'main') {
        let hasMain = cars.some((c, idx) => idx !== editingCarIndex && c.type === 'main');
        if (hasMain && editingCarIndex < 0) {
            showConfirmModal('메인 차량이 이미 등록되어 있습니다.', null);
            return;
        }
        document.getElementById('carModalTitle').textContent = '차량 등록';
        document.getElementById('logToggleContainer').style.display = 'none';
    } else {
        let subCount = cars.filter((c, idx) => idx !== editingCarIndex && c.type === 'sub').length;
        if (subCount >= 3 && editingCarIndex < 0) {
            showConfirmModal('기사 차량은 최대 3대까지 등록 가능합니다.', null);
            return;
        }
        document.getElementById('carModalTitle').textContent = '기사 등록';
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
    if (hiddenType) hiddenType.value = type;

    const btnPercent = document.getElementById('btnCarCommPercent');
    const btnDirect = document.getElementById('btnCarCommDirect');
    const label = document.getElementById('carCommLabel');
    const input = document.getElementById('newCarCommission');

    if (!btnPercent || !btnDirect || !label || !input) return;

    if (type === 'percent') {
        btnPercent.classList.add('active-work');
        btnDirect.classList.remove('active-work');
        label.textContent = '수수료율 (%)';
        input.placeholder = '비율(%) 입력';
        let val = input.value.replace(/[^0-9.]/g, '');
        if (parseFloat(val) > 100) val = '100';
        input.value = val;
    } else {
        btnDirect.classList.add('active-work');
        btnPercent.classList.remove('active-work');
        label.textContent = '수수료 (원)';
        input.placeholder = '금액(원) 입력';
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

function saveNewCar() {
    const num = document.getElementById('newCarNumber').value.trim();
    const ton = document.getElementById('newCarTonnage').value.trim();
    const mode = document.getElementById('carModalMode').value;
    
    if (!num) {
        showConfirmModal('차량번호를 입력하세요.', null);
        return;
    }

    const carType = mode === 'main' ? 'main' : 'sub';
    const settings = getUserSettings();
    if (!settings.cars) settings.cars = [];

    const logEnabled = carType === 'main' ? true : document.getElementById('newLogToggle').checked;
    const insuranceOn = carType === 'sub' ? document.getElementById('newCarInsuranceToggle').checked : false;
    const commType = document.getElementById('newCarCommType').value;
    const commission = document.getElementById('newCarCommission').value.trim();
    
    let infoType = 'existing';
    let personalInfo = null;

    if (carType === 'sub' && logEnabled) {
        const isNewInfo = document.getElementById('btnUseNewInfo').classList.contains('active-work');
        if (isNewInfo) {
            infoType = 'new';
            personalInfo = {
                driverName: document.getElementById('newDriverName').value.trim(),
                name: document.getElementById('newUserName').value.trim(),
                bizNumber: document.getElementById('newBizNumber').value.trim(),
                phone: document.getElementById('newUserPhone').value.trim(),
                bank: document.getElementById('newBankName').value.trim(),
                account: document.getElementById('newAccountNumber').value.trim()
            };
        }
    }

    const carData = { 
        number: num, 
        tonnage: ton, 
        type: carType,
        logEnabled: logEnabled,
        insuranceOn: insuranceOn,
        commType: commType,
        commission: commission,
        infoType: infoType,
        personalInfo: personalInfo
    };

    if (editingCarIndex > -1) {
        settings.cars[editingCarIndex] = carData; 
        showToastMessage('수정되었습니다.');
    } else {
        settings.cars.push(carData); 
        showToastMessage('등록되었습니다.');
    }
    
    setUserSettings(settings);
    
    closeCarModal(); 
    loadCarList();
    renderSubCarMenu();
    updateTransportSettingsUI(); 
}

function deleteCar(idx) {
    showConfirmModal('해당 차량을 삭제하시겠습니까?', () => {
        const settings = getUserSettings();
        const deletedCarNum = settings.cars[idx].number;
        settings.cars.splice(idx, 1);
        setUserSettings(settings);
        
        if (editingCarIndex === idx) resetCarForm();
        loadCarList();
        renderSubCarMenu(); 
        updateTransportSettingsUI(); 
        
        if(activeLogId === deletedCarNum) {
            switchCarLog('main');
        }
    });
}

function showMaintManagement() {
    hideAllPages();
    document.getElementById('maintManagementPage').classList.remove('hidden');
    
    maintViewDate = new Date(viewDate.getTime());
    updateMaintDateSelects();
    renderMaintList();
}

function showFuelManagement() {
    hideAllPages();
    document.getElementById('fuelManagementPage').classList.remove('hidden');
    
    fuelViewDate = new Date(viewDate.getTime());
    updateFuelDateSelects();
    renderFuelList();
}

function updateFuelDateSelects() {
    document.getElementById('fuelYearSelect').value = fuelViewDate.getFullYear();
    document.getElementById('fuelMonthSelect').value = fuelViewDate.getMonth();
}

function changeFuelMonth(delta) {
    fuelViewDate.setMonth(fuelViewDate.getMonth() + delta);
    updateFuelDateSelects();
    renderFuelList();
}

function changeFuelYearMonth() {
    const y = parseInt(document.getElementById('fuelYearSelect').value, 10);
    const m = parseInt(document.getElementById('fuelMonthSelect').value, 10);
    fuelViewDate.setFullYear(y);
    fuelViewDate.setMonth(m);
    renderFuelList();
}

function updateMaintDateSelects() {
    document.getElementById('maintYearSelect').value = maintViewDate.getFullYear();
    document.getElementById('maintMonthSelect').value = maintViewDate.getMonth();
}

function changeMaintMonth(delta) {
    maintViewDate.setMonth(maintViewDate.getMonth() + delta);
    updateMaintDateSelects();
    renderMaintList();
}

function changeMaintYearMonth() {
    const y = parseInt(document.getElementById('maintYearSelect').value, 10);
    const m = parseInt(document.getElementById('maintMonthSelect').value, 10);
    maintViewDate.setFullYear(y);
    maintViewDate.setMonth(m);
    renderMaintList();
}

function selectMaintCategory(btnEl, value) {
    document.querySelectorAll('#maintCategoryGroup .pill-btn').forEach(btn => btn.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    document.getElementById('maintRecordCategory').value = value;
}

function selectMaintPayment(btnEl, value) {
    document.querySelectorAll('#maintPaymentGroup .segment-btn').forEach(btn => btn.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    document.getElementById('maintRecordPayment').value = value;
}

function renderMaintList() {
    const y = maintViewDate.getFullYear();
    const m = String(maintViewDate.getMonth() + 1).padStart(2, '0');
    const prefix = `${y}-${m}-`;
    
    let groupedMaint = {};
    for (let key in workData) {
        if (key.startsWith(prefix) && workData[key].maintItems && workData[key].maintItems.length > 0) {
            groupedMaint[key] = workData[key].maintItems.map((item, index) => {
                return { name: item.name, fare: item.fare, index: index };
            });
        }
    }
    
    const sortedDates = Object.keys(groupedMaint).sort((a, b) => a.localeCompare(b));
    const container = document.getElementById('maintListContainer');
    container.innerHTML = '';
    
    if (sortedDates.length === 0) {
        container.innerHTML = '<div class="empty-state">이번 달 등록된 정비 내역이 없습니다.</div>';
        return;
    }

    sortedDates.forEach(date => {
        const items = groupedMaint[date];
        
        let itemsHtml = items.map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:10px; border-top:1px dashed var(--border-color);">
                <span style="font-weight: 600;">${item.name || '정비 항목'}</span>
                <div style="display:flex; align-items:center; gap: 10px;">
                    <strong style="color:var(--sunday-color);">${parseCurrencyValue(item.fare).toLocaleString()} 원</strong>
                    <div style="display:flex; gap: 6px;">
                        <button class="btn-del" style="background:var(--sub-text-color); padding:6px 10px; min-height:auto;" onclick="openMaintRecordModal('${date}', ${item.index})">수정</button>
                        <button class="btn-del" style="padding:6px 10px; min-height:auto;" onclick="deleteMaintRecord('${date}', ${item.index})">삭제</button>
                    </div>
                </div>
            </div>
        `).join('');

        const div = document.createElement('div');
        div.className = 'setting-section';
        div.style.marginBottom = '10px';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <strong style="color:var(--primary-color); font-size:1.1rem;">${date}</strong>
            </div>
            ${itemsHtml}
        `;
        container.appendChild(div);
    });
}

function openMaintRecordModal(date = null, index = null) {
    let item = null;
    const isFromWorkModal = document.getElementById('workModal').classList.contains('open');

    if (date !== null && index !== null) {
        if (isFromWorkModal && date === selectedDateKey && currentTempMaintItems[index]) {
            item = currentTempMaintItems[index];
        } else if (workData[date] && workData[date].maintItems[index]) {
            item = workData[date].maintItems[index];
        }
    }

    if (item !== null) {
        document.getElementById('maintRecordModalTitle').textContent = '정비 내역 수정';
        document.getElementById('maintRecordDate').value = date;
        document.getElementById('maintRecordName').value = item.name;
        document.getElementById('maintRecordFare').value = parseCurrencyValue(item.fare).toLocaleString();
        
        document.getElementById('maintRecordMileage').value = item.mileage || '';
        
        const category = item.category || '';
        document.getElementById('maintRecordCategory').value = category;
        document.querySelectorAll('#maintCategoryGroup .pill-btn').forEach(btn => {
            if(btn.textContent.trim() === category) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        const payment = item.payment || '카드';
        document.getElementById('maintRecordPayment').value = payment;
        document.querySelectorAll('#maintPaymentGroup .segment-btn').forEach(btn => {
            if(btn.textContent.trim() === payment) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        document.getElementById('maintRecordOriginalDate').value = date;
        document.getElementById('maintRecordOriginalIndex').value = index;
    } else {
        document.getElementById('maintRecordModalTitle').textContent = '정비 내역 추가';
        const y = maintViewDate.getFullYear();
        const m = String(maintViewDate.getMonth() + 1).padStart(2, '0');
        const d = String(new Date().getDate()).padStart(2, '0');
        
        const currentMonth = new Date().getMonth();
        const selectedMonth = maintViewDate.getMonth();
        document.getElementById('maintRecordDate').value = (currentMonth === selectedMonth) ? `${y}-${m}-${d}` : `${y}-${m}-01`;
        
        if (isFromWorkModal && selectedDateKey) {
            document.getElementById('maintRecordDate').value = selectedDateKey;
        }

        document.getElementById('maintRecordName').value = '';
        document.getElementById('maintRecordFare').value = '';
        
        document.getElementById('maintRecordMileage').value = '';
        document.getElementById('maintRecordCategory').value = '';
        document.querySelectorAll('#maintCategoryGroup .pill-btn').forEach(btn => btn.classList.remove('active'));
        
        document.getElementById('maintRecordPayment').value = '카드';
        document.querySelectorAll('#maintPaymentGroup .segment-btn').forEach(btn => {
            if(btn.textContent.trim() === '카드') btn.classList.add('active');
            else btn.classList.remove('active');
        });
        
        document.getElementById('maintRecordOriginalDate').value = '';
        document.getElementById('maintRecordOriginalIndex').value = '';
    }
    document.getElementById('maintRecordModal').classList.remove('hidden');
}

function closeMaintRecordModal() {
    document.getElementById('maintRecordModal').classList.add('hidden');
}

function saveMaintRecord() {
    const date = document.getElementById('maintRecordDate').value; 
    const name = document.getElementById('maintRecordName').value.trim();
    const fare = document.getElementById('maintRecordFare').value.trim();
    
    const mileage = document.getElementById('maintRecordMileage').value.trim();
    const category = document.getElementById('maintRecordCategory').value;
    const payment = document.getElementById('maintRecordPayment').value;

    const origDate = document.getElementById('maintRecordOriginalDate').value;
    const origIndex = document.getElementById('maintRecordOriginalIndex').value;

    if (!date) {
        showConfirmModal('날짜를 선택하세요.', null);
        return;
    }
    if (!name && !fare) {
        showConfirmModal('정비 항목명 또는 비용을 입력하세요.', null);
        return;
    }

    const newItem = { 
        name: name, 
        fare: fare,
        mileage: mileage,
        category: category,
        payment: payment
    };

    if (document.getElementById('workModal').classList.contains('open')) {
        if (origIndex !== '') {
            currentTempMaintItems[origIndex] = newItem;
        } else {
            currentTempMaintItems.push(newItem);
        }
        renderMaintSummaryInMainModal();
        autoSaveWorkRecord();
    } else {
        if (origDate && origIndex !== '') {
            workData[origDate].maintItems.splice(parseInt(origIndex, 10), 1);
        }

        if (!workData[date]) {
            workData[date] = { isOff: false, fixedCount: 0, palletCount: 0, callFares: [], maintItems: [], callDetails: [] };
        }
        if (!workData[date].maintItems) {
            workData[date].maintItems = [];
        }

        workData[date].maintItems.push(newItem);
        
        saveDataToStorage();
        
        const updatedDate = new Date(date);
        maintViewDate.setFullYear(updatedDate.getFullYear());
        maintViewDate.setMonth(updatedDate.getMonth());
        updateMaintDateSelects();
        renderMaintList();
        buildCalendar(); 
    }
    
    closeMaintRecordModal();
    showToastMessage('저장되었습니다.');
}

function deleteMaintRecord(date, index) {
    showConfirmModal('삭제하시겠습니까?', () => {
        workData[date].maintItems.splice(index, 1);
        saveDataToStorage(); 
        renderMaintList();
        showToastMessage('삭제되었습니다.');
        buildCalendar();
    });
}

// ========== 주유 내역 관련 로직 ==========
function renderFuelList() {
    const y = fuelViewDate.getFullYear();
    const m = String(fuelViewDate.getMonth() + 1).padStart(2, '0');
    const prefix = `${y}-${m}-`;
    
    let groupedFuel = {};
    for (let key in workData) {
        if (key.startsWith(prefix) && workData[key].fuelItems && workData[key].fuelItems.length > 0) {
            groupedFuel[key] = workData[key].fuelItems.map((item, index) => {
                return { type: item.type, cost: item.cost, liter: item.liter, index: index };
            });
        }
    }
    
    const sortedDates = Object.keys(groupedFuel).sort((a, b) => a.localeCompare(b));
    const container = document.getElementById('fuelListContainer');
    container.innerHTML = '';
    
    if (sortedDates.length === 0) {
        container.innerHTML = '<div class="empty-state">이번 달 등록된 주유 내역이 없습니다.</div>';
        return;
    }

    sortedDates.forEach(date => {
        const items = groupedFuel[date];
        
        let itemsHtml = items.map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:10px; border-top:1px dashed var(--border-color);">
                <span style="font-weight: 600;">${item.type || '주유'} ${item.liter ? `(${item.liter}L)` : ''}</span>
                <div style="display:flex; align-items:center; gap: 10px;">
                    <strong style="color:var(--primary-color);">${parseCurrencyValue(item.cost).toLocaleString()} 원</strong>
                    <div style="display:flex; gap: 6px;">
                        <button class="btn-del" style="background:var(--sub-text-color); padding:6px 10px; min-height:auto;" onclick="openFuelDetailModal('${date}', ${item.index})">수정</button>
                        <button class="btn-del" style="padding:6px 10px; min-height:auto;" onclick="deleteFuelRecord('${date}', ${item.index})">삭제</button>
                    </div>
                </div>
            </div>
        `).join('');

        const div = document.createElement('div');
        div.className = 'setting-section';
        div.style.marginBottom = '10px';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <strong style="color:var(--primary-color); font-size:1.1rem;">${date}</strong>
            </div>
            ${itemsHtml}
        `;
        container.appendChild(div);
    });
}

function openMaintFuelSelectModal() {
    document.getElementById('maintFuelSelectModal').classList.remove('hidden');
}

function closeMaintFuelSelectModal() {
    document.getElementById('maintFuelSelectModal').classList.add('hidden');
}

function selectMaintOption() {
    closeMaintFuelSelectModal();
    openMaintRecordModal();
}

function selectFuelOption() {
    closeMaintFuelSelectModal();
    openFuelDetailModal(selectedDateKey);
}

function openFuelDetailModal(date = null, index = null) {
    let isFromWorkModal = false;
    
    let targetDate = date;
    if (!date) {
        const y = fuelViewDate.getFullYear();
        const m = String(fuelViewDate.getMonth() + 1).padStart(2, '0');
        const d = String(new Date().getDate()).padStart(2, '0');
        targetDate = `${y}-${m}-${d}`;
    } else if (date === selectedDateKey && index === null) {
        isFromWorkModal = true;
    }

    document.getElementById('fuelDetailDate').value = targetDate;
    document.getElementById('fuelOriginalDate').value = date || '';
    document.getElementById('fuelOriginalIndex').value = index !== null ? index : '';

    document.getElementById('fuelDetailCost').value = '';
    document.getElementById('fuelDetailSubsidy').value = '';
    document.getElementById('fuelDetailLiter').value = '';
    document.getElementById('fuelDetailMileage').value = '';
    selectFuelType(document.querySelector('#fuelTypeGroup .pill-btn'), '주유');

    if (date && index !== null) {
        const item = workData[date]?.fuelItems[index];
        if (item) {
            document.getElementById('fuelDetailCost').value = item.cost || '';
            document.getElementById('fuelDetailSubsidy').value = item.subsidy || '';
            document.getElementById('fuelDetailLiter').value = item.liter || '';
            document.getElementById('fuelDetailMileage').value = item.mileage || '';
            const btns = document.querySelectorAll('#fuelTypeGroup .pill-btn');
            const targetBtn = Array.from(btns).find(b => b.textContent === item.type);
            selectFuelType(targetBtn || btns[0], item.type || '주유');
        }
    } else if (isFromWorkModal && index !== null && currentTempFuelItems[index]) {
        const item = currentTempFuelItems[index];
        document.getElementById('fuelDetailCost').value = item.cost || '';
        document.getElementById('fuelDetailSubsidy').value = item.subsidy || '';
        document.getElementById('fuelDetailLiter').value = item.liter || '';
        document.getElementById('fuelDetailMileage').value = item.mileage || '';
        const btns = document.querySelectorAll('#fuelTypeGroup .pill-btn');
        const targetBtn = Array.from(btns).find(b => b.textContent === item.type);
        selectFuelType(targetBtn || btns[0], item.type || '주유');
    }

    document.getElementById('fuelDetailModal').classList.remove('hidden');
}

function closeFuelDetailModal() {
    document.getElementById('fuelDetailModal').classList.add('hidden');
}

function selectFuelType(btnEl, type) {
    document.querySelectorAll('#fuelTypeGroup .pill-btn').forEach(btn => btn.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    document.getElementById('fuelDetailType').value = type;
}

function saveFuelDetail() {
    const date = document.getElementById('fuelDetailDate').value;
    const cost = document.getElementById('fuelDetailCost').value.trim();
    const subsidy = document.getElementById('fuelDetailSubsidy').value.trim();
    const type = document.getElementById('fuelDetailType').value;
    const liter = document.getElementById('fuelDetailLiter').value.trim();
    const mileage = document.getElementById('fuelDetailMileage').value.trim();
    
    const origDate = document.getElementById('fuelOriginalDate').value;
    const origIndex = document.getElementById('fuelOriginalIndex').value;

    if (!date) {
        showConfirmModal('날짜를 입력하세요.', null);
        return;
    }
    if (!cost && !liter) {
        showConfirmModal('비용 또는 주유량을 입력하세요.', null);
        return;
    }

    const newItem = { date, cost, subsidy, type, liter, mileage };

    if (document.getElementById('workModal').classList.contains('open')) {
        if (origIndex !== '') {
            currentTempFuelItems[origIndex] = newItem;
        } else {
            currentTempFuelItems.push(newItem);
        }
        renderFuelSummaryInMainModal();
        autoSaveWorkRecord();
    } else {
        if (origDate && origIndex !== '') {
            workData[origDate].fuelItems.splice(parseInt(origIndex, 10), 1);
        }

        if (!workData[date]) {
            workData[date] = { isOff: false, fixedCount: 0, palletCount: 0, callFares: [], maintItems: [], fuelItems: [], callDetails: [] };
        }
        if (!workData[date].fuelItems) {
            workData[date].fuelItems = [];
        }
        
        workData[date].fuelItems.push(newItem);
        saveDataToStorage();
        
        const updatedDate = new Date(date);
        fuelViewDate.setFullYear(updatedDate.getFullYear());
        fuelViewDate.setMonth(updatedDate.getMonth());
        updateFuelDateSelects();
        renderFuelList();
        buildCalendar();
    }

    showToastMessage('저장되었습니다.');
    closeFuelDetailModal();
}

function deleteFuelRecord(date, index) {
    showConfirmModal('삭제하시겠습니까?', () => {
        workData[date].fuelItems.splice(index, 1);
        saveDataToStorage(); 
        renderFuelList();
        showToastMessage('삭제되었습니다.');
        buildCalendar();
    });
}

function renderFuelSummaryInMainModal() {
    const container = document.getElementById('fuelSummaryContainer');
    const listCard = document.getElementById('fuelSummaryList');

    if (currentTempFuelItems.length === 0) {
        container.style.display = 'none';
        listCard.innerHTML = '';
    } else {
        container.style.display = 'block';
        let html = '';
        let total = 0;
        currentTempFuelItems.forEach((item, idx) => {
            const costVal = parseCurrencyValue(item.cost);
            total += costVal;
            
            let subInfo = [];
            if(item.mileage) subInfo.push(`누적 ${item.mileage}km`);
            let subInfoHtml = subInfo.length > 0 ? `<div style="font-size: 0.8rem; color: var(--sub-text-color); margin-top: 4px;">${subInfo.join(' | ')}</div>` : '';

            html += `
                <div class="maint-summary-item" style="align-items: flex-start; padding:12px; margin-bottom:8px; border-radius:12px; background-color: var(--card-bg); border: 1px solid var(--border-color); flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: flex-start;">
                        <div>
                            <div style="display:flex; align-items:center; gap:6px; font-weight: 700;">
                                <svg class="inline-icon sm" viewBox="0 0 24 24" style="stroke: var(--primary-color);"><path d="M3 22v-8c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v8M11 22H3M15 22v-5l-3-3V6c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2M20 9v5l-3 3"></path></svg>
                                ${item.type} ${item.liter ? `(${item.liter}L)` : ''}
                            </div>
                            ${subInfoHtml}
                        </div>
                        <div style="display:flex; gap: 2px; flex-shrink: 0; margin-top: -4px; margin-right: -4px;">
                            <button type="button" class="action-icon-btn" onclick="openFuelDetailModal('${selectedDateKey}', ${idx})" title="수정">
                                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button type="button" class="action-icon-btn del" onclick="currentTempFuelItems.splice(${idx}, 1); renderFuelSummaryInMainModal(); autoSaveWorkRecord();" title="삭제">
                                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div style="width: 100%; text-align: right; font-weight: 700; margin-top: 8px;">
                        ${costVal.toLocaleString()}원
                    </div>
                </div>
            `;
        });
        html += `
            <div class="maint-summary-item" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--border-color); font-weight:800; color: var(--primary-color);">
                <span>주유 합계</span>
                <span>${total.toLocaleString()}원</span>
            </div>
        `;
        listCard.innerHTML = html;
    }
}

function showSettings(fromPage) {
    if (fromPage) previousPage = fromPage;
    loadSettings();
    hideAllPages();
    document.getElementById('settingsPage').classList.remove('hidden');
}

function goBackFromSettings() {
    loadSettings();
    if (previousPage === 'report') {
        showReport();
    } else {
        showMain();
    }
}

function showReport() {
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
    const callDetailOn = isMain ? savedSettings.callDetailOn : savedSettings.subCallDetailOn;

    if (callDetailOn) {
        document.getElementById('pdfDropdownGroup').style.display = 'block';
        document.getElementById('pdfDownloadBtn').style.display = 'none';
    } else {
        document.getElementById('pdfDropdownGroup').style.display = 'none';
        document.getElementById('pdfDownloadBtn').style.display = 'flex';
    }

    document.getElementById('menuReportBtn').style.display = 'none';
    
    isDetailReportView = false;
    buildReportPage(false); 
}

function handleReportBack() {
    if (isDetailReportView) {
        isDetailReportView = false;
        buildReportPage(false);
    } else {
        showMain();
    }
}

function openReportCarSelectModal(cars) {
    const listContainer = document.getElementById('reportCarSelectList');
    listContainer.innerHTML = '';

    cars.forEach(car => {
        if (car.type === 'main' || (car.type === 'sub' && car.logEnabled)) {
            const btn = document.createElement('button');
            btn.className = 'btn-add'; 
            btn.style.borderColor = 'var(--primary-color)';
            btn.style.color = 'var(--primary-color)';
            btn.style.fontWeight = '700';
            
            let displayName = car.type === 'main' ? `메인차량(${car.number})` : `보조차량(${car.number})`;
            btn.textContent = displayName;
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
    document.getElementById('fixedSubSettings').style.display = checked ? 'block' : 'none';
}

function toggleSubFixedSettings() {
    const checked = document.getElementById('subFixedToggle').checked;
    const subFixedSection = document.getElementById('subFixedSubSettings');
    if(subFixedSection) subFixedSection.style.display = checked ? 'block' : 'none';
}

function togglePalletSubSettings() {
    const checked = document.getElementById('palletToggle').checked;
    document.getElementById('palletSubSettings').style.display = checked ? 'flex' : 'none';
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

function toggleSubPalletSubSettings() {
    const checked = document.getElementById('subPalletToggle').checked;
    document.getElementById('subPalletSubSettings').style.display = checked ? 'flex' : 'none';
}

function showToastMessage(msg = "저장되었습니다.") {
    const toast = document.getElementById('toastMessage');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 1200);
}

function saveSettings() {
    const settings = getUserSettings();
    
    const mainInputModeBtn = document.getElementById('btnInputModeFare');
    if (mainInputModeBtn) {
        settings.inputMode = mainInputModeBtn.classList.contains('active-work') ? 'fare' : 'count';
    }
    
    settings.fixedOn = document.getElementById('fixedToggle').checked;
    settings.unitPrice = document.getElementById('unitPrice').value;
    settings.palletOn = document.getElementById('palletToggle').checked;
    settings.palletPrice = document.getElementById('palletPrice').value;
    
    // 조건 항목 저장
    settings.callDetailOn = document.getElementById('callDetailToggle').checked;
    settings.paymentOn = document.getElementById('paymentToggle').checked;
    settings.timeOn = document.getElementById('timeToggle') ? document.getElementById('timeToggle').checked : false;
    settings.platformOn = document.getElementById('platformToggle') ? document.getElementById('platformToggle').checked : false;
    settings.distanceOn = document.getElementById('distanceToggle') ? document.getElementById('distanceToggle').checked : false;

    if (document.getElementById('subFixedToggle')) {
        const subInputModeBtn = document.getElementById('btnSubInputModeFare');
        if (subInputModeBtn) {
            settings.subInputMode = subInputModeBtn.classList.contains('active-work') ? 'fare' : 'count';
        }

        settings.subFixedOn = document.getElementById('subFixedToggle').checked;
        settings.subUnitPrice = document.getElementById('subUnitPrice').value;
        settings.subPalletOn = document.getElementById('subPalletToggle').checked;
        settings.subPalletPrice = document.getElementById('subPalletPrice').value;
        
        // 보조 조건 항목 저장
        settings.subCallDetailOn = document.getElementById('subCallDetailToggle').checked;
        settings.subPaymentOn = document.getElementById('subPaymentToggle') ? document.getElementById('subPaymentToggle').checked : false;
    }

    setUserSettings(settings);
    buildCalendar(); 
}

function savePersonalInfo() {
    const settings = getUserSettings();
    settings.userName = document.getElementById('userName').value;
    settings.userPhone = document.getElementById('userPhone').value;
    settings.bankName = document.getElementById('bankName').value;
    settings.accountNumber = document.getElementById('accountNumber').value;
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
        document.getElementById('unitPrice').value = savedSettings.unitPrice || '';
        document.getElementById('palletToggle').checked = !!savedSettings.palletOn;
        document.getElementById('palletPrice').value = savedSettings.palletPrice || '';

        // 세부 입력은 항상 켜져 있는 상태를 기본으로 처리
        document.getElementById('callDetailToggle').checked = savedSettings.hasOwnProperty('callDetailOn') ? !!savedSettings.callDetailOn : true;
        document.getElementById('paymentToggle').checked = !!savedSettings.paymentOn;
        if(document.getElementById('timeToggle')) document.getElementById('timeToggle').checked = !!savedSettings.timeOn;
        if(document.getElementById('platformToggle')) document.getElementById('platformToggle').checked = !!savedSettings.platformOn;
        if(document.getElementById('distanceToggle')) document.getElementById('distanceToggle').checked = !!savedSettings.distanceOn;

        if (document.getElementById('subFixedToggle')) {
            if (savedSettings.subInputMode === 'fare') {
                setInputMode('fare', 'sub');
            } else {
                setInputMode('count', 'sub');
            }
            
            document.getElementById('subFixedToggle').checked = !!savedSettings.subFixedOn;
            document.getElementById('subUnitPrice').value = savedSettings.subUnitPrice || '';
            document.getElementById('subPalletToggle').checked = !!savedSettings.subPalletOn;
            document.getElementById('subPalletPrice').value = savedSettings.subPalletPrice || '';

            document.getElementById('subCallDetailToggle').checked = savedSettings.hasOwnProperty('subCallDetailOn') ? !!savedSettings.subCallDetailOn : true;
            if(document.getElementById('subPaymentToggle')) document.getElementById('subPaymentToggle').checked = !!savedSettings.subPaymentOn;
            
            toggleSubFixedSettings();
            toggleSubPalletSubSettings();
            updateToggleDependencies('sub');
        }

        document.getElementById('userName').value = savedSettings.userName || '';
        document.getElementById('userPhone').value = savedSettings.userPhone || '';
        document.getElementById('bankName').value = savedSettings.bankName || '';
        document.getElementById('accountNumber').value = savedSettings.accountNumber || '';

        toggleFixedSubSettings();
        togglePalletSubSettings();
        updateToggleDependencies('main');
    }
}

// 스위치 간의 종속성을 관리하는 새로운 함수 (하단에 추가)
function updateToggleDependencies(type) {
    if (type === 'main') {
        const fixedToggle = document.getElementById('fixedToggle');
        const callDetailToggle = document.getElementById('callDetailToggle');
        const callDetailSubSettings = document.getElementById('callDetailSubSettings');

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

        // 조건 1: 운행 일지 세부 입력 토글 상태에 따른 하위 그룹 표시/숨김
        if (callDetailSubSettings) {
            if (!callDetailToggle.checked) {
                callDetailSubSettings.style.display = 'none';
                if(paymentToggle) paymentToggle.checked = false;
                if(timeToggle) timeToggle.checked = false;
                if(platformToggle) platformToggle.checked = false;
                if(distanceToggle) distanceToggle.checked = false;
            } else {
                callDetailSubSettings.style.display = 'block';
            }
        }
    } else {
        const subFixedToggle = document.getElementById('subFixedToggle');
        const subCallDetailToggle = document.getElementById('subCallDetailToggle');
        const subCallDetailSubSettings = document.getElementById('subCallDetailSubSettings');

        if (!subFixedToggle || !subCallDetailToggle) return;

        if (!subFixedToggle.checked) {
            subCallDetailToggle.checked = true;
            subCallDetailToggle.disabled = true;
        } else {
            subCallDetailToggle.disabled = false;
        }

        if (subCallDetailSubSettings) {
            if (!subCallDetailToggle.checked) {
                subCallDetailSubSettings.style.display = 'none';
            } else {
                subCallDetailSubSettings.style.display = 'block';
            }
        }
    }
}

function exportData() {
    const backupData = {
        userSettings: getUserSettings(),
        workData: JSON.parse(localStorage.getItem('workData')) || {},
        subWorkData: {}, 
        theme: localStorage.getItem('theme') || 'light'
    };
    
    if (backupData.userSettings.cars) {
        backupData.userSettings.cars.forEach(car => {
            if (car.type === 'sub' && car.logEnabled) {
                backupData.subWorkData[car.number] = JSON.parse(localStorage.getItem('workData_' + car.number)) || {};
            }
        });
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    const todayStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `운송내역_백업_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported.userSettings) setUserSettings(imported.userSettings);
            if (imported.workData) {
                localStorage.setItem('workData', JSON.stringify(imported.workData));
            }
            
            if (imported.subWorkData) {
                for (let carNum in imported.subWorkData) {
                    localStorage.setItem('workData_' + carNum, JSON.stringify(imported.subWorkData[carNum]));
                }
            }

            if (activeLogId === 'main') {
                workData = imported.workData || {};
            } else {
                workData = imported.subWorkData[activeLogId] || {};
            }
            normalizeLegacyData(); 
            
            if (imported.theme) localStorage.setItem('theme', imported.theme);

            showToastMessage('복원되었습니다!');
            loadSettings();
            buildCalendar();
            renderSubCarMenu(); 
        } catch (err) {
            showConfirmModal('올바르지 않은 백업 파일입니다.', null);
        }
    };
    reader.readAsText(file);
}

function changeMonth(delta) {
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
    }

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const totalWeeks = Math.ceil((firstDay + lastDate) / 7);
    const totalVisibleCells = totalWeeks * 7;

    let monthTotalWork = 0;
    let monthTotalFare = 0;
    let monthTotalPalletFare = 0;
    let monthTotalMaintFare = 0;
    let monthTotalCommission = 0;
    let monthTotalDistance = 0; 
    let monthTotalUnpaid = 0; // 미수금 총액 합산 변수 추가

    let defaultBaseFare = 0; 
    let monthFareByClient = {}; 
    let monthCommByClient = {};
    let clientCommLabels = {};

    const savedSettings = getUserSettings();
    const isMain = activeLogId === 'main';
    const activeFixedOn = isMain ? savedSettings.fixedOn : savedSettings.subFixedOn;
    const activePalletOn = isMain ? savedSettings.palletOn : savedSettings.subPalletOn;
    
    const displayMode = isMain ? (savedSettings.inputMode || 'count') : (savedSettings.subInputMode || 'count');

    const fixedUnitPrice = parseCurrencyValue(isMain ? savedSettings.unitPrice : savedSettings.subUnitPrice);
    const palletUnitPrice = parseCurrencyValue(isMain ? savedSettings.palletPrice : savedSettings.subPalletPrice);

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
                let dayDefaultFare = 0; 
                let hasUnpaidToday = false; // 오늘 하루에 미수 건이 하나라도 있는지 확인

                if (record.fixedCount > 0) {
                    dayWorkCount += parseInt(record.fixedCount, 10);
                    let fAmount = record.fixedCount * fixedUnitPrice;
                    dayFare += fAmount;
                    dayDefaultFare += fAmount;
                }
                
                if (record.palletCount > 0 && activeFixedOn && activePalletOn) {
                    dayPalletFare += record.palletCount * palletUnitPrice;
                }
                
                if (record.callFares && record.callFares.length > 0) {
                    dayWorkCount += record.callFares.length;
                    const callSum = record.callFares.reduce((a, b) => a + parseCurrencyValue(b), 0);
                    dayFare += callSum;
                    dayDefaultFare += callSum;
                }
                
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

                        monthTotalDistance += parseFloat(detail.distanceKm) || 0;

                        let gross = parseCurrencyValue(detail.fare);
                        
                        // 미수금 로직 (결제 기능이 켜져있고, 수금이 아닐 때 합산)
                        if (savedSettings.paymentOn) {
                            let payStatus = detail.paymentStatus || '미수';
                            if (payStatus === '미수') {
                                hasUnpaidToday = true;
                                monthTotalUnpaid += gross;
                            }
                        }

                        let comm = 0;
                        let clientName = detail.client ? detail.client.trim() : '';
                        let isRegisteredClient = false;

                        if (clientName) {
                            const clientObj = savedSettings.clients?.find(c => c.companyName === clientName);
                            if (clientObj) {
                                isRegisteredClient = true;
                                if (clientObj.commEnabled) {
                                    if (clientObj.commType === 'percent' || !clientObj.commType) {
                                        comm = Math.floor(gross * (parseFloat(clientObj.commValue) / 100));
                                        clientCommLabels[clientName] = `${clientObj.commValue}%`;
                                    } else {
                                        comm = parseCurrencyValue(clientObj.commValue);
                                        clientCommLabels[clientName] = `${comm.toLocaleString()}원`;
                                    }
                                    monthCommByClient[clientName] = (monthCommByClient[clientName] || 0) + comm;
                                }
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
                
                defaultBaseFare += dayDefaultFare;

                if (dayWorkCount > 0) {
                    monthTotalWork += dayWorkCount;
                    monthTotalFare += dayFare;

                    const badge = document.createElement('span');
                    badge.classList.add('work-badge');
                    
                    if (displayMode === 'fare') {
                        badge.textContent = formatFareShort(dayFare + dayPalletFare);
                    } else {
                        badge.textContent = `${dayWorkCount}회`;
                    }
                    
                    cell.appendChild(badge);
                } else if (dayPalletFare > 0) {
                    monthTotalPalletFare += dayPalletFare;
                    
                    if (displayMode === 'fare') {
                        const badge = document.createElement('span');
                        badge.classList.add('work-badge');
                        badge.textContent = formatFareShort(dayPalletFare);
                        cell.appendChild(badge);
                    }
                }

                if (record.maintItems && record.maintItems.length > 0) {
                    const maintSum = record.maintItems.reduce((a, b) => a + parseCurrencyValue(b.fare), 0);
                    if (maintSum > 0) {
                        monthTotalMaintFare += maintSum;
                        const maintBadge = document.createElement('span');
                        maintBadge.classList.add('maint-badge');
                        maintBadge.textContent = formatFareShort(maintSum);
                        cell.appendChild(maintBadge);
                    }
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
    let subCarCommLabel = '보조차량 수수료';
    if (activeLogId !== 'main') {
        const currentCar = savedSettings.cars?.find(c => c.number === activeLogId);
        if (currentCar && currentCar.logEnabled && currentCar.commission) {
            const commPercent = parseFloat(currentCar.commission);
            if (!isNaN(commPercent) && commPercent > 0) {
                subCarComm = Math.floor((monthTotalFare + monthTotalPalletFare - monthTotalCommission) * (commPercent / 100));
                subCarCommLabel = `${getShortCarNum(currentCar.number)} 차량 ${commPercent}%`;
            }
        }
    }

    const isDistanceOn = !!savedSettings.distanceOn;
    updateSummary(monthTotalWork, monthTotalFare, monthTotalPalletFare, monthTotalMaintFare, monthTotalCommission, subCarComm, subCarCommLabel, defaultBaseFare, monthFareByClient, monthCommByClient, clientCommLabels, monthTotalDistance, isDistanceOn);
}

function updateSummary(totalCount, fareTotal, palletTotal, maintTotal, commissionTotal = 0, subCarComm = 0, subCarCommLabel = '', defaultBaseFare = 0, monthFareByClient = {}, monthCommByClient = {}, clientCommLabels = {}, monthTotalDistance = 0, isDistanceOn = false) {
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
        if (defaultBaseFare > 0 || Object.keys(monthFareByClient).length === 0) {
            html += `
                <div class="summary-row">
                    <span>기본 운송료</span>
                    <span class="summary-value">${defaultBaseFare.toLocaleString()} 원</span>
                </div>
            `;
        }
        for (let client in monthFareByClient) {
            html += `
                <div class="summary-row">
                    <span>${client} 기본 운송료</span>
                    <span class="summary-value">${monthFareByClient[client].toLocaleString()} 원</span>
                </div>
            `;
            if (monthCommByClient[client] > 0) {
                html += `
                    <div class="summary-row">
                        <span style="padding-left: 10px; font-size: 0.9rem; color: var(--sub-text-color);">└ ${client} 수수료 (${clientCommLabels[client]})</span>
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
    const activePalletOn = isMain ? savedSettings.palletOn : savedSettings.subPalletOn;

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
}

function openModal(dateKey, month, day) {
    selectedDateKey = dateKey;
    document.getElementById('modalTitle').textContent = `${month}월 ${day}일 운행 내역 입력`;

    const savedSettings = getUserSettings();
    const isMain = activeLogId === 'main';
    const fixedOn = isMain ? savedSettings.fixedOn : savedSettings.subFixedOn;
    const palletOn = isMain ? savedSettings.palletOn : savedSettings.subPalletOn;
    const callOn = isMain ? savedSettings.callOn : savedSettings.subCallOn;
    const callDetailOn = isMain ? savedSettings.callDetailOn : savedSettings.subCallDetailOn;
    
    document.getElementById('modalFixedSection').style.display = fixedOn ? 'block' : 'none';
    document.getElementById('modalPalletSection').style.display = (fixedOn && palletOn) ? 'block' : 'none';
    document.getElementById('modalCallSection').style.display = callOn ? 'block' : 'none';
    document.getElementById('modalCallDetailSection').style.display = callDetailOn ? 'block' : 'none';

    const record = workData[dateKey];
    const callContainer = document.getElementById('callListContainer');
    callContainer.innerHTML = '';

    currentTempMaintItems = [];
    currentTempCallDetails = [];
    currentTempFuelItems = [];

    if (record) {
        setOffState(!!record.isOff);
        document.getElementById('modalFixedCountInput').value = record.fixedCount || '';
        document.getElementById('modalPalletCount').value = record.palletCount || '';

        if (record.callFares && record.callFares.length > 0) {
            record.callFares.forEach(val => addCallInputRow(val));
        }
        if (record.maintItems && record.maintItems.length > 0) {
            currentTempMaintItems = JSON.parse(JSON.stringify(record.maintItems));
        }
        if (record.fuelItems && record.fuelItems.length > 0) {
            currentTempFuelItems = JSON.parse(JSON.stringify(record.fuelItems));
        }
        if (record.callDetails && record.callDetails.length > 0) {
            currentTempCallDetails = JSON.parse(JSON.stringify(record.callDetails));
        }
    } else {
        setOffState(false);
        document.getElementById('modalFixedCountInput').value = '';
        document.getElementById('modalPalletCount').value = '';
    }

    renderMaintSummaryInMainModal();
    renderFuelSummaryInMainModal();
    renderCallDetailSummaryInMainModal();
    document.getElementById('workModal').classList.add('open');
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

function addCallInputRow(val = '') {
    if (isOffSelected) setOffState(false);
    const container = document.getElementById('callListContainer');
    const div = document.createElement('div');
    div.className = 'call-item-row';
    div.innerHTML = `
        <input type="text" class="input-box call-fare-input" inputmode="numeric" placeholder="운송료 입력" value="${val}" oninput="formatCurrencyInput(this); autoSaveWorkRecord();">
        <button type="button" class="btn-del" onclick="this.parentElement.remove(); autoSaveWorkRecord();">삭제</button>
    `;
    container.appendChild(div);
    autoSaveWorkRecord();
}

function renderCallDetailSummaryInMainModal() {
    const container = document.getElementById('callDetailSummaryContainer');
    const listCard = document.getElementById('callDetailSummaryList');
    const dailyDistanceEl = document.getElementById('modalDailyDistance');

    if (currentTempCallDetails.length === 0) {
        container.style.display = 'none';
        listCard.innerHTML = '';
        if (dailyDistanceEl) dailyDistanceEl.textContent = `일일 운행거리: 0 km`;
    } else {
        container.style.display = 'block';
        const fragment = document.createDocumentFragment();
        let total = 0;
        let dailyDist = 0;
        let totalComm = 0; 
        
        const settings = getUserSettings();
        
        currentTempCallDetails.forEach((item, index) => {
            const fareVal = parseCurrencyValue(item.fare);
            total += fareVal;
            dailyDist += parseFloat(item.distanceKm) || 0;
            
            // 운행 거리 뱃지
            let distBadge = '';
            if (settings.distanceOn && (item.distanceType || item.distanceKm)) {
                distBadge = `<span style="font-size:0.75rem; background:var(--input-bg); padding:2px 6px; border-radius:4px; border:1px solid var(--border-color); color:var(--text-color); margin-left:6px;">${item.distanceType || ''} ${item.distanceKm ? item.distanceKm + 'km' : ''}</span>`;
            }

            // 수수료 텍스트 및 전화번호(미수 전화용)
            let commText = '';
            let clientPhone = '';
            if (item.client) {
                const clientObj = settings.clients?.find(c => c.companyName === item.client);
                if (clientObj) {
                    if (clientObj.phone) clientPhone = clientObj.phone;
                    if (clientObj.commEnabled) {
                        const valStr = clientObj.commType === 'direct' ? parseCurrencyValue(clientObj.commValue).toLocaleString() + '원' : clientObj.commValue + '%';
                        commText = `<span style="color:var(--sunday-color); font-size:0.8rem;">(수수료 ${valStr})</span>`;
                        
                        let comm = 0;
                        if (clientObj.commType === 'direct') {
                            comm = parseCurrencyValue(clientObj.commValue);
                        } else {
                            comm = Math.floor(fareVal * (parseFloat(clientObj.commValue) / 100));
                        }
                        totalComm += comm;
                    }
                }
            }

            // 운행 시간 표시
            let timeHtml = '';
            if (settings.timeOn && (item.departureTime || item.arrivalTime)) {
                let diffText = '';
                if (item.departureTime && item.arrivalTime) {
                    const [dh, dm] = item.departureTime.split(':').map(Number);
                    const [ah, am] = item.arrivalTime.split(':').map(Number);
                    let dMin = dh * 60 + dm;
                    let aMin = ah * 60 + am;
                    if (aMin < dMin) aMin += 24 * 60; 
                    const diff = aMin - dMin;
                    const hrs = Math.floor(diff / 60);
                    const mins = diff % 60;
                    diffText = ` <span style="font-weight:700; color:var(--primary-color);">(${hrs > 0 ? hrs + '시간 ' : ''}${mins > 0 ? mins + '분' : (hrs > 0 ? '' : '0분')})</span>`;
                }
                timeHtml = `<div style="font-size: 0.85rem; color: var(--sub-text-color); margin-top: 4px;">운행시간: ${item.departureTime || '-'} ~ ${item.arrivalTime || '-'} ${diffText}</div>`;
            }

            // 플랫폼 및 계산서 뱃지
            let badgesHtml = '';
            if (settings.paymentOn && item.receipt) badgesHtml += `<span class="detail-badge">${item.receipt}</span>`;
            if (settings.platformOn && item.platform) badgesHtml += `<span class="detail-badge">${item.platform}</span>`;

            // 결제 상태 (미수/수금)
            let payStatus = item.paymentStatus || '미수';
            let isUnpaid = payStatus === '미수';
            let cardClass = isUnpaid ? 'maint-summary-item unpaid-card' : 'maint-summary-item';
            let statusBtn = '';
            
            if (settings.paymentOn) {
                let phoneBtn = '';
                if (isUnpaid) {
                    if (clientPhone) {
                        phoneBtn = `<a href="tel:${clientPhone}" class="call-phone-btn" onclick="event.stopPropagation();" title="전화걸기">
                                        <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                    </a>`;
                    } else {
                        phoneBtn = `<button type="button" class="call-phone-btn" onclick="showConfirmModal('거래처에 등록된 연락처가 없습니다.', null); event.stopPropagation();" title="전화걸기(연락처 없음)">
                                        <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                    </button>`;
                    }
                }
                
                statusBtn = `<div style="display:flex; align-items:center; gap:6px;">
                                ${phoneBtn}
                                <button type="button" onclick="toggleCallPaymentStatus(${index})" class="payment-toggle-btn ${isUnpaid ? 'unpaid' : 'paid'}">${isUnpaid ? '미수' : '수금'}</button>
                             </div>`;
            } else {
                cardClass = 'maint-summary-item'; 
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = cardClass;
            itemDiv.style.cssText = 'align-items: flex-start; padding:12px; margin-bottom:12px; border-radius:12px; background-color: var(--card-bg); border: 1px solid var(--border-color);';
            itemDiv.innerHTML = `
                <div style="flex:1; width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                        <div style="font-weight: 700; color: var(--primary-color); display:flex; align-items:center; gap:6px;">
                            ${item.loadLoc || '상차지 미상'} ➔ ${item.unloadLoc || '하차지 미상'} 
                            ${distBadge}
                        </div>
                        <div style="display:flex; gap: 2px; flex-shrink: 0; margin-top: -4px; margin-right: -4px;">
                            <button type="button" class="action-icon-btn" onclick="openCallDetailModal(${index})" title="수정">
                                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button type="button" class="action-icon-btn del" onclick="deleteCallDetail(${index})" title="삭제">
                                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-color);">
                            운송료: ${fareVal.toLocaleString()}원
                        </div>
                    </div>
                    
                    <div style="font-size: 0.85rem; color: var(--sub-text-color);">
                        거래처: ${item.client || '-'} ${commText}
                    </div>
                    
                    ${timeHtml}
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px;">
                        <div style="display: flex; gap: 4px; flex-wrap: wrap;">${badgesHtml}</div>
                        <div>${statusBtn}</div>
                    </div>
                </div>
            `;
            fragment.appendChild(itemDiv);
        });

        listCard.innerHTML = '';
        listCard.appendChild(fragment);

        let commSummaryHtml = '';
        if (totalComm > 0) {
            commSummaryHtml = `
                <div style="display: flex; justify-content: space-between; width: 100%; font-size: 0.85rem; color: var(--sunday-color); margin-top: 6px; font-weight: 700;">
                    <span>수수료</span>
                    <span>- ${totalComm.toLocaleString()}원</span>
                </div>
            `;
        }

        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'maint-summary-item';
        summaryDiv.style.cssText = 'margin-top: 10px; padding: 10px 4px 0 4px; border-top: 1px dashed var(--border-color); font-weight:800; color: var(--primary-color); flex-direction: column;';
        summaryDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; width: 100%;">
                <span>세부 내역 합계 (${currentTempCallDetails.length}건)</span>
                <span>${total.toLocaleString()}원</span>
            </div>
            ${commSummaryHtml}
            <div style="display: flex; justify-content: space-between; width: 100%; font-size: 0.85rem; color: var(--text-color); margin-top: 6px;">
                <span>일일 운행거리</span>
                <span>${dailyDist} km</span>
            </div>
        `;
        listCard.appendChild(summaryDiv);
        
        if (dailyDistanceEl) dailyDistanceEl.style.display = 'none';
    }
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

function selectCallDetailBtn(groupName, value, isEditInit = false) {
    let container, hiddenInput;
    if (groupName === 'receipt') {
        container = document.getElementById('callReceiptGroup');
        hiddenInput = document.getElementById('callReceiptValue');
    } else if (groupName === 'distance') {
        container = document.getElementById('callDistanceGroup');
        hiddenInput = document.getElementById('callDistanceType');
        
        // 사용자가 직접 '혼짐'을 클릭했을 때 (초기화 단계 제외)
        if (value === '혼짐' && !isEditInit) {
            const isAlreadyActive = hiddenInput.value === value;
            if (!isAlreadyActive) {
                openMixedLoadModal(); // 3차 모달 호출
            } else {
                hiddenInput.value = '';
                container.querySelectorAll('.dark-pill-btn').forEach(btn => btn.classList.remove('active'));
                document.getElementById('callLinkedLoadIndex').value = '-1';
            }
            return;
        }
    }
    if(!container || !hiddenInput) return;

    const isAlreadyActive = hiddenInput.value === value;
    container.querySelectorAll('.dark-pill-btn').forEach(btn => btn.classList.remove('active'));
    
    if (isAlreadyActive) {
        hiddenInput.value = ''; 
        if (groupName === 'distance') document.getElementById('callLinkedLoadIndex').value = '-1';
    } else {
        hiddenInput.value = value;
        const activeBtn = Array.from(container.querySelectorAll('.dark-pill-btn')).find(btn => btn.textContent.trim() === value);
        if(activeBtn) activeBtn.classList.add('active');
        if (groupName === 'distance' && value !== '혼짐') document.getElementById('callLinkedLoadIndex').value = '-1';
    }
}

function openMixedLoadModal() {
    const container = document.getElementById('mixedLoadListContainer');
    container.innerHTML = '';
    
    const currentIndex = parseInt(document.getElementById('callDetailEditIndex').value, 10);
    
    let html = `
        <label style="display:flex; align-items:center; gap:8px; padding:10px; background:var(--hover-bg); border-radius:8px; cursor:pointer;">
            <input type="radio" name="mixedLoadTarget" value="pending" checked>
            <span style="font-weight:700;">+ 추가 예정 (새로운 혼짐 기준)</span>
        </label>
    `;
    
    currentTempCallDetails.forEach((item, idx) => {
        if (idx !== currentIndex) {
            const title = `${item.loadLoc || '상차지 미상'} ➔ ${item.unloadLoc || '하차지 미상'}`;
            html += `
                <label style="display:flex; align-items:center; gap:8px; padding:10px; background:var(--input-bg); border:1px solid var(--border-color); border-radius:8px; cursor:pointer;">
                    <input type="radio" name="mixedLoadTarget" value="${idx}">
                    <span style="font-weight:600; font-size:0.9rem;">${title}</span>
                </label>
            `;
        }
    });
    
    container.innerHTML = html;
    document.getElementById('mixedLoadModal').classList.remove('hidden');
}

function closeMixedLoadModal() {
    document.getElementById('mixedLoadModal').classList.add('hidden');
}

function saveMixedLoad() {
    const selected = document.querySelector('input[name="mixedLoadTarget"]:checked');
    if (selected) {
        document.getElementById('callLinkedLoadIndex').value = selected.value;
        
        const container = document.getElementById('callDistanceGroup');
        const hiddenInput = document.getElementById('callDistanceType');
        
        hiddenInput.value = '혼짐';
        container.querySelectorAll('.dark-pill-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = Array.from(container.querySelectorAll('.dark-pill-btn')).find(btn => btn.textContent.trim() === '혼짐');
        if (activeBtn) activeBtn.classList.add('active');
    }
    closeMixedLoadModal();
}

function openCallDetailModal(index = -1, skipPlatform = false, selectedPlatform = '') {
    if (isOffSelected) setOffState(false);
    
    const settings = getUserSettings();

    if (settings.platformOn && !skipPlatform && index === -1) {
        openPlatformSelectModal(index);
        return;
    }

    populateClientDataList();
    populateLocationDataLists();

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
    
    if(timeEl) timeEl.style.display = settings.timeOn ? 'flex' : 'none';
    if(receiptEl) receiptEl.style.display = settings.paymentOn ? 'block' : 'none';
    if(distEl) distEl.style.display = settings.distanceOn ? 'block' : 'none';
    if(platformEl) platformEl.style.display = settings.platformOn ? 'block' : 'none';

    document.getElementById('callDetailEditIndex').value = index;
    
    document.getElementById('callLoadLoc').value = '';
    document.getElementById('callUnloadLoc').value = '';
    document.getElementById('callDetailFare').value = '';
    document.getElementById('callClient').value = '';
    document.getElementById('callRemarks').value = '';
    
    if(document.getElementById('callDepartureTime')) document.getElementById('callDepartureTime').value = '';
    if(document.getElementById('callArrivalTime')) document.getElementById('callArrivalTime').value = '';
    if(document.getElementById('callDistanceKm')) document.getElementById('callDistanceKm').value = '';
    
    if(document.getElementById('callReceiptValue')) document.getElementById('callReceiptValue').value = '';
    if(document.getElementById('callDistanceType')) document.getElementById('callDistanceType').value = '';
    if(document.getElementById('callLinkedLoadIndex')) document.getElementById('callLinkedLoadIndex').value = '-1';
    if(document.getElementById('callPlatform')) document.getElementById('callPlatform').value = '';
    
    document.querySelectorAll('#callReceiptGroup .dark-pill-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#callDistanceGroup .dark-pill-btn').forEach(b => b.classList.remove('active'));

    if (selectedPlatform) {
        document.getElementById('callPlatform').value = selectedPlatform;
    } else if (index >= 0 && currentTempCallDetails[index]) {
        const item = currentTempCallDetails[index];
        document.getElementById('callLoadLoc').value = item.loadLoc || '';
        document.getElementById('callUnloadLoc').value = item.unloadLoc || '';
        document.getElementById('callDetailFare').value = parseCurrencyValue(item.fare).toLocaleString() || '';
        document.getElementById('callClient').value = item.client || '';
        document.getElementById('callRemarks').value = item.remarks || '';
        
        if(item.departureTime && document.getElementById('callDepartureTime')) document.getElementById('callDepartureTime').value = item.departureTime;
        if(item.arrivalTime && document.getElementById('callArrivalTime')) document.getElementById('callArrivalTime').value = item.arrivalTime;
        if(item.distanceKm && document.getElementById('callDistanceKm')) document.getElementById('callDistanceKm').value = item.distanceKm;
        
        if (item.receipt) selectCallDetailBtn('receipt', item.receipt, true);
        if (item.distanceType) {
            if (item.distanceType === '혼짐') {
                document.getElementById('callDistanceType').value = '혼짐';
                document.getElementById('callDistanceGroup').querySelectorAll('.dark-pill-btn').forEach(b => b.classList.remove('active'));
                const btn = Array.from(document.getElementById('callDistanceGroup').querySelectorAll('.dark-pill-btn')).find(b => b.textContent.trim() === '혼짐');
                if (btn) btn.classList.add('active');
                if (document.getElementById('callLinkedLoadIndex')) document.getElementById('callLinkedLoadIndex').value = item.linkedLoadIndex || '-1';
            } else {
                selectCallDetailBtn('distance', item.distanceType, true);
            }
        }
        if (item.platform && document.getElementById('callPlatform')) document.getElementById('callPlatform').value = item.platform;
    }
    
    document.getElementById('callDetailModal').classList.remove('hidden');
    calculateCallDetailComm();
}

function closeCallDetailModal() {
    document.getElementById('callDetailModal').classList.add('hidden');
}

let pendingCallDetailIndex = -1;

function openPlatformSelectModal(index) {
    pendingCallDetailIndex = index;
    document.getElementById('platformDirectInput').value = '';
    document.getElementById('platformSelectModal').classList.remove('hidden');
}

function closePlatformSelectModal() {
    document.getElementById('platformSelectModal').classList.add('hidden');
}

// 퀵버튼(화물맨 등) 클릭 시: 값을 세팅하고 모달을 끈 뒤, 세부 일지 모달로 진입
function selectPlatformQuick(platformName) {
    closePlatformSelectModal();
    openCallDetailModal(pendingCallDetailIndex, true, platformName); 
}

// 직접입력 후 '저장' 클릭 시
function savePlatformDirect() {
    const val = document.getElementById('platformDirectInput').value.trim();
    closePlatformSelectModal();
    openCallDetailModal(pendingCallDetailIndex, true, val);
}

function saveCallDetail() {
    const idx = parseInt(document.getElementById('callDetailEditIndex').value, 10);
    const loadLoc = document.getElementById('callLoadLoc').value.trim();
    const unloadLoc = document.getElementById('callUnloadLoc').value.trim();
    const fare = document.getElementById('callDetailFare').value.trim();
    const client = document.getElementById('callClient').value.trim();
    const remarks = document.getElementById('callRemarks').value.trim();
    
    const departureTime = document.getElementById('callDepartureTime') ? document.getElementById('callDepartureTime').value : '';
    const arrivalTime = document.getElementById('callArrivalTime') ? document.getElementById('callArrivalTime').value : '';
    const receipt = document.getElementById('callReceiptValue') ? document.getElementById('callReceiptValue').value : '';
    const distanceType = document.getElementById('callDistanceType') ? document.getElementById('callDistanceType').value : '';
    const distanceKm = document.getElementById('callDistanceKm') ? document.getElementById('callDistanceKm').value.trim() : '';
    const linkedLoadIndex = document.getElementById('callLinkedLoadIndex') ? document.getElementById('callLinkedLoadIndex').value : '-1';
    const platform = document.getElementById('callPlatform') ? document.getElementById('callPlatform').value.trim() : '';

    if (!fare && !loadLoc && !unloadLoc) {
        showConfirmModal('최소한 운송료나 상/하차지는 입력해야 합니다.', null);
        return;
    }

    // 기존 결제 상태 유지 (신규면 '미수')
    const existingPaymentStatus = (idx >= 0 && currentTempCallDetails[idx]) ? (currentTempCallDetails[idx].paymentStatus || '미수') : '미수';

    const newItem = { 
        loadLoc, unloadLoc, fare, client, remarks,
        departureTime, arrivalTime, receipt, distanceType, distanceKm, linkedLoadIndex, platform,
        paymentStatus: existingPaymentStatus
    };

    if (idx >= 0) {
        currentTempCallDetails[idx] = newItem;
    } else {
        currentTempCallDetails.push(newItem);
    }

    renderCallDetailSummaryInMainModal();
    if (document.getElementById('workModal').classList.contains('open')) {
        autoSaveWorkRecord();
    }
    closeCallDetailModal();
}

function deleteCallDetail(index) {
    showConfirmModal('삭제하시겠습니까?', () => {
        currentTempCallDetails.splice(index, 1);
        renderCallDetailSummaryInMainModal();
        if (document.getElementById('workModal').classList.contains('open')) {
            autoSaveWorkRecord();
        }
    });
}

function renderMaintSummaryInMainModal() {
    const container = document.getElementById('maintSummaryContainer');
    const listCard = document.getElementById('maintSummaryList');

    if (currentTempMaintItems.length === 0) {
        container.style.display = 'none';
        listCard.innerHTML = '';
    } else {
        container.style.display = 'block';
        let html = '';
        let total = 0;
        currentTempMaintItems.forEach((item, idx) => {
            const fareVal = parseCurrencyValue(item.fare);
            total += fareVal;
            
            let subInfo = [];
            if(item.category) subInfo.push(item.category);
            if(item.mileage) subInfo.push(`누적 ${item.mileage}km`);
            let subInfoHtml = subInfo.length > 0 ? `<div style="font-size: 0.8rem; color: var(--sub-text-color); margin-top: 4px;">${subInfo.join(' | ')}</div>` : '';

            html += `
                <div class="maint-summary-item" style="align-items: flex-start; padding:12px; margin-bottom:8px; border-radius:12px; background-color: var(--card-bg); border: 1px solid var(--border-color); flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: flex-start;">
                        <div>
                            <div style="display:flex; align-items:center; gap:6px; font-weight: 700;">
                                <svg class="inline-icon sm" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                                ${item.name || '정비 항목'}
                            </div>
                            ${subInfoHtml}
                        </div>
                        <div style="display:flex; gap: 2px; flex-shrink: 0; margin-top: -4px; margin-right: -4px;">
                            <button type="button" class="action-icon-btn" onclick="openMaintRecordModal('${selectedDateKey}', ${idx})" title="수정">
                                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button type="button" class="action-icon-btn del" onclick="currentTempMaintItems.splice(${idx}, 1); renderMaintSummaryInMainModal(); autoSaveWorkRecord();" title="삭제">
                                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div style="width: 100%; text-align: right; font-weight: 700; margin-top: 8px;">
                        ${fareVal.toLocaleString()}원
                    </div>
                </div>
            `;
        });
        html += `
            <div class="maint-summary-item" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--border-color); font-weight:800; color: var(--sunday-color);">
                <span>정비 합계</span>
                <span>${total.toLocaleString()}원</span>
            </div>
        `;
        listCard.innerHTML = html;
    }
}


function closeModal() {
    document.getElementById('workModal').classList.remove('open');
}

function autoSaveWorkRecord() {
    if (!selectedDateKey) return;

    const savedSettings = getUserSettings();
    const isMain = activeLogId === 'main';
    const fixedOn = isMain ? savedSettings.fixedOn : savedSettings.subFixedOn;
    const palletOn = isMain ? savedSettings.palletOn : savedSettings.subPalletOn;
    const callOn = isMain ? savedSettings.callOn : savedSettings.subCallOn;

    let fixedCount = 0;
    let palletCount = 0;
    let callFares = [];

    if (!isOffSelected) {
        if (fixedOn) {
            fixedCount = parseInt(document.getElementById('modalFixedCountInput').value, 10) || 0;
            if (palletOn) {
                palletCount = parseInt(document.getElementById('modalPalletCount').value, 10) || 0;
            }
        }

        if (callOn) {
            const inputs = document.querySelectorAll('.call-fare-input');
            inputs.forEach(input => {
                if (input.value.trim() !== '') {
                    callFares.push(input.value.trim());
                }
            });
        }
    }

    const maintItems = currentTempMaintItems;
    const fuelItems = currentTempFuelItems;
    const callDetails = currentTempCallDetails;

    if (!isOffSelected && fixedCount === 0 && palletCount === 0 && callFares.length === 0 && maintItems.length === 0 && fuelItems.length === 0 && callDetails.length === 0) {
        delete workData[selectedDateKey];
    } else {
        workData[selectedDateKey] = {
            isOff: isOffSelected,
            fixedCount,
            palletCount,
            callFares,
            maintItems,
            fuelItems,
            callDetails
        };
    }

    saveDataToStorage(); 
    buildCalendar();
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
    
    if (activeLogId !== 'main') {
        const currentCar = savedSettings.cars.find(c => c.number === activeLogId);
        if (currentCar) {
            document.getElementById('rptCarNumber').textContent = currentCar.number || '-';
            document.getElementById('rptCarTonnage').textContent = currentCar.tonnage || '-';
            
            if (currentCar.logEnabled && currentCar.infoType === 'new' && currentCar.personalInfo) {
                rptName = currentCar.personalInfo.name || rptName;
                rptPhone = currentCar.personalInfo.phone || rptPhone;
                rptBank = currentCar.personalInfo.bank || rptBank;
                rptAccount = currentCar.personalInfo.account || rptAccount;
            }
        }
    } else if (savedSettings.cars && savedSettings.cars.length > 0) {
        const mainCar = savedSettings.cars.find(c => c.type === 'main') || savedSettings.cars[0];
        
        if (mainCar.logEnabled && mainCar.infoType === 'new' && mainCar.personalInfo) {
            rptName = mainCar.personalInfo.name || rptName;
            rptPhone = mainCar.personalInfo.phone || rptPhone;
            rptBank = mainCar.personalInfo.bank || rptBank;
            rptAccount = mainCar.personalInfo.account || rptAccount;
        }

        document.getElementById('rptCarNumber').textContent = mainCar.number || '-';
        document.getElementById('rptCarTonnage').textContent = mainCar.tonnage || '-';

    } else {
        document.getElementById('rptCarNumber').textContent = '-';
        document.getElementById('rptCarTonnage').textContent = '-';
    }

    document.getElementById('rptUserName').textContent = rptName;
    document.getElementById('rptUserPhone').textContent = rptPhone;
    document.getElementById('rptBankName').textContent = rptBank;
    document.getElementById('rptAccountNumber').textContent = rptAccount;

    const isMain = activeLogId === 'main';
    const fixedUnitPrice = parseCurrencyValue(isMain ? savedSettings.unitPrice : savedSettings.subUnitPrice);
    const palletUnitPrice = parseCurrencyValue(isMain ? savedSettings.palletPrice : savedSettings.subPalletPrice);
    const showPallet = !!((isMain ? savedSettings.fixedOn : savedSettings.subFixedOn) && (isMain ? savedSettings.palletOn : savedSettings.subPalletOn));

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
                    dayDefaultFare += fAmt;
                }
                if (record.callFares && record.callFares.length > 0) {
                    dayWorkCount += record.callFares.length;
                    let cAmt = record.callFares.reduce((a, b) => a + parseCurrencyValue(b), 0);
                    dayFare += cAmt;
                    dayDefaultFare += cAmt;
                }

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

                        totalMonthDistance += parseFloat(detail.distanceKm) || 0;

                        let gross = parseCurrencyValue(detail.fare);
                        let comm = 0;
                        let clientName = detail.client ? detail.client.trim() : '';
                        let isRegisteredClient = false;
                        
                        if (clientName) {
                            const clientObj = savedSettings.clients?.find(c => c.companyName === clientName);
                            if (clientObj) {
                                isRegisteredClient = true;
                                if (clientObj.commEnabled) {
                                    if (clientObj.commType === 'percent' || !clientObj.commType) {
                                        comm = Math.floor(gross * (parseFloat(clientObj.commValue) / 100));
                                        clientCommLabels[clientName] = `${clientObj.commValue}%`;
                                    } else {
                                        comm = parseCurrencyValue(clientObj.commValue);
                                        clientCommLabels[clientName] = `${comm.toLocaleString()}원`;
                                    }
                                    monthCommByClient[clientName] = (monthCommByClient[clientName] || 0) + comm;
                                }
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
    let subCarCommLabel = '보조차량 수수료';
    if (activeLogId !== 'main') {
        const currentCar = savedSettings.cars?.find(c => c.number === activeLogId);
        if (currentCar && currentCar.logEnabled && currentCar.commission) {
            const commPercent = parseFloat(currentCar.commission);
            if (!isNaN(commPercent) && commPercent > 0) {
                subCarComm = Math.floor((totalFare + totalPalletFare - totalCommission) * (commPercent / 100));
                subCarCommLabel = `${getShortCarNum(currentCar.number)}차량 ${commPercent}%`;
            }
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
                <span>${client} 기본 운송료</span>
                <span class="summary-value">${monthFareByClient[client].toLocaleString()} 원</span>
            </div>
        `;
        if (monthCommByClient[client] > 0) {
            baseFareHtml += `
                <div class="summary-row">
                    <span style="padding-left: 10px; font-size: 0.9rem; color: var(--sub-text-color);">└ ${client} 수수료 (${clientCommLabels[client]})</span>
                    <span class="summary-value">- ${monthCommByClient[client].toLocaleString()} 원</span>
                </div>
            `;
        }
    }
    
    summaryBox.innerHTML = `
        ${baseFareHtml}
        <div class="summary-row">
            <span>부가세 (10%)</span>
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

function createDetailTableHTML(items, isForExport, totalItems) {
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

    return `
        <table class="report-table" style="font-size: ${fontSize};">
            <thead>
                <tr>
                    <th style="width: 12%; padding: ${cellPadding};">날짜</th>
                    <th style="width: 27%; padding: ${cellPadding};">상차지</th>
                    <th style="width: 27%; padding: ${cellPadding};">하차지</th>
                    <th style="width: 17%; padding: ${cellPadding};">거래처</th>
                    <th style="width: 17%; padding: ${cellPadding};">금액</th>
                </tr>
            </thead>
            <tbody>
                ${items.length > 0 ? items.map(item => `
                    <tr>
                        <td style="padding: ${cellPadding}; white-space: nowrap;">${item.dateStr}</td>
                        <td style="padding: ${cellPadding}; white-space: normal; word-break: break-all;">${item.loadLoc}</td>
                        <td style="padding: ${cellPadding}; white-space: normal; word-break: break-all;">${item.unloadLoc}</td>
                        <td style="padding: ${cellPadding}; white-space: normal; word-break: break-all;">${item.client}</td>
                        <td class="amount" style="padding: ${cellPadding}; white-space: nowrap;">${item.fare.toLocaleString()}원</td>
                    </tr>
                `).join('') : `<tr><td colspan="5" style="text-align:center; padding: 15px;">해당 내역이 없습니다.</td></tr>`}
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
                            if (clientObj.commEnabled) {
                                if (clientObj.commType === 'percent' || !clientObj.commType) {
                                    comm = Math.floor(fareVal * (parseFloat(clientObj.commValue) / 100));
                                    clientCommLabels[clientName] = `${clientObj.commValue}%`;
                                } else {
                                    comm = parseCurrencyValue(clientObj.commValue);
                                    clientCommLabels[clientName] = `${comm.toLocaleString()}원`;
                                }
                                monthCommByClient[clientName] = (monthCommByClient[clientName] || 0) + comm;
                            }
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

    if (isForExport && detailsList.length > 15) {
        const half = Math.ceil(detailsList.length / 2);
        const leftList = detailsList.slice(0, half);
        const rightList = detailsList.slice(half);

        tableHTML = `
            <div class="report-split-container">
                <div class="report-split-column">${createDetailTableHTML(leftList, true, detailsList.length)}</div>
                <div class="report-split-column">${rightList.length > 0 ? createDetailTableHTML(rightList, true, detailsList.length) : ''}</div>
            </div>`;
    } else {
        tableHTML = createDetailTableHTML(detailsList, isForExport, detailsList.length);
    }

    const clientText = clientFilter === 'ALL' ? '전체' : clientFilter;
    document.getElementById('reportMonthTitle').textContent = `${currentYear}년 ${currentMonth + 1}월 운송비 내역서 (${clientText})`;
    document.getElementById('reportTableContainer').innerHTML = tableHTML;
    
    let subCarComm = 0;
    let subCarCommLabel = '보조차량 수수료';
    if (activeLogId !== 'main') {
        const currentCar = savedSettings.cars?.find(c => c.number === activeLogId);
        if (currentCar && currentCar.logEnabled && currentCar.commission) {
            const commPercent = parseFloat(currentCar.commission);
            if (!isNaN(commPercent) && commPercent > 0) {
                subCarComm = Math.floor((totalFare - totalCommission) * (commPercent / 100));
                subCarCommLabel = `${getShortCarNum(currentCar.number)}차량 ${commPercent}%`;
            }
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
                <span>${client} 기본 운송료</span>
                <span class="summary-value">${monthFareByClient[client].toLocaleString()} 원</span>
            </div>
        `;
        if (monthCommByClient[client] > 0) {
            baseFareHtml += `
                <div class="summary-row">
                    <span style="padding-left: 10px; font-size: 0.9rem; color: var(--sub-text-color);">└ ${client} 수수료 (${clientCommLabels[client]})</span>
                    <span class="summary-value">- ${monthCommByClient[client].toLocaleString()} 원</span>
                </div>
            `;
        }
    }

    summaryBox.innerHTML = `
        ${baseFareHtml}
        <div class="summary-row">
            <span>부가세 (10%)</span>
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

let editingCarIndex = -1;

function toggleNewLogSettings() {
    const isChecked = document.getElementById('newLogToggle').checked;
    document.getElementById('newLogSettings').style.display = isChecked ? 'block' : 'none';
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
    document.getElementById('logToggleContainer').style.display = 'none';
    document.getElementById('newLogToggle').checked = false;
    toggleNewLogSettings();
    document.getElementById('newCarInsuranceToggle').checked = false;
    setCarCommType('percent');
    document.getElementById('newCarCommission').value = ''; 
    selectInfoType('existing');
    document.getElementById('newDriverName').value = '';
    document.getElementById('newUserName').value = '';
    document.getElementById('newBizNumber').value = '';
    document.getElementById('newUserPhone').value = '';
    document.getElementById('newBankName').value = '';
    document.getElementById('newAccountNumber').value = '';
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
        document.getElementById('logToggleContainer').style.display = 'none';
    } else {
        document.getElementById('carModalTitle').textContent = '기사 정보 수정';
        document.getElementById('logToggleContainer').style.display = 'block';
    }
    
    if (car.type === 'sub') {
        document.getElementById('newCarInsuranceToggle').checked = !!car.insuranceOn;
        setCarCommType(car.commType || 'percent');
        document.getElementById('newCarCommission').value = car.commission || '';

        if (car.logEnabled) {
            document.getElementById('newLogToggle').checked = true;
            toggleNewLogSettings();
            if (car.infoType === 'new') {
                selectInfoType('new');
                if (car.personalInfo) {
                    document.getElementById('newDriverName').value = car.personalInfo.driverName || '';
                    document.getElementById('newUserName').value = car.personalInfo.name || '';
                    document.getElementById('newBizNumber').value = car.personalInfo.bizNumber || '';
                    document.getElementById('newUserPhone').value = car.personalInfo.phone || '';
                    document.getElementById('newBankName').value = car.personalInfo.bank || '';
                    document.getElementById('newAccountNumber').value = car.personalInfo.account || '';
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

// 앱 초기화 구문
normalizeLegacyData(); 
loadSettings();
initDateSelects();
initMaintDateSelects(); 
initFuelDateSelects();
initCalendarDOM();
buildCalendar();
renderSubCarMenu();

// 스플래시 화면(시작 화면) 제어 로직
window.addEventListener('load', () => {
    const splashScreen = document.getElementById('splashScreen');
    if (splashScreen) {
        // 1.5초 뒤에 페이드 아웃 애니메이션 시작
        setTimeout(() => {
            splashScreen.style.opacity = '0';
            splashScreen.style.transition = 'opacity 0.5s ease';
            
            // 애니메이션이 끝난 후 화면에서 완전히 숨김
            setTimeout(() => {
                splashScreen.style.display = 'none';
            }, 500); 
        }, 1500);
    }
});

// 로그인 / 로그아웃 더미 함수 (추후 실제 로직 연결용)
function handleLogin() {
    console.log('로그인 처리');
    // TODO: 로그인 기능 구현
}

function handleLogout() {
    console.log('로그아웃 처리');
    // TODO: 로그아웃 기능 구현
}

function toggleCallPaymentStatus(index) {
    if (index >= 0 && currentTempCallDetails[index]) {
        let currentStatus = currentTempCallDetails[index].paymentStatus || '미수';
        currentTempCallDetails[index].paymentStatus = (currentStatus === '미수') ? '수금' : '미수';
        
        // UI 즉시 업데이트
        renderCallDetailSummaryInMainModal();
        if (document.getElementById('workModal').classList.contains('open')) {
            autoSaveWorkRecord();
        }
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

// 스와이프 제스처 이벤트 처리 (일일 운행내역 패널 열기/닫기)
let touchStartX = 0;
let touchEndX = 0;

function handleGesture() {
    const swipeThreshold = 50; 
    
    // Swipe Right (왼쪽에서 오른쪽으로 스와이프): 홈 화면에서 일일운행 열기
    if (touchEndX > touchStartX + swipeThreshold) {
        if (!document.getElementById('mainPage').classList.contains('hidden') && !document.getElementById('workModal').classList.contains('open')) {
            openTodayWorkModal();
        }
    }
    
    // Swipe Left (오른쪽에서 왼쪽으로 스와이프): 일일운행에서 홈 화면으로 닫기
    if (touchEndX < touchStartX - swipeThreshold) {
        if (document.getElementById('workModal').classList.contains('open')) {
            closeModal();
        }
    }
}

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
}, {passive: true});

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleGesture();
}, {passive: true});