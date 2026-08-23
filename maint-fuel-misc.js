// ============================================================================
// 정비/유류/기타지출 관리 (코드 쪼개기 4차: script.js에서 분리)
// ============================================================================
// 정비/유류/기타지출 관리 화면(목록·모달·요약)과 메인 운행일지 모달 안의 정비/유류/기타
// 요약 카드까지 전부 이 파일에 있다. workData(운행기록 저장소)/settings/거래처 등은
// script.js가 정의한 전역을 그대로 참조하므로(예: getUserSettings, workData,
// autoSaveWorkRecord, escapeDetailText, parseCurrencyValue) script.js보다 먼저 로드해야
// 하는 건 아니지만(전부 함수 몸통 안에서만 참조 — 실제 호출은 DOMContentLoaded 이후),
// 관례상 script.js보다 먼저 로드한다.
//
// 전수 grep 확인: 이 안의 함수들은 index.html의 onclick 속성에서만 바깥으로 불리고
// (클릭 시점에 실행되므로 로드 순서 무관), finance.js/finance-sync.js/supabase-sync.js
// 어디에서도 호출되지 않는다 — 매출/미수금/세금계산서 집계는 정비/유류/기타 기록을
// workData에서 직접 읽지, 이 파일의 렌더링 함수를 거치지 않는다. 순수 컷&페이스트이며
// 로직은 전혀 바꾸지 않았다.
// ============================================================================

function showMaintFuelManagement(tab = 'maint', returnPage = 'main') {
    setUtilityReturnPage(returnPage);
    hideAllPages();
    document.getElementById('maintManagementPage').classList.remove('hidden');

    maintViewDate = new Date(viewDate.getTime());
    fuelViewDate = new Date(viewDate.getTime());
    miscViewDate = new Date(viewDate.getTime());

    updateMaintDateSelects();
    updateFuelDateSelects();
    updateMiscDateSelects();
    selectMaintFuelTab(tab);
}

function selectMaintFuelTab(tab) {
    const tabs = {
        maint: { btn: 'maintTabBtn', panel: 'maintTabPanel', update: updateMaintDateSelects, render: renderMaintList },
        fuel: { btn: 'fuelTabBtn', panel: 'fuelTabPanel', update: updateFuelDateSelects, render: renderFuelList },
        misc: { btn: 'miscTabBtn', panel: 'miscTabPanel', update: updateMiscDateSelects, render: renderMiscList }
    };
    const activeTab = tabs[tab] ? tab : 'maint';

    Object.keys(tabs).forEach(key => {
        const { btn, panel } = tabs[key];
        document.getElementById(btn)?.classList.toggle('active-work', key === activeTab);
        const panelEl = document.getElementById(panel);
        if (panelEl) panelEl.style.display = key === activeTab ? 'block' : 'none';
    });

    tabs[activeTab].update();
    tabs[activeTab].render();
}

