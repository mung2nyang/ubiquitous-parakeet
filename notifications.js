// ============================================================================
// 알림 패널 — 연체 미수금/백업 권장/기사연동 안내/오늘자 미입력 안내 뱃지·패널
// (코드 쪼개기 6차: script.js에서 분리)
// ============================================================================
// getDdayText()는 이 도메인 소속처럼 보이지만 script.js에 그대로 남겼다 — 알림 패널뿐
// 아니라 finance.js의 미수금 화면에서도 직접 쓰는 함수라(finance.js 상단 주석에 이미
// "범용 유틸리티" 그룹으로 명시돼 있음) readWorkDataStorage/getDetailPaymentSummary와
// 같은 이유로 중앙에 남겨야 한다.
//
// getOverdueReceivableItems()/getReceivableItems()(finance.js)와 showMain/hideAllPages/
// closeNotificationPanel 등(script.js)은 함수 몸통 안에서만 참조하므로(런타임 호출)
// 파일 로드 순서는 상관없다.
// ============================================================================

// 어느 차량(logId)의 기록인지까지 포함해야 차량마다 알림 무시 여부가 올바르게 구분된다.
function getNotificationItemKey(item) {
    return `${item.logId}|${item.dateKey}|${item.detailIndex}|${item.paymentDueDate}`;
}

function getDismissedNotificationKeys() {
    try {
        const keys = JSON.parse(localStorage.getItem('dismissedReceivableNotifications') || '[]');
        return new Set(Array.isArray(keys) ? keys : []);
    } catch (error) {
        return new Set();
    }
}

function getVisibleOverdueNotifications() {
    const dismissed = getDismissedNotificationKeys();
    return getOverdueReceivableItems().filter(item => !dismissed.has(getNotificationItemKey(item)));
}

async function updateOverdueNotification(announce = false) {
    const overdueItems = getVisibleOverdueNotifications();
    const backupItem = await getBackupNotificationItem();
    const employerLinkItem = getEmployerLinkNotificationItem();
    const todayLogReminderItem = getTodayLogReminderNotificationItem();
    const totalCount = overdueItems.length + (backupItem ? 1 : 0) + (employerLinkItem ? 1 : 0) + (todayLogReminderItem ? 1 : 0);

    const badge = document.getElementById('overdueNotificationBadge');
    const notificationButton = document.getElementById('notificationBtn');
    if (!badge || !notificationButton) return;

    badge.hidden = totalCount === 0;
    badge.textContent = totalCount > 99 ? '99+' : String(totalCount);
    const label = totalCount > 0 ? `확인 필요한 알림 ${totalCount}건` : '새로운 알림 없음';
    notificationButton.title = label;
    notificationButton.setAttribute('aria-label', label);

    if (!announce || totalCount === 0) return;
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const signature = overdueItems
        .map(item => `${item.logId}:${item.dateKey}:${item.detailIndex}:${item.paymentDueDate}`)
        .sort()
        .join('|');
    // 이제 여러 차량 로그를 합산한 결과이므로 activeLogId로 더 이상 범위를 좁히지 않는다
    // (그러면 로그를 전환할 때마다 같은 연체 알림 토스트가 다시 뜨게 된다). 백업/기사연동
    // 알림 유무도 시그니처에 포함해서, 연체 미수금은 그대로인데 이 둘만 새로 생긴/사라진
    // 경우에도 토스트가 다시 안내되게 한다.
    const signatureWithBackup = `${signature}|backup:${backupItem ? backupItem.key : '0'}|employerLink:${employerLinkItem ? employerLinkItem.key : '0'}|todayLog:${todayLogReminderItem ? todayLogReminderItem.key : '0'}`;
    const alertKey = `${todayKey}|${signatureWithBackup}`;
    if (localStorage.getItem('lastOverdueReceivableAlert') === alertKey) return;

    localStorage.setItem('lastOverdueReceivableAlert', alertKey);
    // 기사연동 안내는 토스트로 스쳐 지나가지 않고 알림 패널(뱃지 카운트)에만 남겨둔다 — 여기서는
    // 의도적으로 토스트를 띄우지 않는다. 연체 미수금/백업 안내는 기존과 동일하게 유지한다.
    if (overdueItems.length > 0) {
        const total = overdueItems.reduce((sum, item) => sum + item.remainingAmount, 0);
        showToastMessage(`연체 미수금 ${overdueItems.length}건 · ${total.toLocaleString()}원이 있습니다.`);
    } else if (backupItem) {
        showToastMessage('데이터 백업을 권장합니다. 알림 메뉴를 확인해 주세요.');
    }
}

