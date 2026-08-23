// ============================================================================
// 거래처관리 — 목록/드래그 재정렬/등록·수정 모달/즐겨찾기/수수료/결제주기
// (코드 쪼개기 8차: script.js에서 분리)
// ============================================================================
// script.js 안에서 4곳(거래처관리 화면, 콜상세 모달의 거래처 핀 단축, 결제주기 계산,
// 거래처 등록 모달)에 흩어져 있던 걸 전부 모았다. deleteClientFromSupabase(supabase-sync.js)
// 호출은 이미 typeof 가드가 돼 있고, cancelClientModal을 ui-widgets.js의
// initBackdropDismissModals()가 부르는 것도 함수 몸통 안 런타임 참조라 로드 순서와
// 무관하다.
// ============================================================================

function showClientManagement(returnPage = 'main') {
    setUtilityReturnPage(returnPage);
    hideAllPages();
    document.getElementById('clientManagementPage').classList.remove('hidden');
    renderClientList(); 
}

let editingClientIndex = -1;
let clientPressTimer = null;
let clientDragState = null;

function startClientDrag(card, clientIndex, pointerY) {
    const container = document.getElementById('clientListContainer');
    if (!card || !container || clientDragState?.active) return;

    clientDragState = { active: true, card, clientIndex, pinned: card.dataset.pinned === 'true' };
    card.classList.add('client-dragging');
    container.classList.add('client-drag-active');
    card.setAttribute('aria-grabbed', 'true');
    navigator.vibrate?.(30);
    updateClientDragPosition(pointerY);
}

function updateClientDragPosition(pointerY) {
    if (!clientDragState?.active) return;

    const { card, pinned } = clientDragState;
    const candidate = document.elementFromPoint(window.innerWidth / 2, pointerY)?.closest('.client-list-card');
    if (candidate && candidate !== card && candidate.dataset.pinned === String(pinned)) {
        const cards = [...document.querySelectorAll('#clientListContainer .client-list-card')];
        const previousPositions = new Map(cards.map(item => [item, item.getBoundingClientRect()]));
        const rect = candidate.getBoundingClientRect();
        candidate.parentNode.insertBefore(card, pointerY > rect.top + (rect.height / 2) ? candidate.nextSibling : candidate);
        animateClientCardReorder(cards, previousPositions, card);
    }

    const edge = 72;
    if (pointerY < edge) window.scrollBy({ top: -10, behavior: 'auto' });
    else if (pointerY > window.innerHeight - edge) window.scrollBy({ top: 10, behavior: 'auto' });
}

function animateClientCardReorder(cards, previousPositions, draggedCard) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    cards.forEach(item => {
        const previous = previousPositions.get(item);
        const current = item.getBoundingClientRect();
        const offsetY = previous?.top - current.top;
        if (!offsetY) return;

        item.getAnimations().forEach(animation => animation.cancel());

        if (item === draggedCard) {
            item.animate(
                [
                    { transform: `translate3d(0, ${offsetY}px, 0) scale(1.032)` },
                    { transform: 'translate3d(0, 0, 0) scale(1.018)', offset: .72 },
                    { transform: 'translate3d(0, 0, 0) scale(1.022)', offset: .86 },
                    { transform: 'translate3d(0, 0, 0) scale(1.018)' }
                ],
                { duration: 380, easing: 'cubic-bezier(.2, .9, .25, 1)', fill: 'both' }
            );
            return;
        }

        item.animate(
            [
                { transform: `translate3d(0, ${offsetY}px, 0) scale(.995)` },
                { transform: 'translate3d(0, 0, 0) scale(1)', offset: .76 },
                { transform: 'translate3d(0, -1.5px, 0) scale(1.002)', offset: .88 },
                { transform: 'translate3d(0, 0, 0) scale(1)' }
            ],
            { duration: 360, easing: 'cubic-bezier(.2, .9, .25, 1)' }
        );
    });
}