function updateFuelDateSelects() {
    const yearSelect = document.getElementById('fuelYearSelect');
    const monthSelect = document.getElementById('fuelMonthSelect');
    yearSelect.value = fuelViewDate.getFullYear();
    monthSelect.value = fuelViewDate.getMonth();
    yearSelect.parentElement?._dropdownSync?.();
    monthSelect.parentElement?._dropdownSync?.();
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

function getActiveVehicleNumber() {
    const settings = getUserSettings();
    if (activeLogId !== 'main') {
        const currentCar = (settings.cars || []).find(c => c.number === activeLogId);
        return currentCar?.number || activeLogId;
    }
    const mainCar = (settings.cars || []).find(c => c.type === 'main');
    return mainCar?.number || settings.carNumber || '';
}

function csvEscapeCell(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// 유가보조금 신청용 주유 내역 CSV 내보내기 (해당 월의 fuelItems 기준: 날짜/차량번호/구분/주유량/금액/유가보조금/누적거리)
function exportFuelSubsidyCsv() {
    const year = fuelViewDate.getFullYear();
    const monthNumber = fuelViewDate.getMonth() + 1;
    const month = String(monthNumber).padStart(2, '0');
    const prefix = `${year}-${month}-`;
    const vehicleNumber = getActiveVehicleNumber();

    const rows = [];
    Object.keys(workData).filter(date => date.startsWith(prefix)).sort().forEach(date => {
        const items = workData[date]?.fuelItems;
        if (!items?.length) return;
        items.forEach(item => {
            rows.push([
                date,
                vehicleNumber,
                item.type || '주유',
                parseFloat(item.liter) || 0,
                parseCurrencyValue(item.cost),
                parseCurrencyValue(item.subsidy),
                item.mileage || ''
            ]);
        });
    });

    if (rows.length === 0) {
        showToastMessage('선택한 달에 주유 내역이 없습니다.');
        return;
    }

    const header = ['날짜', '차량번호', '구분', '주유량(L)', '금액(원)', '유가보조금(원)', '누적거리(km)'];
    const csvBody = [header, ...rows].map(row => row.map(csvEscapeCell).join(',')).join('\r\n');
    const csvContent = '﻿' + csvBody; // UTF-8 BOM: 엑셀에서 한글 깨짐 방지

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const filename = `${year}-${month}_${vehicleNumber || '차량'}_유가보조금신청.csv`.replace(/[\\/:*?"<>|]/g, '_');
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToastMessage('유가보조금 신청용 CSV 파일을 저장했습니다.');
}

function updateMaintDateSelects() {
    const yearSelect = document.getElementById('maintYearSelect');
    const monthSelect = document.getElementById('maintMonthSelect');
    yearSelect.value = maintViewDate.getFullYear();
    monthSelect.value = maintViewDate.getMonth();
    yearSelect.parentElement?._dropdownSync?.();
    monthSelect.parentElement?._dropdownSync?.();
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

function updateMiscDateSelects() {
    const yearSelect = document.getElementById('miscYearSelect');
    const monthSelect = document.getElementById('miscMonthSelect');
    yearSelect.value = miscViewDate.getFullYear();
    monthSelect.value = miscViewDate.getMonth();
    yearSelect.parentElement?._dropdownSync?.();
    monthSelect.parentElement?._dropdownSync?.();
}

function changeMiscMonth(delta) {
    miscViewDate.setMonth(miscViewDate.getMonth() + delta);
    updateMiscDateSelects();
    renderMiscList();
}

function changeMiscYearMonth() {
    const y = parseInt(document.getElementById('miscYearSelect').value, 10);
    const m = parseInt(document.getElementById('miscMonthSelect').value, 10);
    miscViewDate.setFullYear(y);
    miscViewDate.setMonth(m);
    renderMiscList();
}

function restoreMaintFuelModalToRoot(panel) {
    if (!panel || panel.parentElement === document.body) return;
    const previousHost = panel.parentElement;
    panel.classList.remove('inline-expanded', 'is-visible');
    document.body.appendChild(panel);
    if (previousHost?.id === 'maintFuelInlineHost') {
        previousHost.classList.remove('is-open');
        previousHost.setAttribute('aria-hidden', 'true');
        previousHost.style.maxHeight = '0px';
    }
}

function selectMaintCategory(btnEl, value) {
    const isAlreadySelected = !!btnEl?.classList.contains('active');
    const group = btnEl?.closest('.pill-group') || document.getElementById('maintCategoryGroup');
    group.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active'));
    if (btnEl && !isAlreadySelected) btnEl.classList.add('active');
    document.getElementById('maintRecordCategory').value = isAlreadySelected ? '' : value;
}

function selectMaintPayment(btnEl, value) {
    document.querySelectorAll('#maintPaymentGroup .segment-btn').forEach(btn => btn.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    document.getElementById('maintRecordPayment').value = value;
}

function openMaintRecordModal(date = null, index = null, kind = 'maint') {
    let item = null;
    const isMisc = kind === 'misc';
    const isFromWorkModal = !document.getElementById('workModal').classList.contains('hidden');
    const maintModal = document.getElementById('maintRecordModal');
    const tempItems = isMisc ? currentTempMiscItems : currentTempMaintItems;
    const dataKey = isMisc ? 'miscItems' : 'maintItems';
    const viewDate = isMisc ? miscViewDate : maintViewDate;
    const titleBase = isMisc ? '기타지출' : '정비 내역';

    if (!isFromWorkModal) restoreMaintFuelModalToRoot(maintModal);

    if (isFromWorkModal && index === null && maintModal.classList.contains('inline-expanded') && !maintModal.classList.contains('hidden')) {
        closeMaintFuelInlinePanel(maintModal);
        return;
    }

    document.getElementById('maintRecordKind').value = kind;
    document.getElementById('maintRecordNameLabel').textContent = isMisc ? '지출 항목명' : '정비 항목명';
    const mileageGroup = document.getElementById('maintRecordMileageGroup');
    if (mileageGroup) mileageGroup.style.display = isMisc ? 'none' : '';
    const maintCategoryGroup = document.getElementById('maintCategoryGroup');
    const miscCategoryGroup = document.getElementById('miscCategoryGroup');
    if (maintCategoryGroup) maintCategoryGroup.style.display = isMisc ? 'none' : '';
    if (miscCategoryGroup) miscCategoryGroup.style.display = isMisc ? '' : 'none';
    const activeCategoryGroup = isMisc ? miscCategoryGroup : maintCategoryGroup;

    if (date !== null && index !== null) {
        if (isFromWorkModal && date === selectedDateKey && tempItems[index]) {
            item = tempItems[index];
        } else if (workData[date] && workData[date][dataKey] && workData[date][dataKey][index]) {
            item = workData[date][dataKey][index];
        }
    }

    if (item !== null) {
        document.getElementById('maintRecordModalTitle').textContent = `${titleBase} 수정`;
        document.getElementById('maintRecordDate').value = date;
        document.getElementById('maintRecordName').value = item.name;
        document.getElementById('maintRecordFare').value = parseCurrencyValue(item.fare).toLocaleString();

        document.getElementById('maintRecordMileage').value = item.mileage || '';

        const category = item.category || '';
        document.getElementById('maintRecordCategory').value = category;
        (activeCategoryGroup ? activeCategoryGroup.querySelectorAll('.pill-btn') : []).forEach(btn => {
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
        document.getElementById('maintRecordModalTitle').textContent = `${titleBase} 추가`;
        const y = viewDate.getFullYear();
        const m = String(viewDate.getMonth() + 1).padStart(2, '0');
        const d = String(new Date().getDate()).padStart(2, '0');

        const currentMonth = new Date().getMonth();
        const selectedMonth = viewDate.getMonth();
        document.getElementById('maintRecordDate').value = (currentMonth === selectedMonth) ? `${y}-${m}-${d}` : `${y}-${m}-01`;

        if (isFromWorkModal && selectedDateKey) {
            document.getElementById('maintRecordDate').value = selectedDateKey;
        }

        document.getElementById('maintRecordName').value = '';
        document.getElementById('maintRecordFare').value = '';

        document.getElementById('maintRecordMileage').value = '';
        document.getElementById('maintRecordCategory').value = '';
        document.querySelectorAll('#maintCategoryGroup .pill-btn, #miscCategoryGroup .pill-btn').forEach(btn => btn.classList.remove('active'));

        document.getElementById('maintRecordPayment').value = '카드';
        document.querySelectorAll('#maintPaymentGroup .segment-btn').forEach(btn => {
            if(btn.textContent.trim() === '카드') btn.classList.add('active');
            else btn.classList.remove('active');
        });

        document.getElementById('maintRecordOriginalDate').value = '';
        document.getElementById('maintRecordOriginalIndex').value = '';
    }
    maintModal.classList.remove('hidden');
    if (isFromWorkModal) openMaintFuelInlinePanel(maintModal);
}

function openMiscRecordModal(date = null, index = null) {
    openMaintRecordModal(date, index, 'misc');
}

function closeMaintRecordModal() {
    closeMaintFuelInlinePanel(document.getElementById('maintRecordModal'));
}

function closeMiscRecordModal() {
    closeMaintRecordModal();
}

function saveMaintRecord() {
    const kind = document.getElementById('maintRecordKind')?.value === 'misc' ? 'misc' : 'maint';
    const isMisc = kind === 'misc';
    const dataKey = isMisc ? 'miscItems' : 'maintItems';
    const viewDateRef = isMisc ? miscViewDate : maintViewDate;

    const date = document.getElementById('maintRecordDate').value;
    const name = document.getElementById('maintRecordName').value.trim();
    const fare = document.getElementById('maintRecordFare').value.trim();

    const mileage = document.getElementById('maintRecordMileage').value.trim();
    const category = document.getElementById('maintRecordCategory').value;
    const payment = document.getElementById('maintRecordPayment').value;

    const origDate = document.getElementById('maintRecordOriginalDate').value;
    const origIndex = document.getElementById('maintRecordOriginalIndex').value;

    if (!date) {
        markFieldError('maintRecordDate');
        document.getElementById('maintRecordDate').focus();
        return;
    }
    if (!name && !fare) {
        // 항목명 또는 비용 중 하나만 있으면 되는 검증이라, 콜 상세 저장(saveCallDetail)의
        // "여러 필드 중 하나만 있으면 통과" 패턴과 동일하게 둘 다 강조하고 첫 필드로 포커스한다.
        markFieldError('maintRecordName');
        markFieldError('maintRecordFare');
        document.getElementById('maintRecordName').focus();
        return;
    }

    const newItem = {
        name: name,
        fare: fare,
        mileage: mileage,
        category: category,
        payment: payment
    };

    if (!document.getElementById('workModal').classList.contains('hidden')) {
        const tempItems = isMisc ? currentTempMiscItems : currentTempMaintItems;
        if (origIndex !== '') {
            tempItems[origIndex] = newItem;
        } else {
            tempItems.push(newItem);
        }
        if (isMisc) renderMiscSummaryInMainModal(); else renderMaintSummaryInMainModal();
        autoSaveWorkRecord();
    } else {
        if (origDate && origIndex !== '') {
            workData[origDate][dataKey].splice(parseInt(origIndex, 10), 1);
        }

        if (!workData[date]) {
            workData[date] = { isOff: false, fixedCount: 0, palletCount: 0, maintItems: [], fuelItems: [], miscItems: [], callDetails: [] };
        }
        if (!workData[date][dataKey]) {
            workData[date][dataKey] = [];
        }

        workData[date][dataKey].push(newItem);

        saveDataToStorage();

        const updatedDate = new Date(date);
        viewDateRef.setFullYear(updatedDate.getFullYear());
        viewDateRef.setMonth(updatedDate.getMonth());
        if (isMisc) {
            updateMiscDateSelects();
            renderMiscList();
        } else {
            updateMaintDateSelects();
            renderMaintList();
        }
        buildCalendar();
    }

    closeMaintRecordModal();
    showToastMessage('저장되었습니다.');
}

function deleteMaintRecord(date, index, kind = 'maint') {
    const dataKey = kind === 'misc' ? 'miscItems' : 'maintItems';
    showConfirmModal('삭제하시겠습니까?', () => {
        workData[date][dataKey].splice(index, 1);
        saveDataToStorage();
        if (kind === 'misc') renderMiscList(); else renderMaintList();
        showToastMessage('삭제되었습니다.');
        buildCalendar();
    });
}

function deleteMiscRecord(date, index) {
    deleteMaintRecord(date, index, 'misc');
}

// ========== 정비/주유/기타 관리 목록 로직 ==========
const MAINT_FUEL_KIND_CONFIG = {
    maint: {
        containerId: 'maintListContainer',
        dataKey: 'maintItems',
        label: '정비',
        recordClass: 'maint-record',
        dayClass: 'maint-day',
        amount: item => parseCurrencyValue(item.fare),
        title: item => escapeDetailText(item.name || '정비'),
        notes: item => [item.payment || '카드', item.category, item.mileage ? `누적 ${item.mileage}km` : ''],
        icon: () => '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>',
        editAction: (date, idx) => `openMaintRecordModal('${date}', ${idx})`,
        deleteAction: (date, idx) => `deleteMaintRecord('${date}', ${idx})`
    },
    fuel: {
        containerId: 'fuelListContainer',
        dataKey: 'fuelItems',
        label: '주유',
        recordClass: 'fuel-record',
        dayClass: 'fuel-day',
        amount: item => parseCurrencyValue(item.cost),
        title: item => `${escapeDetailText(item.type || '주유')}${item.liter ? ` (${escapeDetailText(item.liter)}L)` : ''}`,
        notes: item => [item.mileage ? `누적 ${item.mileage}km` : '', item.subsidy ? `보조금 ${parseCurrencyValue(item.subsidy).toLocaleString()}원` : ''],
        icon: () => fuelIconSvg(),
        editAction: (date, idx) => `openFuelDetailModal('${date}', ${idx})`,
        deleteAction: (date, idx) => `deleteFuelRecord('${date}', ${idx})`
    },
    misc: {
        containerId: 'miscListContainer',
        dataKey: 'miscItems',
        label: '기타',
        recordClass: 'misc-record',
        dayClass: 'misc-day',
        amount: item => parseCurrencyValue(item.fare),
        title: item => escapeDetailText(item.name || item.category || '기타'),
        notes: item => [item.payment || '카드', item.category],
        icon: () => '<svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"></path></svg>',
        editAction: (date, idx) => `openMiscRecordModal('${date}', ${idx})`,
        deleteAction: (date, idx) => `deleteMiscRecord('${date}', ${idx})`
    }
};

function getMaintFuelViewDate(kind) {
    if (kind === 'fuel') return fuelViewDate;
    if (kind === 'misc') return miscViewDate;
    return maintViewDate;
}

function renderMaintList() {
    renderMaintFuelManagementList('maint');
}

function renderFuelList() {
    renderMaintFuelManagementList('fuel');
}

function renderMiscList() {
    renderMaintFuelManagementList('misc');
}

function renderMaintFuelManagementList(kind) {
    const config = MAINT_FUEL_KIND_CONFIG[kind] || MAINT_FUEL_KIND_CONFIG.maint;
    const targetDate = getMaintFuelViewDate(kind);
    const year = targetDate.getFullYear();
    const monthNumber = targetDate.getMonth() + 1;
    const month = String(monthNumber).padStart(2, '0');
    const prefix = `${year}-${month}-`;
    const container = document.getElementById(config.containerId);
    if (!container) return;
    const grouped = [];
    let monthlyTotal = 0;

    Object.keys(workData).filter(date => date.startsWith(prefix)).sort().forEach(date => {
        const source = workData[date][config.dataKey];
        if (!source?.length) return;
        const items = source.map((item, index) => ({ ...item, index }));
        const dailyTotal = items.reduce((sum, item) => sum + config.amount(item), 0);
        monthlyTotal += dailyTotal;
        grouped.push({ date, items, dailyTotal });
    });

    if (grouped.length === 0) {
        container.innerHTML = `<div class="empty-state">이번 달 등록된 ${config.label} 내역이 없습니다.</div>`;
    } else {
        container.innerHTML = grouped.map(group => {
            const itemHtml = group.items.map(item => {
                const amount = config.amount(item);
                const title = config.title(item);
                const notes = config.notes(item).filter(Boolean).map(value => `<span>${escapeDetailText(value)}</span>`).join('');
                const icon = config.icon();
                const editAction = config.editAction(group.date, item.index);
                const deleteAction = config.deleteAction(group.date, item.index);
                return `<div class="management-record-item ${config.recordClass}">
                    <div class="management-record-head"><div class="management-record-title">${icon}<strong>${title}</strong></div><div class="management-record-actions"><button type="button" class="action-icon-btn" onclick="${editAction}" title="수정">${editDetailSvg()}</button><button type="button" class="action-icon-btn del" onclick="${deleteAction}" title="삭제">${deleteDetailSvg()}</button></div></div>
                    <div class="management-record-info"><div>${notes}</div><strong>${amount.toLocaleString()}원</strong></div>
                </div>`;
            }).join('');
            return `<section class="management-day-card ${config.dayClass}">
                <div class="management-day-head"><strong>${group.date}</strong><div><span>${config.label} 합계</span><b>${group.dailyTotal.toLocaleString()}원</b></div></div>
                <div class="management-day-items">${itemHtml}</div>
            </section>`;
        }).join('');
    }

    const label = document.getElementById('maintFuelMonthLabel');
    const total = document.getElementById('maintFuelMonthTotal');
    if (label) {
        label.textContent = `${monthNumber}월 ${config.label}`;
        label.classList.toggle('fuel-color', kind === 'fuel');
        label.classList.toggle('misc-color', kind === 'misc');
    }
    if (total) total.textContent = `${monthlyTotal.toLocaleString()}원`;
}

function openMaintFuelCurrentAdd() {
    if (document.getElementById('maintTabPanel').style.display !== 'none') openMaintRecordModal();
    else if (document.getElementById('fuelTabPanel').style.display !== 'none') openFuelDetailModal();
    else openMiscRecordModal();
}

function openMaintFuelSelectModal() {
    const selectModal = document.getElementById('maintFuelSelectModal');
    const isFromWorkModal = !document.getElementById('workModal').classList.contains('hidden');
    if (!isFromWorkModal) restoreMaintFuelModalToRoot(selectModal);
    selectModal.classList.remove('hidden');
    if (isFromWorkModal) {
        openMaintFuelInlinePanel(selectModal);
    }
}

function closeMaintFuelSelectModal() {
    closeMaintFuelInlinePanel(document.getElementById('maintFuelSelectModal'));
}

function selectMaintOption() {
    hideMaintFuelInlinePanelImmediately(document.getElementById('maintFuelSelectModal'));
    openMaintRecordModal();
}

function selectFuelOption() {
    hideMaintFuelInlinePanelImmediately(document.getElementById('maintFuelSelectModal'));
    openFuelDetailModal(selectedDateKey);
}

function selectMiscOption() {
    hideMaintFuelInlinePanelImmediately(document.getElementById('maintFuelSelectModal'));
    openMiscRecordModal(selectedDateKey);
}

function openMaintFuelInlinePanel(panel) {
    const host = document.getElementById('maintFuelInlineHost');
    if (!host || !panel) return;

    ['maintFuelSelectModal', 'maintRecordModal', 'fuelDetailModal'].forEach(id => {
        const other = document.getElementById(id);
        if (other && other !== panel) {
            other.classList.add('hidden');
            other.classList.remove('inline-expanded', 'is-visible');
        }
    });

    host.appendChild(panel);
    panel.classList.remove('hidden');
    panel.classList.add('inline-expanded');
    host.classList.add('is-open');
    host.setAttribute('aria-hidden', 'false');
    host.style.maxHeight = '0px';

    requestAnimationFrame(() => {
        panel.classList.add('is-visible');
        host.style.maxHeight = `${panel.scrollHeight}px`;
        setTimeout(() => {
            host.style.maxHeight = `${panel.scrollHeight}px`;
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
    });
}

function hideMaintFuelInlinePanelImmediately(panel) {
    const host = document.getElementById('maintFuelInlineHost');
    if (!panel || !panel.classList.contains('inline-expanded')) return;
    panel.classList.add('hidden');
    panel.classList.remove('inline-expanded', 'is-visible');
    if (host) host.style.maxHeight = '0px';
}

function closeMaintFuelInlinePanel(panel) {
    const host = document.getElementById('maintFuelInlineHost');
    if (!panel || !host || !panel.classList.contains('inline-expanded')) {
        panel?.classList.add('hidden');
        return;
    }

    panel.classList.remove('is-visible');
    host.style.maxHeight = '0px';
    host.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => {
        panel.classList.add('hidden');
        panel.classList.remove('inline-expanded');
        host.classList.remove('is-open');
    }, 420);
}

function openFuelDetailModal(date = null, index = null) {
    let isFromWorkModal = !document.getElementById('workModal').classList.contains('hidden');
    const fuelModal = document.getElementById('fuelDetailModal');

    if (!isFromWorkModal) restoreMaintFuelModalToRoot(fuelModal);

    if (isFromWorkModal && index === null && fuelModal.classList.contains('inline-expanded') && !fuelModal.classList.contains('hidden')) {
        closeMaintFuelInlinePanel(fuelModal);
        return;
    }
    
    let targetDate = date;
    if (!date) {
        const y = fuelViewDate.getFullYear();
        const m = String(fuelViewDate.getMonth() + 1).padStart(2, '0');
        const d = String(new Date().getDate()).padStart(2, '0');
        targetDate = `${y}-${m}-${d}`;
    }

    document.getElementById('fuelDetailDate').value = targetDate;
    document.getElementById('fuelOriginalDate').value = date || '';
    document.getElementById('fuelOriginalIndex').value = index !== null ? index : '';

    document.getElementById('fuelDetailCost').value = '';
    document.getElementById('fuelDetailSubsidy').value = '';
    document.getElementById('fuelDetailLiter').value = '';
    document.getElementById('fuelDetailMileage').value = '';
    selectFuelType(document.querySelector('#fuelTypeGroup .pill-btn'), '주유', false);

    if (isFromWorkModal && index !== null && currentTempFuelItems[index]) {
        const item = currentTempFuelItems[index];
        if (item) {
            document.getElementById('fuelDetailCost').value = item.cost || '';
            document.getElementById('fuelDetailSubsidy').value = item.subsidy || '';
            document.getElementById('fuelDetailLiter').value = item.liter || '';
            document.getElementById('fuelDetailMileage').value = item.mileage || '';
            const btns = document.querySelectorAll('#fuelTypeGroup .pill-btn');
            const targetBtn = Array.from(btns).find(b => b.textContent === item.type);
            selectFuelType(targetBtn || btns[0], item.type || '주유', false);
        }
    } else if (date && index !== null) {
        const item = workData[date]?.fuelItems[index];
        document.getElementById('fuelDetailCost').value = item.cost || '';
        document.getElementById('fuelDetailSubsidy').value = item.subsidy || '';
        document.getElementById('fuelDetailLiter').value = item.liter || '';
        document.getElementById('fuelDetailMileage').value = item.mileage || '';
        const btns = document.querySelectorAll('#fuelTypeGroup .pill-btn');
        const targetBtn = Array.from(btns).find(b => b.textContent === item.type);
        selectFuelType(targetBtn || btns[0], item.type || '주유', false);
    }

    fuelModal.classList.remove('hidden');
    if (isFromWorkModal) openMaintFuelInlinePanel(fuelModal);
}

function closeFuelDetailModal() {
    closeMaintFuelInlinePanel(document.getElementById('fuelDetailModal'));
}

function selectFuelType(btnEl, type, allowToggle = true) {
    const isAlreadySelected = allowToggle && !!btnEl?.classList.contains('active');
    document.querySelectorAll('#fuelTypeGroup .pill-btn').forEach(btn => btn.classList.remove('active'));
    if (btnEl && !isAlreadySelected) btnEl.classList.add('active');
    document.getElementById('fuelDetailType').value = isAlreadySelected ? '' : type;
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
        markFieldError('fuelDetailDate');
        document.getElementById('fuelDetailDate').focus();
        return;
    }
    if (!cost && !liter) {
        // 비용 또는 주유량 중 하나만 있으면 되는 검증이라, 콜 상세 저장(saveCallDetail)의
        // "여러 필드 중 하나만 있으면 통과" 패턴과 동일하게 둘 다 강조하고 첫 필드로 포커스한다.
        markFieldError('fuelDetailCost');
        markFieldError('fuelDetailLiter');
        document.getElementById('fuelDetailCost').focus();
        return;
    }

    const newItem = { date, cost, subsidy, type, liter, mileage };

    if (!document.getElementById('workModal').classList.contains('hidden')) {
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
            workData[date] = { isOff: false, fixedCount: 0, palletCount: 0, maintItems: [], fuelItems: [], callDetails: [] };
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

function renderMaintSummaryInMainModal() {
    const container = document.getElementById('maintSummaryContainer');
    const listCard = document.getElementById('maintSummaryList');
    if (!container || !listCard) return;
    if (currentTempMaintItems.length === 0) {
        container.style.display = 'none';
        listCard.innerHTML = '';
        return;
    }

    container.style.display = 'block';
    let total = 0;
    const items = currentTempMaintItems.map((item, idx) => {
        const amount = parseCurrencyValue(item.fare);
        total += amount;
        const detail = [item.category, item.mileage ? `누적 ${item.mileage}km` : ''].filter(Boolean).map(escapeDetailText).join(' · ');
        return `<div class="maint-fuel-item maint-item-card">
            <div class="maint-fuel-head">
                <div class="maint-fuel-title maint-title-color"><svg class="maint-fuel-icon" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg><strong>${escapeDetailText(item.name || '정비')}</strong></div>
                <div class="maint-fuel-actions"><button type="button" class="action-icon-btn" onclick="openMaintRecordModal('${selectedDateKey}', ${idx})" title="수정">${editDetailSvg()}</button><button type="button" class="action-icon-btn del" onclick="currentTempMaintItems.splice(${idx}, 1); renderMaintSummaryInMainModal(); autoSaveWorkRecord();" title="삭제">${deleteDetailSvg()}</button></div>
            </div>
            <div class="maint-fuel-info"><div><span class="maint-payment-badge">${escapeDetailText(item.payment || '카드')}</span>${detail ? `<span class="maint-fuel-note">${detail}</span>` : ''}</div><strong>${amount.toLocaleString()}원</strong></div>
        </div>`;
    }).join('');
    listCard.innerHTML = `${items}<div class="maint-fuel-total maint-total-color"><strong>정비 합계</strong><strong>${total.toLocaleString()}원</strong></div>`;
}

function renderFuelSummaryInMainModal() {
    const container = document.getElementById('fuelSummaryContainer');
    const listCard = document.getElementById('fuelSummaryList');
    if (!container || !listCard) return;
    if (currentTempFuelItems.length === 0) {
        container.style.display = 'none';
        listCard.innerHTML = '';
        return;
    }

    container.style.display = 'block';
    let total = 0;
    const items = currentTempFuelItems.map((item, idx) => {
        const amount = parseCurrencyValue(item.cost);
        total += amount;
        const note = [item.mileage ? `누적 ${item.mileage}km` : '', item.subsidy ? `보조금 ${parseCurrencyValue(item.subsidy).toLocaleString()}원` : ''].filter(Boolean).join(' · ');
        return `<div class="maint-fuel-item fuel-item-card">
            <div class="maint-fuel-head">
                <div class="maint-fuel-title fuel-title-color">${fuelIconSvg('maint-fuel-icon')}<strong>${escapeDetailText(item.type || '주유')}${item.liter ? ` (${escapeDetailText(item.liter)}L)` : ''}</strong></div>
                <div class="maint-fuel-actions"><button type="button" class="action-icon-btn" onclick="openFuelDetailModal('${selectedDateKey}', ${idx})" title="수정">${editDetailSvg()}</button><button type="button" class="action-icon-btn del" onclick="currentTempFuelItems.splice(${idx}, 1); renderFuelSummaryInMainModal(); autoSaveWorkRecord();" title="삭제">${deleteDetailSvg()}</button></div>
            </div>
            <div class="maint-fuel-info"><div>${note ? `<span class="maint-fuel-note">${escapeDetailText(note)}</span>` : ''}</div><strong>${amount.toLocaleString()}원</strong></div>
        </div>`;
    }).join('');
    listCard.innerHTML = `${items}<div class="maint-fuel-total fuel-total-color"><strong>주유 합계</strong><strong>${total.toLocaleString()}원</strong></div>`;
}

function renderMiscSummaryInMainModal() {
    const container = document.getElementById('miscSummaryContainer');
    const listCard = document.getElementById('miscSummaryList');
    if (!container || !listCard) return;
    if (currentTempMiscItems.length === 0) {
        container.style.display = 'none';
        listCard.innerHTML = '';
        return;
    }

    container.style.display = 'block';
    let total = 0;
    const items = currentTempMiscItems.map((item, idx) => {
        const amount = parseCurrencyValue(item.fare);
        total += amount;
        const detail = [item.category].filter(Boolean).map(escapeDetailText).join(' · ');
        return `<div class="maint-fuel-item misc-item-card">
            <div class="maint-fuel-head">
                <div class="maint-fuel-title misc-title-color"><svg class="maint-fuel-icon" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"></path></svg><strong>${escapeDetailText(item.name || item.category || '기타')}</strong></div>
                <div class="maint-fuel-actions"><button type="button" class="action-icon-btn" onclick="openMiscRecordModal('${selectedDateKey}', ${idx})" title="수정">${editDetailSvg()}</button><button type="button" class="action-icon-btn del" onclick="currentTempMiscItems.splice(${idx}, 1); renderMiscSummaryInMainModal(); autoSaveWorkRecord();" title="삭제">${deleteDetailSvg()}</button></div>
            </div>
            <div class="maint-fuel-info"><div><span class="maint-payment-badge">${escapeDetailText(item.payment || '카드')}</span>${detail ? `<span class="maint-fuel-note">${detail}</span>` : ''}</div><strong>${amount.toLocaleString()}원</strong></div>
        </div>`;
    }).join('');
    listCard.innerHTML = `${items}<div class="maint-fuel-total misc-total-color"><strong>기타 합계</strong><strong>${total.toLocaleString()}원</strong></div>`;
}