async function renderNotificationPanel() {
    const container = document.getElementById('notificationPanelList');
    if (!container) return;

    const overdueItems = getVisibleOverdueNotifications()
        .sort((a, b) => a.paymentDueDate.localeCompare(b.paymentDueDate));
    const backupItem = await getBackupNotificationItem();
    const employerLinkItem = getEmployerLinkNotificationItem();
    const todayLogReminderItem = getTodayLogReminderNotificationItem();

    if (overdueItems.length === 0 && !backupItem && !employerLinkItem && !todayLogReminderItem) {
        container.innerHTML = '<div class="notification-panel-empty">현재 확인이 필요한 알림이 없습니다.</div>';
        return;
    }

    // 서브 차량이 하나도 없는(메인만 쓰는) 계정에는 차량 구분 배지를 아예 노출하지 않는다.
    const hasSubCars = (getUserSettings().cars || []).some(car => car.type === 'sub');
    let html = '';

    // 오늘자 미입력 안내도 다른 안내처럼 카드 전체가 클릭되는 형태로 보여준다 — 누르면 바로
    // 오늘 날짜의 일일운행 입력 화면으로 이동한다(openTodayWorkModal 재사용).
    if (todayLogReminderItem) {
        html += `
            <div class="notification-swipe-shell" data-notification-key="${escapeDetailText(todayLogReminderItem.key)}">
                <div class="notification-delete-backdrop" aria-hidden="true"><span>삭제</span><span>삭제</span></div>
                <button type="button" class="notification-panel-item" onclick="handleTodayLogReminderNotificationClick(event)">
                    <div class="notification-panel-item-head">
                        <strong style="color: var(--primary-color);">${escapeDetailText(todayLogReminderItem.title)}</strong>
                        <span>${escapeDetailText(todayLogReminderItem.actionLabel)} &gt;</span>
                    </div>
                    <p class="notification-panel-item-message">${escapeDetailText(todayLogReminderItem.message)}</p>
                </button>
            </div>
        `;
    }

    // 기사연동 안내는 다른 기능(운행기록 조회 등)이 전부 이 연동을 전제로 하므로 맨 위,
    // 카드 전체가 클릭되는 형태로 보여준다 — 누르면 바로 연동 화면(개인정보의 소속 연결
    // 카드)으로 이동한다.
    if (employerLinkItem) {
        html += `
            <div class="notification-swipe-shell" data-notification-key="${escapeDetailText(employerLinkItem.key)}">
                <div class="notification-delete-backdrop" aria-hidden="true"><span>삭제</span><span>삭제</span></div>
                <button type="button" class="notification-panel-item" onclick="handleEmployerLinkNotificationClick(event)">
                    <div class="notification-panel-item-head">
                        <strong style="color: var(--primary-color);">${escapeDetailText(employerLinkItem.title)}</strong>
                        <span>${escapeDetailText(employerLinkItem.actionLabel)} &gt;</span>
                    </div>
                    <p class="notification-panel-item-message">${escapeDetailText(employerLinkItem.message)}</p>
                </button>
            </div>
        `;
    }

    // 백업 알림은 전용 카드로 렌더링한다("지금 백업" 버튼은 목록 클릭(연체 미수금
    // 이동)과 별개로 즉시 exportData()를 실행해야 하므로 stopPropagation으로 분리한다).
    if (backupItem) {
        html += `
            <div class="notification-swipe-shell" data-notification-key="${escapeDetailText(backupItem.key)}">
                <div class="notification-delete-backdrop" aria-hidden="true"><span>삭제</span><span>삭제</span></div>
                <div class="notification-panel-item backup-notification-item">
                    <div class="notification-panel-item-head">
                        <strong style="color: var(--primary-color);">${escapeDetailText(backupItem.title)}</strong>
                        <button type="button" class="backup-quick-btn" onclick="event.stopPropagation(); runSaveAction(this, 'backup-export', exportData);">${escapeDetailText(backupItem.actionLabel)}</button>
                    </div>
                    <p class="notification-panel-item-message">${escapeDetailText(backupItem.message)}</p>
                    <div class="notification-panel-item-meta">
                        <span>${escapeDetailText(backupItem.metaText)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    html += overdueItems.map(item => `
        <div class="notification-swipe-shell" data-notification-key="${escapeDetailText(getNotificationItemKey(item))}">
            <div class="notification-delete-backdrop" aria-hidden="true"><span>삭제</span><span>삭제</span></div>
            <button type="button" class="notification-panel-item" onclick="handleNotificationItemClick(event)">
                <div class="notification-panel-item-head">
                    <strong>${escapeDetailText(item.client)}</strong>
                    <span>${getDdayText(item.paymentDueDate)}</span>
                </div>
                ${hasSubCars ? `<div class="notification-panel-item-car"><span class="management-badge car-type${item.logId === 'main' ? ' main' : ''}">${escapeDetailText(item.logLabel)}</span></div>` : ''}
                <p class="notification-panel-item-message">입금 예정일이 지난 미수금입니다. 정산 내역을 확인해 주세요.</p>
                <div class="notification-panel-item-meta">
                    <span>입금 예정일 ${item.paymentDueDate.replace(/-/g, '.')}</span>
                    <b>${item.remainingAmount.toLocaleString()}원</b>
                </div>
            </button>
        </div>
    `).join('');

    container.innerHTML = html;
    initNotificationSwipeInteractions();
}

function handleNotificationItemClick(event) {
    const shell = event.currentTarget.closest('.notification-swipe-shell');
    if (shell?.dataset.suppressClick === 'true') {
        event.preventDefault();
        shell.dataset.suppressClick = 'false';
        return;
    }
    openNotificationReceivables();
}

// 알림 패널의 "사장님과 연결이 필요해요" 카드 클릭 — 패널을 닫고 바로 연동 화면으로
// 이동한다. showDriverConnectionManagement()는 이미 소속 기사 계정이면 개인정보 페이지의
// "소속 연결" 카드로 자동 안내해 주므로 그대로 재사용한다.
function handleEmployerLinkNotificationClick(event) {
    const shell = event.currentTarget.closest('.notification-swipe-shell');
    if (shell?.dataset.suppressClick === 'true') {
        event.preventDefault();
        shell.dataset.suppressClick = 'false';
        return;
    }
    closeNotificationPanel();
    showDriverConnectionManagement('main');
}

// 알림 패널의 "오늘 운행 아직 안 적으셨어요" 카드 클릭 — 패널을 닫고 바로 오늘 날짜의
// 일일운행 입력 화면으로 이동한다.
function handleTodayLogReminderNotificationClick(event) {
    const shell = event.currentTarget.closest('.notification-swipe-shell');
    if (shell?.dataset.suppressClick === 'true') {
        event.preventDefault();
        shell.dataset.suppressClick = 'false';
        return;
    }
    closeNotificationPanel();
    openTodayWorkModal();
}

function dismissNotification(shell) {
    const key = shell.dataset.notificationKey;
    const dismissed = getDismissedNotificationKeys();
    dismissed.add(key);
    localStorage.setItem('dismissedReceivableNotifications', JSON.stringify([...dismissed]));

    const item = shell.querySelector('.notification-panel-item');
    const direction = Number(shell.dataset.swipeDirection || -1);
    item.style.transition = 'transform .24s cubic-bezier(.2,.8,.2,1), opacity .18s ease';
    item.style.transform = `translateX(${direction * window.innerWidth}px)`;
    item.style.opacity = '0';

    setTimeout(() => {
        shell.style.height = `${shell.offsetHeight}px`;
        requestAnimationFrame(() => {
            shell.classList.add('removing');
            shell.style.height = '0px';
        });
    }, 170);

    setTimeout(() => {
        shell.remove();
        const list = document.getElementById('notificationPanelList');
        if (list && !list.querySelector('.notification-swipe-shell')) {
            list.innerHTML = '<div class="notification-panel-empty">현재 확인이 필요한 알림이 없습니다.</div>';
        }
    }, 430);

    updateOverdueNotification(false);
}

function initNotificationSwipeInteractions() {
    document.querySelectorAll('#notificationPanelList .notification-swipe-shell').forEach(shell => {
        const item = shell.querySelector('.notification-panel-item');
        let holdTimer = null;
        let startX = 0;
        let startY = 0;
        let offsetX = 0;
        let isHolding = false;
        let isSwiping = false;

        const reset = () => {
            clearTimeout(holdTimer);
            isHolding = false;
            isSwiping = false;
            offsetX = 0;
            shell.classList.remove('swiping', 'swipe-ready');
            item.style.transform = '';
        };

        item.addEventListener('pointerdown', event => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            startX = event.clientX;
            startY = event.clientY;
            offsetX = 0;
            shell.dataset.suppressClick = 'false';
            holdTimer = setTimeout(() => {
                isHolding = true;
                shell.classList.add('swipe-ready');
                navigator.vibrate?.(12);
            }, 360);
        });

        item.addEventListener('pointermove', event => {
            const deltaX = event.clientX - startX;
            const deltaY = event.clientY - startY;

            if (!isHolding) {
                if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) clearTimeout(holdTimer);
                return;
            }
            if (Math.abs(deltaY) > Math.abs(deltaX) + 14 && !isSwiping) return;

            isSwiping = true;
            offsetX = deltaX;
            shell.dataset.suppressClick = 'true';
            shell.classList.add('swiping');
            item.setPointerCapture?.(event.pointerId);
            item.style.transform = `translateX(${offsetX}px) scale(${Math.max(.97, 1 - Math.abs(offsetX) / 5000)})`;
        });

        const finishSwipe = () => {
            clearTimeout(holdTimer);
            if (!isSwiping) {
                if (isHolding) shell.dataset.suppressClick = 'true';
                reset();
                return;
            }

            const threshold = Math.min(110, shell.offsetWidth * .34);
            if (Math.abs(offsetX) >= threshold) {
                shell.dataset.swipeDirection = String(offsetX < 0 ? -1 : 1);
                isSwiping = false;
                dismissNotification(shell);
                return;
            }
            reset();
        };

        item.addEventListener('pointerup', finishSwipe);
        item.addEventListener('pointercancel', reset);
        item.addEventListener('lostpointercapture', () => {
            if (isSwiping) finishSwipe();
        });
    });
}

function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;
    if (panel.classList.contains('open')) {
        closeNotificationPanel();
        return;
    }

    renderNotificationPanel();
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    document.getElementById('notificationPanelOverlay')?.classList.add('show');
    document.getElementById('notificationBtn')?.setAttribute('aria-expanded', 'true');
}

function closeNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    document.getElementById('notificationPanelOverlay')?.classList.remove('show');
    document.getElementById('notificationBtn')?.setAttribute('aria-expanded', 'false');
}

function openNotificationReceivables() {
    closeNotificationPanel();
    setUtilityReturnPage('main');
    hideAllPages();
    document.getElementById('receivablesManagementPage').classList.remove('hidden');
    selectReceivableTab('due');
}