function finishClientDrag() {
    window.clearTimeout(clientPressTimer);
    clientPressTimer = null;
    if (!clientDragState?.active) {
        clientDragState = null;
        return;
    }

    const { card } = clientDragState;
    const settings = getUserSettings();
    const originalClients = settings.clients || [];
    const orderedIndexes = [...document.querySelectorAll('#clientListContainer .client-list-card')]
        .map(item => Number(item.dataset.clientIndex));

    if (orderedIndexes.length === originalClients.length) {
        settings.clients = orderedIndexes.map(index => originalClients[index]);
        setUserSettings(settings);
    }

    card.classList.remove('client-dragging');
    card.setAttribute('aria-grabbed', 'false');
    document.getElementById('clientListContainer')?.classList.remove('client-drag-active');
    clientDragState = null;
    renderClientList();
}

function bindClientDragEvents(card, clientIndex) {
    let startX = 0;
    let startY = 0;

    card.addEventListener('touchstart', event => {
        if (event.target.closest('button')) return;
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        window.clearTimeout(clientPressTimer);
        clientPressTimer = window.setTimeout(() => startClientDrag(card, clientIndex, startY), 520);
    }, { passive: true });

    card.addEventListener('touchmove', event => {
        const touch = event.touches[0];
        if (clientDragState?.active && clientDragState.card === card) {
            event.preventDefault();
            updateClientDragPosition(touch.clientY);
        } else if (Math.hypot(touch.clientX - startX, touch.clientY - startY) > 8) {
            window.clearTimeout(clientPressTimer);
            clientPressTimer = null;
        }
    }, { passive: false });

    card.addEventListener('touchend', event => {
        if (clientDragState?.active && clientDragState.card === card) event.preventDefault();
        finishClientDrag();
    }, { passive: false });
    card.addEventListener('touchcancel', finishClientDrag);

    card.addEventListener('mousedown', event => {
        if (event.button !== 0 || event.target.closest('button')) return;
        startY = event.clientY;
        window.clearTimeout(clientPressTimer);
        clientPressTimer = window.setTimeout(() => startClientDrag(card, clientIndex, startY), 520);

        const onMove = moveEvent => {
            if (clientDragState?.active && clientDragState.card === card) {
                moveEvent.preventDefault();
                updateClientDragPosition(moveEvent.clientY);
            } else if (Math.abs(moveEvent.clientY - startY) > 8) {
                window.clearTimeout(clientPressTimer);
            }
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            finishClientDrag();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
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

    if (clients.length === 0) {
        container.innerHTML = '<div class="empty-state">등록된 거래처가 없습니다.</div>';
        return;
    }

    clients.forEach((client, idx) => {
        let badges = '';
        // 즐겨찾기 표시 뱃지(예전 "고정 거래처" 스위치 — 이름/모양만 바뀜, 목록 맨 위 정렬은 그대로)
        if (client.isPinned) {
            badges += `<span class="management-badge pinned">★ 즐겨찾기</span>`;
        }
        if (client.commEnabled) {
            const badgeText = client.commType === 'direct' ? `${client.commValue}원` : `${client.commValue}%`;
            badges += `<span class="management-badge commission">수수료 ${escapeDetailText(badgeText)}</span>`;
        }
        // 고정노선과 연동된 거래처(계정 전체에서 1곳뿐)를 목록에서도 바로 알아볼 수 있게 표시한다.
        if (client.fixedRouteLinked) {
            badges += '<span class="management-badge tax-invoice">고정노선 연동</span>';
        }
        if (client.palletOn) {
            badges += '<span class="management-badge tax-invoice">파렛트</span>';
        }

        const div = document.createElement('div');
        div.className = 'car-card management-list-card client-list-card'; 
        div.dataset.clientIndex = String(idx);
        div.dataset.pinned = String(!!client.isPinned);
        div.setAttribute('aria-grabbed', 'false');
        bindClientDragEvents(div, idx);

        div.innerHTML = `
            <div class="management-card-inner">
                <div class="management-card-copy">
                    <div class="client-card-title"><strong>${escapeDetailText(client.companyName)}</strong>${client.managerName ? `<span>${escapeDetailText(client.managerName)} 담당</span>` : ''}</div>
                    <div class="client-card-badges">${badges}</div>
                    <div class="car-sub-text"><span>사업자 ${escapeDetailText(client.bizNumber || '-')}</span><span>연락처 ${escapeDetailText(client.phone || '-')}</span></div>
                    <div class="car-sub-text">결제주기: ${escapeDetailText(getPaymentTermLabel(client.paymentTerm || 'next_month_end', client.paymentTermValue || ''))}</div>
                </div>
                <div class="car-action-btns">
                    <button type="button" class="action-icon-btn" onclick="openClientModal(${idx}); event.stopPropagation();" title="수정">${editDetailSvg()}</button>
                    <button type="button" class="action-icon-btn del" onclick="deleteClient(${idx}); event.stopPropagation();" title="삭제">${deleteDetailSvg()}</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// 예전엔 "고정 거래처" 스위치였는데, 실제로는 "이 거래처를 목록 맨 위에 즐겨찾기"하는
// 기능이라(고정노선의 "고정 거래처"와는 완전히 다른 개념) 별 아이콘으로 이름·모양만
// 바꿨다. 값 자체는 그대로 clientPinnedToggle(checkbox)에 저장된다 — 저장/불러오기 코드는
// 안 건드리고 화면만 바뀐 것. 예전처럼 수수료 적용을 강제로 껐다 켰다 하지 않는다(수수료는
// 이제 완전히 독립적으로 켤 수 있다).
function toggleClientFavoriteStar() {
    const checkbox = document.getElementById('clientPinnedToggle');
    if (!checkbox) return;
    checkbox.checked = !checkbox.checked;
    updateClientFavoriteStarUI();
}

function updateClientFavoriteStarUI() {
    const checkbox = document.getElementById('clientPinnedToggle');
    const star = document.getElementById('clientFavoriteStar');
    if (!checkbox || !star) return;
    star.textContent = checkbox.checked ? '★' : '☆';
    star.classList.toggle('active', checkbox.checked);
    star.setAttribute('aria-pressed', checkbox.checked ? 'true' : 'false');
}

function toggleClientComm() {
    const isChecked = document.getElementById('clientCommToggle').checked;
    setSettingsGroupExpanded(document.getElementById('clientCommSection'), isChecked);
}

// 고정노선과 연동 — 계정 전체에서 거래처 1곳만 켤 수 있다. 여기서 다른 거래처의 값까지
// 건드리진 않는다(그건 저장 시점에 saveClient가 처리) — 이 화면(지금 편집 중인 거래처) 안의
// 하위 입력칸(단가 + 파렛트 회수) 노출 여부만 담당한다. 파렛트 회수는 고정노선과 연동일
// 때만 의미가 있는 자식 항목이라, 부모가 꺼지면 파렛트도 같이 꺼진다.
function toggleClientFixedRoute() {
    const isChecked = document.getElementById('clientFixedRouteToggle').checked;
    setSettingsGroupExpanded(document.getElementById('clientFixedRouteSubSettings'), isChecked);
    if (!isChecked) {
        document.getElementById('clientPalletToggle').checked = false;
        toggleClientPallet();
    }
}

function toggleClientPallet() {
    const isChecked = document.getElementById('clientPalletToggle').checked;
    setSettingsGroupExpanded(document.getElementById('clientPalletSubSettings'), isChecked);
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
    const commInput = document.getElementById('clientCommValue');

    // commLabel(별도 라벨 줄)은 UI를 줄이면서 없앴다 — 지금 뭘 입력하는 건지는 input의
    // placeholder 하나로 충분히 전달된다.
    if (!btnPercent || !btnDirect || !commInput) return;

    if (type === 'percent') {
        btnPercent.classList.add('active-work');
        btnDirect.classList.remove('active-work');
        commInput.placeholder = '비율(%) 입력';
        formatCommValue(commInput);
    } else {
        btnDirect.classList.add('active-work');
        btnPercent.classList.remove('active-work');
        commInput.placeholder = '금액(원) 입력';
        formatCurrencyInput(commInput);
    }
}

function formatClientCommValue(input) {
    const typeEl = document.getElementById('clientCommType');
    const type = typeEl ? typeEl.value : 'percent';
    if (type === 'percent') {
        formatCommValue(input);
    } else {
        formatCurrencyInput(input);
    }
}

function closeClientModal() {
    document.getElementById('clientModal').classList.add('hidden');
}

function cancelClientModal() {
    clientModalOpenedFromCallDetail = false;
    closeClientModal();
}

function deleteClient(idx) {
    showConfirmModal('해당 업체를 삭제하시겠습니까?', () => {
        const settings = getUserSettings();
        if (settings.clients && settings.clients[idx]) {
            const deletedSupabaseId = settings.clients[idx].supabaseId;
            settings.clients.splice(idx, 1);
            setUserSettings(settings);
            showToastMessage('삭제되었습니다.');
            renderClientList();
            buildCalendar();

            // 로컬에서만 지우고 끝내면, 재로그인/하이드레이션 시 서버 clients 테이블에 남아있는
            // 이 거래처 행을 다시 읽어와 로컬에 되살려 놓는다(차량 삭제 때 이미 한 번 확인·수정된
            // 것과 같은 종류의 결함이라 동일하게 처리) — 서버에서도 함께 삭제한다.
            if (deletedSupabaseId && typeof deleteClientFromSupabase === 'function') {
                deleteClientFromSupabase(deletedSupabaseId).catch(error => {
                    console.error('서버 거래처 삭제 실패(로컬 삭제는 반영됨, 다음 동기화 때 재확인 필요):', error);
                });
            }
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


function renderPinnedClientShortcuts() {
    const settings = getUserSettings();
    const container = document.getElementById('callClientShortcuts');
    if (!container) return;

    const pinnedClients = (settings.clients || []).filter(client => client.isPinned && client.companyName);
    container.innerHTML = '';
    container.style.display = pinnedClients.length ? 'flex' : 'none';

    pinnedClients.forEach(client => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dark-pill-btn';
        button.textContent = client.companyName;
        button.addEventListener('click', () => selectPinnedClient(client.companyName));
        container.appendChild(button);
    });
}

function selectPinnedClient(companyName) {
    const input = document.getElementById('callClient');
    if (!input) return;
    const shouldClear = input.value.trim() === companyName;
    input.value = shouldClear ? '' : companyName;
    document.querySelectorAll('#callClientShortcuts .dark-pill-btn').forEach(button => {
        button.classList.toggle('active', !shouldClear && button.textContent.trim() === companyName);
    });
    calculateCallDetailComm();
    applyClientPaymentTerms();
}

let clientModalOpenedFromCallDetail = false;

function openClientModalFromCallDetail() {
    clientModalOpenedFromCallDetail = true;
    openClientModal(-1);
}


function formatDateToYmd(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getPaymentTermLabel(term, value) {
    if (term === 'next_month_end') return '익월 말일 정산';
    if (term === 'second_month_end') return '익익월 말일 정산';
    if (term === 'next_month_day') return `익월 ${value || ''}일 정산`;
    if (term === 'second_month_day') return `익익월 ${value || ''}일 정산`;
    if (term === 'after_days') return `운행 건별 ${value || ''}일 후 정산`;
    return '당일·수시 정산';
}

function calculatePaymentDueDate(workDate, paymentTerm, paymentTermValue) {
    const date = new Date(`${workDate}T00:00:00`);

    if (paymentTerm === 'next_month_end') {
        return formatDateToYmd(new Date(date.getFullYear(), date.getMonth() + 2, 0));
    }

    if (paymentTerm === 'second_month_end') {
        return formatDateToYmd(new Date(date.getFullYear(), date.getMonth() + 3, 0));
    }

    if (paymentTerm === 'second_month_day') {
        const selectedDay = Math.max(1, Math.min(31, parseInt(paymentTermValue, 10) || 1));
        const secondMonthLastDay = new Date(date.getFullYear(), date.getMonth() + 3, 0).getDate();
        return formatDateToYmd(new Date(date.getFullYear(), date.getMonth() + 2, Math.min(selectedDay, secondMonthLastDay)));
    }

    if (paymentTerm === 'next_month_day') {
        const selectedDay = Math.max(1, Math.min(31, parseInt(paymentTermValue, 10) || 1));
        const nextMonthLastDay = new Date(date.getFullYear(), date.getMonth() + 2, 0).getDate();
        return formatDateToYmd(new Date(date.getFullYear(), date.getMonth() + 1, Math.min(selectedDay, nextMonthLastDay)));
    }

    if (paymentTerm === 'after_days') {
        const days = Math.max(0, parseInt(paymentTermValue, 10) || 0);
        date.setDate(date.getDate() + days);
        return formatDateToYmd(date);
    }

    return formatDateToYmd(date);
}

function updateClientPaymentTermControls() {
    const term = document.getElementById('clientPaymentTerm').value;
    const valueWrap = document.getElementById('clientPaymentTermValueWrap');
    const valueLabel = document.getElementById('clientPaymentTermValueLabel');
    const valueInput = document.getElementById('clientPaymentTermValue');
    // 결제 주기 유형이 바뀌면 이전 유형 기준으로 표시됐던 인라인 오류는 더 이상 유효하지
    // 않으므로 함께 지운다.
    clearFieldError(valueInput);

    if (term === 'next_month_day' || term === 'second_month_day') {
        valueWrap.style.display = 'block';
        valueLabel.textContent = term === 'next_month_day' ? '익월 입금일' : '익익월 입금일';
        valueInput.min = '1';
        valueInput.max = '31';
        valueInput.placeholder = '1~31';
    } else if (term === 'after_days') {
        valueWrap.style.display = 'block';
        valueLabel.textContent = '운행 후 경과일';
        valueInput.min = '0';
        valueInput.max = '';
        valueInput.placeholder = '예: 30';
    } else {
        valueWrap.style.display = 'none';
        valueInput.value = '';
    }
}

function updateClientPaymentTermGuide() {
    const term = document.getElementById('clientPaymentTerm').value;
    const value = document.getElementById('clientPaymentTermValue').value;
    const guide = document.getElementById('clientPaymentTermGuide');
    const exampleWorkDate = '2026-07-15';
    const dueDate = calculatePaymentDueDate(exampleWorkDate, term, value);

    if ((term === 'next_month_day' || term === 'second_month_day') && !value) {
        guide.textContent = '입금일을 1일부터 31일 사이에서 입력해 주세요.';
        return;
    }

    if (term === 'after_days' && value === '') {
        guide.textContent = '운행 후 며칠 뒤 입금되는지 입력해 주세요.';
        return;
    }

    guide.textContent = `예시: 2026.07.15 운행 · ${getPaymentTermLabel(term, value)} → ${dueDate.replace(/-/g, '.')} 입금 예정`;
}

function applyClientPaymentTerms() {
    const clientName = document.getElementById('callClient').value.trim();
    const dueDateInput = document.getElementById('callPaymentDueDate');
    const guide = document.getElementById('callPaymentDueGuide');
    const editIndex = parseInt(document.getElementById('callDetailEditIndex').value, 10);
    const settings = getUserSettings();
    const client = (settings.clients || []).find(item => item.companyName === clientName);

    if (!client) {
        guide.textContent = '등록된 거래처를 선택하면 결제 조건에 맞춰 자동 입력됩니다.';
        if (editIndex < 0) dueDateInput.value = '';
        return;
    }

    const term = client.paymentTerm || 'next_month_end';
    const value = client.paymentTermValue || '';

    if (editIndex >= 0 && currentTempCallDetails[editIndex] && currentTempCallDetails[editIndex].paymentDueDate) {
        dueDateInput.value = currentTempCallDetails[editIndex].paymentDueDate;
    } else {
        dueDateInput.value = calculatePaymentDueDate(selectedDateKey, term, value);
    }

    guide.textContent = `${getPaymentTermLabel(term, value)} 조건이 적용되었습니다. 필요하면 입금 예정일을 직접 수정할 수 있습니다.`;
}

// (showReceivablesManagement부터 renderRevenueYearly까지, getReceivableItems/
// getOverdueReceivableItems, renderReceivablesManagement부터 markMonthlyReceivablesPaid까지,
// getDriverCarWorkData/getMonthlyDriverTotals/calculateDriverVehicleCommission/
// getMonthlyFareRevenue → finance.js §코드 쪼개기 2차. currentReceivableTab/
// currentReceivableDetail 전역 변수도 함께 옮겼다. 아래 남겨둔 getDetailPaymentSummary/
// syncDetailPaymentStatus/getDdayText/알림 시스템은 콜상세 화면·알림 시스템과도 공유해서
// 쓰이므로 그대로 둔다.

// 결제 상태 계산: detail.payments 배열(부분입금 이력)을 기준으로 입금액/잔액/상태를 도출한다.
// payments 배열이 없는 예전 기록은 detail.paymentStatus만으로 하위호환 변환한다.

function openClientModal(index = -1) {
    editingClientIndex = index;
    const settings = getUserSettings();
    const clients = settings.clients || [];

    if (index >= 0 && clients[index]) {
        const client = clients[index];

        document.getElementById('clientModalTitle').textContent = '거래처 수정';
        document.getElementById('clientCompanyName').value = client.companyName || '';
        document.getElementById('clientManagerName').value = client.managerName || '';
        document.getElementById('clientTaxRepresentative').value = client.taxRepresentative || client.managerName || '';
        document.getElementById('clientBizNumber').value = client.bizNumber || '';
        document.getElementById('clientPhone').value = client.phone || '';
        document.getElementById('clientTaxBizType').value = client.taxBizType || '';
        document.getElementById('clientTaxBizItem').value = client.taxBizItem || '';
        document.getElementById('clientTaxAddress').value = client.taxAddress || '';
        document.getElementById('clientTaxEmail').value = client.taxEmail || '';

        document.getElementById('clientPinnedToggle').checked = !!client.isPinned;
        updateClientFavoriteStarUI();

        document.getElementById('clientCommToggle').checked = !!client.commEnabled;
        setClientCommType(client.commType || 'percent');
        document.getElementById('clientCommValue').value = client.commValue || '';
        toggleClientComm();

        document.getElementById('clientFixedRouteToggle').checked = !!client.fixedRouteLinked;
        document.getElementById('clientFixedUnitPrice').value = client.fixedUnitPrice || '';
        toggleClientFixedRoute();

        document.getElementById('clientPalletToggle').checked = !!client.palletOn;
        document.getElementById('clientPalletPrice').value = client.palletPrice || '';
        toggleClientPallet();

        const savedPaymentTerm = client.paymentTerm || 'next_month_end';
        document.getElementById('clientPaymentTerm').value = savedPaymentTerm === 'second_month_end' ? 'second_month_day' : savedPaymentTerm;
        document.getElementById('clientPaymentTermValue').value = savedPaymentTerm === 'second_month_end' ? '31' : (client.paymentTermValue || '');
    } else {
        document.getElementById('clientModalTitle').textContent = '거래처 등록';
        document.getElementById('clientCompanyName').value = '';
        document.getElementById('clientManagerName').value = '';
        document.getElementById('clientTaxRepresentative').value = '';
        document.getElementById('clientBizNumber').value = '';
        document.getElementById('clientPhone').value = '';
        document.getElementById('clientTaxBizType').value = '';
        document.getElementById('clientTaxBizItem').value = '';
        document.getElementById('clientTaxAddress').value = '';
        document.getElementById('clientTaxEmail').value = '';

        document.getElementById('clientPinnedToggle').checked = false;
        updateClientFavoriteStarUI();

        document.getElementById('clientCommToggle').checked = false;
        setClientCommType('percent');
        document.getElementById('clientCommValue').value = '';
        toggleClientComm();

        document.getElementById('clientFixedRouteToggle').checked = false;
        document.getElementById('clientFixedUnitPrice').value = '';
        toggleClientFixedRoute();

        document.getElementById('clientPalletToggle').checked = false;
        document.getElementById('clientPalletPrice').value = '';
        toggleClientPallet();

        document.getElementById('clientPaymentTerm').value = 'next_month_end';
        document.getElementById('clientPaymentTermValue').value = '';
    }

    document.getElementById('clientPaymentTerm').parentElement?._dropdownSync?.();

    updateClientPaymentTermControls();
    updateClientPaymentTermGuide();
    document.getElementById('clientModal').classList.remove('hidden');
}

function saveClient() {
    const companyName = document.getElementById('clientCompanyName').value.trim();
    const managerName = document.getElementById('clientManagerName').value.trim();
    const bizNumber = document.getElementById('clientBizNumber').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const taxRepresentative = document.getElementById('clientTaxRepresentative').value.trim();
    const taxEmail = document.getElementById('clientTaxEmail').value.trim();
    const taxAddress = document.getElementById('clientTaxAddress').value.trim();
    const taxBizType = document.getElementById('clientTaxBizType').value.trim();
    const taxBizItem = document.getElementById('clientTaxBizItem').value.trim();
    const isPinned = document.getElementById('clientPinnedToggle').checked;
    // 수수료는 이제 즐겨찾기와 무관하게 항상 켤 수 있다(예전엔 즐겨찾기 켰을 때만 가능했음).
    const commEnabled = document.getElementById('clientCommToggle').checked;
    const commType = document.getElementById('clientCommType').value;
    const commValue = document.getElementById('clientCommValue').value.trim();
    const fixedRouteLinked = document.getElementById('clientFixedRouteToggle').checked;
    const fixedUnitPrice = document.getElementById('clientFixedUnitPrice').value.trim();
    const palletOn = document.getElementById('clientPalletToggle').checked;
    const palletPrice = document.getElementById('clientPalletPrice').value.trim();
    const paymentTerm = document.getElementById('clientPaymentTerm').value;
    const paymentTermValue = document.getElementById('clientPaymentTermValue').value.trim();

    if (!companyName) {
        markFieldError('clientCompanyName');
        document.getElementById('clientCompanyName').focus();
        return;
    }

    if (commEnabled && !commValue) {
        markFieldError('clientCommValue');
        document.getElementById('clientCommValue').focus();
        return;
    }

    if (fixedRouteLinked && !fixedUnitPrice) {
        markFieldError('clientFixedUnitPrice');
        document.getElementById('clientFixedUnitPrice').focus();
        return;
    }

    if (palletOn && !palletPrice) {
        markFieldError('clientPalletPrice');
        document.getElementById('clientPalletPrice').focus();
        return;
    }

    if ((paymentTerm === 'next_month_day' || paymentTerm === 'second_month_day') && (!paymentTermValue || parseInt(paymentTermValue, 10) < 1 || parseInt(paymentTermValue, 10) > 31)) {
        markFieldError('clientPaymentTermValue');
        document.getElementById('clientPaymentTermValue').focus();
        return;
    }

    if (paymentTerm === 'after_days' && paymentTermValue === '') {
        markFieldError('clientPaymentTermValue');
        document.getElementById('clientPaymentTermValue').focus();
        return;
    }

    const settings = getUserSettings();

    if (!settings.clients) {
        settings.clients = [];
    }

    const previousClient = editingClientIndex >= 0 ? (settings.clients[editingClientIndex] || {}) : {};
    const clientData = {
        ...previousClient,
        // 거래처명과 무관한 고유 id. 수정 시에는 기존 id를 그대로 유지하고, 신규 등록일 때만
        // 새로 생성한다 — 운행 기록에 저장되는 clientId/commissionSnapshot이 이 id를 참조한다.
        id: previousClient.id || generateLocalId('client'),
        companyName,
        managerName,
        bizNumber,
        phone,
        taxRepresentative,
        taxEmail,
        taxAddress,
        taxBizType,
        taxBizItem,
        isPinned,
        commEnabled,
        commType,
        commValue,
        fixedRouteLinked,
        fixedUnitPrice,
        palletOn,
        palletPrice,
        paymentTerm,
        paymentTermValue
    };

    if (editingClientIndex >= 0) {
        settings.clients[editingClientIndex] = clientData;
        showToastMessage('수정했습니다.');
    } else {
        settings.clients.push(clientData);
        showToastMessage('등록했습니다.');
    }

    // 고정노선 연동은 계정 전체에서 거래처 1곳만 가능하다 — 지금 저장한 거래처를 켰다면
    // 나머지 거래처는 전부 자동으로 끈다(하루치 고정노선 운행횟수가 숫자 하나뿐이라, 두
    // 거래처가 동시에 연동되면 어느 쪽 몫인지 구분할 방법이 없기 때문).
    if (fixedRouteLinked) {
        settings.clients.forEach(client => {
            if (client.id !== clientData.id) client.fixedRouteLinked = false;
        });
    }

    setUserSettings(settings);
    closeClientModal();
    renderClientList();
    buildCalendar();

    if (clientModalOpenedFromCallDetail) {
        clientModalOpenedFromCallDetail = false;
        populateClientDataList();
        renderPinnedClientShortcuts();
        const callClientInput = document.getElementById('callClient');
        if (callClientInput) {
            callClientInput.value = companyName;
            calculateCallDetailComm();
            applyClientPaymentTerms();
        }
    }
}