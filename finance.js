// ============================================================================
// 돈 관련 화면 모음: 매출 / 미수금 / 세금계산서 / 기사 정산
// (script.js에서 분리 — §코드 쪼개기 1차 세금계산서 + 2차 매출·미수금·정산, 테스트 저장소 한정)
// ============================================================================
// index.html에서 반드시 script.js보다 먼저 로드해야 한다 — script.js가 부팅 시점에
// (정규화 데이터 초기화 과정에서 getTaxInvoiceRecords(), 화면 초기화 과정에서
// initRevenueDateSelects()를) 곧바로 호출하기 때문에, 뒤에 로드하면 그 초기화가
// ReferenceError로 깨진다(실제로 재현해서 확인).
//
// 여기 있는 함수들은 전부 전역(window) 함수로 등록되며, script.js 쪽의 공용 헬퍼
// (getUserSettings, setUserSettings, escapeDetailText, escapeForInlineHandlerArg,
// parseCurrencyValue, generateLocalId, getFixedRouteClient, getVehicleSupplierIdentity,
// getEffectiveDriverSettlementMode, isVehicleRevenueSharedWithOwner, getShortCarNum,
// readWorkDataStorage, readWorkDataStoreForLog, writeWorkDataStoreForLog,
// getDetailPaymentSummary, syncDetailPaymentStatus, getDdayText, isDateWithinAssignment,
// buildCalendar, activeLogId, showToastMessage, showConfirmModal, markFieldError,
// runSaveAction, hideAllPages, setUtilityReturnPage, setActiveNav,
// populateYearMonthSelects, formatCurrencyInput 등)와, finance-sync.js 쪽의
// scheduleSupabaseTaxInvoiceSync를 그대로 전역으로 참조한다 — 파일만 나눴을 뿐
// 실행 방식(전역 스코프, 함수 호이스팅)은 script.js에 있을 때와 완전히 동일하다.
//
// 반대로 readWorkDataStorage/readWorkDataStoreForLog/writeWorkDataStoreForLog,
// getDetailPaymentSummary/syncDetailPaymentStatus, getDdayText는 콜상세 화면(day
// 모달)이나 알림 시스템 등 이 파일과 무관한 곳에서도 두루 쓰여서 일부러 script.js에
// 그대로 남겨뒀다 — "돈 관련 화면"이라는 카테고리에는 속하지만 실제로는 앱 전역에서
// 쓰이는 범용 유틸리티라 여기로 옮기면 나중에 엉뚱한 파일에서 찾게 된다.

// ---------- 세금계산서 관리 ----------
let taxInvoiceViewMonth = '';
let currentTaxInvoiceTab = 'draft';
let currentTaxInvoiceFlow = 'sales';

function getTaxInvoiceRecords() {
    try {
        const records = JSON.parse(localStorage.getItem('taxInvoiceRecords') || '[]');
        return Array.isArray(records) ? records : [];
    } catch (error) {
        return [];
    }
}

function saveTaxInvoiceRecords(records) {
    localStorage.setItem('taxInvoiceRecords', JSON.stringify(records));
    scheduleNormalizedEntitySync();
}

function getTaxInvoiceFlowMeta(flow = currentTaxInvoiceFlow) {
    const flows = {
        sales: { label: '매출 발행', partyHeading: '공급받는 자', itemName: '화물운송료', completeLabel: '발급 완료' },
        purchase: { label: '기사 매입', partyHeading: '공급자', itemName: '화물운송 용역', completeLabel: '수취 완료' },
        commission: { label: '수수료 발행', partyHeading: '공급받는 자', itemName: '운송 중개 수수료', completeLabel: '발급 완료' }
    };
    return flows[flow] || flows.sales;
}

function getTaxInvoiceRecordId(monthKey, partyKey, flow = currentTaxInvoiceFlow) {
    return `${flow}|${monthKey}|${partyKey}`;
}

function getTaxInvoiceSourceGroups(monthKey, flow = currentTaxInvoiceFlow) {
    const settings = getUserSettings();
    const cars = settings.cars || [];
    if (flow === 'sales') {
        // 그룹 키는 "월 + 차량(운행 로그) + 거래처" 기준이다 — 같은 거래처라도 차량이 다르면
        // (설령 두 차량이 같은 사업자로 정산되는 소속기사 차량이라도) 절대 하나로 합치지 않고
        // 차량별로 세금계산서를 분리한다. 예전에는 "공급사업자(supplier.key)"만 같으면 메인
        // 차량과 소속기사 차량 매출이 한 장으로 합산돼서, 캘린더(차량 1대분)와 세금계산서
        // (여러 차량 합산분) 금액이 안 맞아 보이는 문제가 있었다(실제로 보고됨: 사용자가 차량별
        // 분리 발행을 원함).
        const grouped = {};
        // 예전엔 "세금계산서 사용" 토글이 켜진 거래처만 이 목록에 걸러서 보여줬는데, 그 토글
        // 자체를 없앴다(§거래처 등록 개편) — 이제 실제로 매출이 잡힌 거래처는 전부 목록에
        // 뜨고, 사업자번호 등 필수 정보가 비어 있으면 발급 시점에 그때 안내한다(changeTaxInvoiceStatus).
        const sources = [{ logId: 'main', car: null, data: readWorkDataStorage('workData') }];
        cars.filter(car => car.type === 'sub').forEach(car => {
            const mode = getEffectiveDriverSettlementMode(car, settings);
            if (mode === 'company' || mode === 'employee') sources.push({ logId: car.number, car, data: getDriverCarWorkData(car, settings) });
        });
        const getOrCreateGroup = (clientName, supplier, vehicleKey) => {
            const groupKey = `${clientName}__${vehicleKey}`;
            if (!grouped[groupKey]) {
                grouped[groupKey] = {
                    partyKey: groupKey, clientName, partyType: 'client',
                    count: 0, supplyAmount: 0, taxAmount: 0,
                    supplierKey: supplier.key, supplierBiz: supplier.biz, vehicleLabel: supplier.carLabel,
                    vehicleNumbers: new Set()
                };
            }
            return grouped[groupKey];
        };

        const fixedRouteClientForInvoice = getFixedRouteClient(settings);
        const fixedClientName = fixedRouteClientForInvoice?.companyName || '';
        const fixedUnitPrice = parseCurrencyValue(fixedRouteClientForInvoice?.fixedUnitPrice);

        sources.forEach(source => {
            const supplier = getVehicleSupplierIdentity(source.car, settings);
            // 고정노선 거래처 연동 — 이제 거래처 등록 화면에서 지정한 거래처 1곳(계정 전체
            // 공용) 기준이다. 콜상세 없이 fixedCount(고정노선 운행 건수)만으로 매출이 잡히는
            // 것도 예전과 동일하게 여기서 함께 집계한다.
            Object.entries(source.data || {}).forEach(([dateKey, record]) => {
                (record?.callDetails || []).forEach(detail => {
                    const workDate = detail.workDate || dateKey;
                    const clientName = (detail.client || '').trim();
                    const supplyAmount = parseCurrencyValue(detail.fare);
                    if (!workDate.startsWith(monthKey) || !clientName || supplyAmount <= 0) return;
                    const group = getOrCreateGroup(clientName, supplier, source.logId);
                    group.count += 1;
                    group.supplyAmount += supplyAmount;
                    group.taxAmount += detail.vatExempt ? 0 : Math.round(supplyAmount * .1);
                    if (supplier.carNumber) group.vehicleNumbers.add(supplier.carNumber);
                });

                const fixedCount = parseInt(record?.fixedCount, 10) || 0;
                if (fixedCount > 0 && fixedClientName && dateKey.startsWith(monthKey)) {
                    const supplyAmount = fixedCount * fixedUnitPrice;
                    if (supplyAmount > 0) {
                        const group = getOrCreateGroup(fixedClientName, supplier, source.logId);
                        group.count += fixedCount;
                        group.supplyAmount += supplyAmount;
                        group.taxAmount += Math.round(supplyAmount * .1);
                        if (supplier.carNumber) group.vehicleNumbers.add(supplier.carNumber);
                    }
                }
            });
        });
        return Object.values(grouped).map(group => ({
            ...group,
            vehicleNumbers: Array.from(group.vehicleNumbers),
            totalAmount: group.supplyAmount + group.taxAmount
        }));
    }

    return cars.filter(car => car.type === 'sub').flatMap(car => {
        const mode = getEffectiveDriverSettlementMode(car, settings);
        if ((flow === 'purchase' && mode !== 'company') || (flow === 'commission' && mode !== 'driver_direct')) return [];
        const link = (settings.driverLinks || []).find(item => item.id === car.driverLinkId || item.vehicleNumber === car.number);
        const totals = getMonthlyDriverTotals(getDriverCarWorkData(car, settings), monthKey, link);
        if (totals.grossAmount <= 0) return [];
        const commissionAmount = calculateDriverVehicleCommission(car, totals.grossAmount, totals.count);
        const insuranceAmount = car.insuranceOn ? totals.insuranceAmount : 0;
        const netAmount = Math.max(0, totals.grossAmount - commissionAmount - insuranceAmount);
        const supplyAmount = flow === 'purchase'
            ? (settings.driverInvoiceBasis === 'gross' ? totals.grossAmount : netAmount)
            : commissionAmount;
        if (supplyAmount <= 0) return [];
        const taxAmount = Math.round(supplyAmount * .1);
        return [{
            partyKey: car.number,
            clientName: car.driverName || car.personalInfo?.driverName || getShortCarNum(car.number),
            partyType: 'driver',
            carNumber: car.number,
            count: totals.count,
            grossAmount: totals.grossAmount,
            commissionAmount,
            insuranceAmount,
            netAmount,
            supplyAmount,
            taxAmount,
            totalAmount: supplyAmount + taxAmount
        }];
    });
}

function getTaxInvoicePartyInfo(group) {
    const settings = getUserSettings();
    if (group.partyType === 'client') {
        const client = (settings.clients || []).find(item => item.companyName === group.clientName) || {};
        return { clientBizNumber:client.bizNumber || '', clientRepresentative:client.taxRepresentative || client.managerName || '', clientAddress:client.taxAddress || '', clientBizType:client.taxBizType || '', clientBizItem:client.taxBizItem || '', clientEmail:client.taxEmail || '' };
    }
    const car = (settings.cars || []).find(item => item.number === group.carNumber) || {};
    const info = car.personalInfo || {};
    return { clientBizNumber:info.bizNumber || '', clientRepresentative:info.name || car.driverName || '', clientAddress:info.address || '', clientBizType:info.bizType || '', clientBizItem:info.bizItem || '', clientEmail:info.email || '', carNumber:car.number };
}

function buildTaxInvoiceEntry(group, flow = currentTaxInvoiceFlow) {
    const id = getTaxInvoiceRecordId(taxInvoiceViewMonth, group.partyKey, flow);
    const saved = getTaxInvoiceRecords().find(item => item.id === id) || {};
    const meta = getTaxInvoiceFlowMeta(flow);
    return { ...getTaxInvoicePartyInfo(group), itemName:meta.itemName, remark:`${parseInt(taxInvoiceViewMonth.slice(5, 7), 10)}월 ${meta.itemName}`, ...saved, ...group, id, flow, logId:group.carNumber || 'fleet', monthKey:taxInvoiceViewMonth, status:saved.status || 'draft' };
}

function showTaxInvoices(returnPage = 'main') {
    setUtilityReturnPage(returnPage);
    document.getElementById('sideMenu')?.classList.remove('open');
    document.getElementById('sideMenuOverlay')?.classList.remove('show');
    hideAllPages();
    document.getElementById('taxInvoicePage').classList.remove('hidden');
    if (!taxInvoiceViewMonth) {
        const now = new Date();
        taxInvoiceViewMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    document.getElementById('taxInvoiceMonth').value = taxInvoiceViewMonth;
    renderTaxInvoices();
}

function changeTaxInvoiceMonth(value) {
    if (!/^\d{4}-\d{2}$/.test(value)) return;
    taxInvoiceViewMonth = value;
    const monthInput = document.getElementById('taxInvoiceMonth');
    if (monthInput && monthInput.value !== value) monthInput.value = value;
    renderTaxInvoices();
}

function changeTaxInvoiceMonthBy(offset) {
    if (!taxInvoiceViewMonth) return;
    const [year, month] = taxInvoiceViewMonth.split('-').map(Number);
    const targetDate = new Date(year, month - 1 + Number(offset || 0), 1);
    changeTaxInvoiceMonth(`${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`);
}

function selectTaxInvoiceTab(tab) {
    currentTaxInvoiceTab = tab === 'issued' ? 'issued' : 'draft';
    renderTaxInvoices();
}

function selectTaxInvoiceFlow(flow) {
    currentTaxInvoiceFlow = ['sales', 'purchase', 'commission'].includes(flow) ? flow : 'sales';
    currentTaxInvoiceTab = 'draft';
    renderTaxInvoices();
}

function renderTaxInvoices() {
    const settings = getUserSettings();
    const issuerReady = settings.bizName && settings.bizNumber && settings.userName && settings.bizType && settings.bizItem;
    const guide = document.getElementById('taxInvoiceIssuerGuide');
    const flowMeta = getTaxInvoiceFlowMeta();
    guide.className = `tax-invoice-guide${issuerReady ? ' ready' : ''}`;
    if (currentTaxInvoiceFlow === 'purchase') {
        guide.innerHTML = issuerReady
            ? `<strong>기사에게 받을 매입 계산서</strong><span>${settings.driverInvoiceBasis === 'gross' ? '총 운송료' : '수수료·산재보험 차감 후 기사 정산액'} 기준 · 공급받는 자 ${escapeDetailText(settings.bizName)}</span>`
            : '<strong>회사 사업자 정보가 필요합니다.</strong><span>마이페이지 → 개인정보에서 계산서를 받을 회사의 사업자 정보를 입력해 주세요.</span>';
    } else {
        guide.innerHTML = issuerReady
            ? `<strong>${escapeDetailText(settings.bizName)}</strong><span>${escapeDetailText(settings.bizNumber)} · ${flowMeta.label} · ${escapeDetailText(settings.bizType)} / ${escapeDetailText(settings.bizItem)}</span>`
            : '<strong>회사 사업자 정보가 필요합니다.</strong><span>마이페이지 → 개인정보에서 계산서를 발행할 회사의 사업자 정보를 입력해 주세요.</span>';
    }

    const flowGroups = {
        sales: getTaxInvoiceSourceGroups(taxInvoiceViewMonth, 'sales'),
        purchase: getTaxInvoiceSourceGroups(taxInvoiceViewMonth, 'purchase'),
        commission: getTaxInvoiceSourceGroups(taxInvoiceViewMonth, 'commission')
    };
    ['sales', 'purchase', 'commission'].forEach(flow => {
        const cap = flow.charAt(0).toUpperCase() + flow.slice(1);
        document.getElementById(`taxInvoice${cap}FlowCount`).textContent = flowGroups[flow].length;
        document.getElementById(`taxInvoice${cap}FlowTab`).classList.toggle('active', currentTaxInvoiceFlow === flow);
    });

    const sourceEntries = flowGroups[currentTaxInvoiceFlow].map(group => buildTaxInvoiceEntry(group, currentTaxInvoiceFlow));
    const storedIssued = getTaxInvoiceRecords().filter(item => item.flow === currentTaxInvoiceFlow && item.monthKey === taxInvoiceViewMonth && item.status === 'issued');
    const issuedById = new Map(storedIssued.map(item => [item.id, item]));
    sourceEntries.forEach(item => { if (item.status === 'issued') issuedById.set(item.id, item); });
    const issuedEntries = [...issuedById.values()];
    const draftEntries = sourceEntries.filter(item => item.status !== 'issued');

    document.getElementById('taxInvoiceDraftCount').textContent = draftEntries.length;
    document.getElementById('taxInvoiceIssuedCount').textContent = issuedEntries.length;
    document.getElementById('taxInvoiceDraftTab').classList.toggle('active', currentTaxInvoiceTab === 'draft');
    document.getElementById('taxInvoiceIssuedTab').classList.toggle('active', currentTaxInvoiceTab === 'issued');
    document.getElementById('taxInvoiceDraftTab').childNodes[0].nodeValue = currentTaxInvoiceFlow === 'purchase' ? '수취 전 ' : '작성 전 ';
    document.getElementById('taxInvoiceIssuedTab').childNodes[0].nodeValue = `${flowMeta.completeLabel} `;

    const entries = currentTaxInvoiceTab === 'issued' ? issuedEntries : draftEntries;
    const supplyTotal = entries.reduce((sum, item) => sum + Number(item.supplyAmount || 0), 0);
    const taxTotal = entries.reduce((sum, item) => sum + Number(item.taxAmount || 0), 0);
    document.getElementById('taxInvoiceSummary').innerHTML = `
        <div class="summary-title">
            <span>${flowMeta.label} 월간 정산</span>
            <span>${entries.length}건</span>
        </div>
        <div class="summary-row"><span>공급가액</span><span class="summary-value">${supplyTotal.toLocaleString()} 원</span></div>
        <div class="summary-row"><span>부가세</span><span class="summary-value">${taxTotal.toLocaleString()} 원</span></div>
        <div class="summary-row total"><span>합계</span><span class="summary-value">${(supplyTotal + taxTotal).toLocaleString()} 원</span></div>`;

    const list = document.getElementById('taxInvoiceList');
    if (entries.length === 0) {
        const emptyDraft = currentTaxInvoiceFlow === 'sales'
            ? '계산서 발행 대상 거래처의 운행내역이 없습니다.'
            : currentTaxInvoiceFlow === 'purchase'
                ? '회사 매입 방식으로 설정된 기사의 운행내역이 없습니다.'
                : '기사 직접발행 방식으로 설정된 수수료 내역이 없습니다.';
        list.innerHTML = `<div class="tax-invoice-empty"><span class="tax-invoice-empty-mark" aria-hidden="true">–</span><strong>${currentTaxInvoiceTab === 'issued' ? `${flowMeta.completeLabel} 내역이 없습니다.` : emptyDraft}</strong><small>선택한 월의 운행 기록을 기준으로 표시됩니다.</small></div>`;
        return;
    }

    list.innerHTML = entries.map(item => {
        const partyKey = encodeURIComponent(item.partyKey || item.clientName).replace(/'/g, '%27');
        const missingInfo = !item.clientBizNumber;
        const driverBreakdown = item.partyType === 'driver'
            ? `<small class="tax-invoice-driver-breakdown">${escapeDetailText(item.carNumber || '')} · 운송료 ${Number(item.grossAmount || 0).toLocaleString()}원${item.commissionAmount ? ` · 수수료 ${Number(item.commissionAmount).toLocaleString()}원` : ''}${item.insuranceAmount ? ` · 산재보험 ${Number(item.insuranceAmount).toLocaleString()}원` : ''}</small>`
            : '';
        // 매출 발행(sales)은 이제 차량마다 공급 사업자가 다를 수 있어서, 카드에 "어느 차량/
        // 사업자의 매출인지"를 함께 보여준다(요구사항 19) — 같은 거래처라도 카드가 여러 장
        // 나뉘어 있으면 이 라벨로 구분한다. vehicleLabel에 이미 "사업자명 · 차량번호"가 포함돼
        // 있으므로(별도 사업자 차량의 경우) 이름을 또 붙이면 중복 표시된다.
        const supplierBreakdown = (item.partyType === 'client' && item.vehicleLabel)
            ? `<small class="tax-invoice-driver-breakdown">${escapeDetailText(item.vehicleLabel)}</small>`
            : '';
        const draftActionLabel = currentTaxInvoiceFlow === 'purchase' ? '내용 입력' : '작성하기';
        const cancelLabel = currentTaxInvoiceFlow === 'purchase' ? '수취 취소' : '발급 취소';
        return `<article class="tax-invoice-card">
            <div class="tax-invoice-card-head"><div><strong>${escapeDetailText(item.clientName)}</strong><span>${item.count || 0}건 · ${missingInfo ? '사업자번호 미입력' : escapeDetailText(item.clientBizNumber)}</span>${driverBreakdown}${supplierBreakdown}</div><em class="${item.status}">${item.status === 'issued' ? flowMeta.completeLabel : (currentTaxInvoiceFlow === 'purchase' ? '수취 전' : '작성 전')}</em></div>
            <div class="tax-invoice-card-money"><span>공급가액 <b>${Number(item.supplyAmount).toLocaleString()}원</b></span><span>세액 <b>${Number(item.taxAmount).toLocaleString()}원</b></span><strong><small>합계</small>${Number(item.totalAmount).toLocaleString()}원</strong></div>
            <div class="tax-invoice-card-actions">
                <button type="button" onclick="openTaxInvoiceDraft('${partyKey}')">${item.status === 'issued' ? '내용 보기' : draftActionLabel}</button>
                <button type="button" onclick="runSaveAction(this, 'tax-invoice-export-${partyKey}', () => exportTaxInvoiceCsv('${partyKey}'))">엑셀 저장</button>
                ${item.status === 'issued' ? `<button type="button" onclick="runSaveAction(this, 'tax-invoice-status-${partyKey}', () => changeTaxInvoiceStatus('${partyKey}', 'draft'))">${cancelLabel}</button>` : `<button type="button" class="primary" onclick="runSaveAction(this, 'tax-invoice-status-${partyKey}', () => changeTaxInvoiceStatus('${partyKey}', 'issued'))">${flowMeta.completeLabel}</button>`}
            </div>
        </article>`;
    }).join('');
}

function findCurrentTaxInvoice(partyKey, flow = currentTaxInvoiceFlow) {
    const group = getTaxInvoiceSourceGroups(taxInvoiceViewMonth, flow).find(item => item.partyKey === partyKey);
    if (group) return buildTaxInvoiceEntry(group, flow);
    return getTaxInvoiceRecords().find(item => item.id === getTaxInvoiceRecordId(taxInvoiceViewMonth, partyKey, flow));
}

function openTaxInvoiceDraft(encodedPartyKey) {
    const partyKey = decodeURIComponent(encodedPartyKey);
    const item = findCurrentTaxInvoice(partyKey);
    if (!item) return;
    const meta = getTaxInvoiceFlowMeta(item.flow);
    document.getElementById('taxInvoiceRecordId').value = item.id;
    document.getElementById('taxInvoiceRecordFlow').value = item.flow;
    document.getElementById('taxInvoicePartyKey').value = item.partyKey || partyKey;
    document.getElementById('taxInvoiceModalTitle').textContent = `${meta.label} 계산서`;
    document.getElementById('taxInvoicePartyHeading').textContent = meta.partyHeading;
    document.getElementById('taxInvoiceClientName').value = item.clientName;
    document.getElementById('taxInvoiceClientBizNumber').value = item.clientBizNumber || '';
    document.getElementById('taxInvoiceClientRepresentative').value = item.clientRepresentative || '';
    document.getElementById('taxInvoiceClientEmail').value = item.clientEmail || '';
    document.getElementById('taxInvoiceClientAddress').value = item.clientAddress || '';
    document.getElementById('taxInvoiceClientBizType').value = item.clientBizType || '';
    document.getElementById('taxInvoiceClientBizItem').value = item.clientBizItem || '';
    document.getElementById('taxInvoiceDate').value = item.issueDate || `${taxInvoiceViewMonth}-${String(new Date(Number(taxInvoiceViewMonth.slice(0,4)), Number(taxInvoiceViewMonth.slice(5,7)), 0).getDate()).padStart(2, '0')}`;
    document.getElementById('taxInvoiceItemName').value = item.itemName || meta.itemName;
    document.getElementById('taxInvoiceRemark').value = item.remark || '';
    document.getElementById('taxInvoiceSupplyAmount').textContent = `${Number(item.supplyAmount).toLocaleString()}원`;
    document.getElementById('taxInvoiceTaxAmount').textContent = `${Number(item.taxAmount).toLocaleString()}원`;
    document.getElementById('taxInvoiceTotalAmount').textContent = `${Number(item.totalAmount).toLocaleString()}원`;
    document.getElementById('taxInvoiceModal').classList.remove('hidden');
}

function closeTaxInvoiceModal() {
    document.getElementById('taxInvoiceModal').classList.add('hidden');
}

function collectTaxInvoiceForm() {
    const id = document.getElementById('taxInvoiceRecordId').value;
    const flow = document.getElementById('taxInvoiceRecordFlow').value || currentTaxInvoiceFlow;
    const partyKey = document.getElementById('taxInvoicePartyKey').value;
    const clientName = document.getElementById('taxInvoiceClientName').value;
    const current = findCurrentTaxInvoice(partyKey, flow);
    return {
        ...current,
        id,
        flow,
        partyKey,
        logId: current?.carNumber || 'fleet',
        monthKey: taxInvoiceViewMonth,
        clientName,
        clientBizNumber: document.getElementById('taxInvoiceClientBizNumber').value.trim(),
        clientRepresentative: document.getElementById('taxInvoiceClientRepresentative').value.trim(),
        clientEmail: document.getElementById('taxInvoiceClientEmail').value.trim(),
        clientAddress: document.getElementById('taxInvoiceClientAddress').value.trim(),
        clientBizType: document.getElementById('taxInvoiceClientBizType').value.trim(),
        clientBizItem: document.getElementById('taxInvoiceClientBizItem').value.trim(),
        issueDate: document.getElementById('taxInvoiceDate').value,
        itemName: document.getElementById('taxInvoiceItemName').value.trim() || getTaxInvoiceFlowMeta(flow).itemName,
        remark: document.getElementById('taxInvoiceRemark').value.trim(),
        status: current?.status || 'draft',
        updatedAt: new Date().toISOString()
    };
}

function persistTaxInvoice(item) {
    const records = getTaxInvoiceRecords();
    const index = records.findIndex(record => record.id === item.id);
    // 이미 로컬에 supabaseId가 붙어있던 기존 레코드라면 그대로 이어받는다 — 안 이어받으면
    // 업데이트해야 할 서버 행을 못 찾아서 매번 새 행으로 insert되는 사고로 이어진다.
    if (index >= 0) records[index] = { ...records[index], ...item };
    else records.push(item);
    saveTaxInvoiceRecords(records);
    // 세금계산서 작성/발급 상태를 클라우드에도 반영한다 — 로컬에만 저장하면 기기를 바꾸거나
    // 저장공간이 지워졌을 때 이 이력이 통째로 사라진다(실제로 그런 상태였다가 고침).
    if (typeof scheduleSupabaseTaxInvoiceSync === 'function') scheduleSupabaseTaxInvoiceSync(item.id);
}

function saveTaxInvoicePartyInfo(item) {
    const settings = getUserSettings();
    if (item.partyType === 'driver') {
        const car = (settings.cars || []).find(entry => entry.number === item.carNumber);
        if (!car) return;
        car.personalInfo = {
            ...(car.personalInfo || {}),
            name: item.clientRepresentative,
            bizNumber: item.clientBizNumber,
            email: item.clientEmail,
            address: item.clientAddress,
            bizType: item.clientBizType,
            bizItem: item.clientBizItem
        };
    } else {
        const client = (settings.clients || []).find(entry => entry.companyName === item.clientName);
        if (!client) return;
        client.bizNumber = item.clientBizNumber;
        client.taxRepresentative = item.clientRepresentative;
        client.taxEmail = item.clientEmail;
        client.taxAddress = item.clientAddress;
        client.taxBizType = item.clientBizType;
        client.taxBizItem = item.clientBizItem;
    }
    setUserSettings(settings);
}

function saveTaxInvoiceDraft() {
    const item = collectTaxInvoiceForm();
    if (!item.clientBizNumber) {
        markFieldError('taxInvoiceClientBizNumber');
        document.getElementById('taxInvoiceClientBizNumber').focus();
        return;
    }
    if (!item.issueDate) {
        markFieldError('taxInvoiceDate');
        document.getElementById('taxInvoiceDate').focus();
        return;
    }
    persistTaxInvoice(item);
    saveTaxInvoicePartyInfo(item);
    closeTaxInvoiceModal();
    renderTaxInvoices();
    showToastMessage('세금계산서 작성 내용을 저장했습니다.');
}

// 계산서의 실제 "공급자"(발행 주체) 정보를 돌려준다. 매출 발행(sales)은 §16~21에 따라
// 운행 차량마다 공급 사업자가 다를 수 있으므로 getTaxInvoiceSourceGroups()가 그룹에 미리
// 붙여둔 supplierBiz를 우선 쓴다(메인차량/‘동일’ 기사차량이면 자동으로 차주 기본 사업자와
// 같음). 기사 매입/수수료 발행(purchase/commission)은 기존 그대로 차주 기본 사업자 하나만
// 쓴다 — 이번 작업은 기사 정산 계산서와 섞지 않는다(요구사항 21).
function getTaxInvoiceSupplierBiz(item, settings = getUserSettings()) {
    if (item?.flow === 'sales' && item.supplierBiz) return item.supplierBiz;
    return { name: settings.bizName || '', bizNumber: settings.bizNumber || '', representative: settings.bizRepresentative || settings.userName || '', address: settings.bizAddress || '', bizType: settings.bizType || '', bizItem: settings.bizItem || '', email: settings.bizEmail || '' };
}

function changeTaxInvoiceStatus(encodedPartyKey, status) {
    const partyKey = decodeURIComponent(encodedPartyKey);
    const item = findCurrentTaxInvoice(partyKey);
    if (!item) return;
    if (status === 'issued') {
        const settings = getUserSettings();
        const supplierBiz = getTaxInvoiceSupplierBiz(item, settings);
        if (!supplierBiz.name || !supplierBiz.bizNumber || !supplierBiz.representative) {
            showConfirmModal(
                item.flow === 'sales' && item.supplierBiz && !item.supplierBiz.sameAsOwner
                    ? '먼저 차량 관리에서 이 차량의 사업자 정보를 입력해 주세요.'
                    : '먼저 개인정보에서 공급자 사업자 정보를 입력해 주세요.',
                null
            );
            return;
        }
        if (!item.clientBizNumber) {
            openTaxInvoiceDraft(encodedPartyKey);
            showToastMessage('사업자등록번호란이 입력이 안 되어 있어요. 먼저 입력해 주세요.');
            return;
        }
    }
    item.status = status;
    item.issuedAt = status === 'issued' ? new Date().toISOString() : '';
    persistTaxInvoice(item);
    renderTaxInvoices();
    showToastMessage(status === 'issued' ? `${getTaxInvoiceFlowMeta(item.flow).completeLabel}로 표시했습니다.` : '처리 전 상태로 되돌렸습니다.');
}

function loadTaxInvoiceExcelLibrary() {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-tax-invoice-excel]');
        if (existing) {
            existing.addEventListener('load', () => resolve(window.ExcelJS), { once:true });
            existing.addEventListener('error', reject, { once:true });
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
        script.dataset.taxInvoiceExcel = 'true';
        script.onload = () => resolve(window.ExcelJS);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function exportTaxInvoiceCsv(encodedPartyKey) {
    const partyKey = decodeURIComponent(encodedPartyKey);
    const item = findCurrentTaxInvoice(partyKey);
    const settings = getUserSettings();
    // 매출 발행은 차량별 공급 사업자(§16~21)를 쓴다 — 항상 차주 기본 사업자만 확인하면
    // 다른 사업자로 설정된 기사차량의 계산서를 엉뚱하게 막게 된다.
    const resolvedSupplierBiz = item ? getTaxInvoiceSupplierBiz(item, settings) : null;
    if (!item || !resolvedSupplierBiz?.bizNumber || !item.clientBizNumber) {
        showConfirmModal('공급자와 공급받는 자의 사업자등록번호를 먼저 입력해 주세요.', null);
        return;
    }
    const companyParty = {
        bizNumber: resolvedSupplierBiz.bizNumber || '', name: resolvedSupplierBiz.name || '', representative: resolvedSupplierBiz.representative || '',
        address: resolvedSupplierBiz.address || '', bizType: resolvedSupplierBiz.bizType || '', bizItem: resolvedSupplierBiz.bizItem || '', email: resolvedSupplierBiz.email || ''
    };
    const otherParty = {
        bizNumber: item.clientBizNumber || '', name: item.clientName || '', representative: item.clientRepresentative || '',
        address: item.clientAddress || '', bizType: item.clientBizType || '', bizItem: item.clientBizItem || '', email: item.clientEmail || ''
    };
    const supplier = item.flow === 'purchase' ? otherParty : companyParty;
    const buyer = item.flow === 'purchase' ? companyParty : otherParty;
    const issueDate = item.issueDate || `${taxInvoiceViewMonth}-01`;
    const filename = `${taxInvoiceViewMonth}_${item.clientName}_${getTaxInvoiceFlowMeta(item.flow).label}_계산서.xlsx`.replace(/[\\/:*?"<>|]/g, '_');

    try {
        const ExcelJS = await loadTaxInvoiceExcelLibrary();
        const workbook = new ExcelJS.Workbook();
        workbook.creator = settings.bizName || '운행일지';
        workbook.created = new Date();
        workbook.subject = `${taxInvoiceViewMonth} ${item.itemName || getTaxInvoiceFlowMeta(item.flow).itemName}`;

        const sheet = workbook.addWorksheet('세금계산서', {
            pageSetup:{ paperSize:9, orientation:'landscape', fitToPage:true, fitToWidth:1, fitToHeight:1, margins:{left:.25,right:.25,top:.35,bottom:.35,header:.1,footer:.1} },
            views:[{ showGridLines:false }]
        });
        const widths = [5,10,18,10,14,5,10,18,10,14];
        widths.forEach((width,index) => { sheet.getColumn(index + 1).width = width; });
        sheet.properties.defaultRowHeight = 21;
        sheet.pageSetup.printArea = 'A1:J19';

        const thinBlue = { style:'thin', color:{argb:'FF8EA9D6'} };
        const mediumBlue = { style:'medium', color:{argb:'FF365B9D'} };
        const allThin = { top:thinBlue,left:thinBlue,bottom:thinBlue,right:thinBlue };
        const supplierFill = 'FFFFFFFF';
        const supplierSectionFill = 'FFFFD9D9';
        const supplierLabelFill = 'FFFFF2F2';
        const buyerFill = 'FFFFFFFF';
        const buyerSectionFill = 'FFC2D9F2';
        const buyerLabelFill = 'FFF2F5FF';
        const headerFill = 'FFF1F3F7';
        const baseFont = { name:'맑은 고딕', size:10, color:{argb:'FF222222'} };

        sheet.mergeCells('A1:E2');
        sheet.getCell('A1').value = '전자세금계산서';
        sheet.getCell('A1').font = { ...baseFont, size:18, bold:true };
        sheet.getCell('A1').alignment = { horizontal:'center', vertical:'middle' };
        sheet.mergeCells('F1:G1'); sheet.getCell('F1').value = '승인번호';
        sheet.mergeCells('H1:J1'); sheet.getCell('H1').value = '홈택스 발급 후 입력';
        sheet.mergeCells('F2:G2'); sheet.getCell('F2').value = '작성 구분';
        sheet.mergeCells('H2:J2'); sheet.getCell('H2').value = Number(item.taxAmount) > 0 ? '일반 과세' : '면세';

        sheet.mergeCells('A3:A7'); sheet.getCell('A3').value = '공\n급\n자';
        sheet.mergeCells('F3:F7'); sheet.getCell('F3').value = '공\n급\n받\n는\n자';
        sheet.getCell('A3').fill = {type:'pattern',pattern:'solid',fgColor:{argb:supplierSectionFill}};
        sheet.getCell('F3').fill = {type:'pattern',pattern:'solid',fgColor:{argb:buyerSectionFill}};
        sheet.getCell('A3').font = { ...baseFont, bold:true, color:{argb:'FFCA3333'} };
        sheet.getCell('F3').font = { ...baseFont, bold:true, color:{argb:'FF2468A6'} };
        sheet.getCell('A3').alignment = sheet.getCell('F3').alignment = { horizontal:'center',vertical:'middle',wrapText:true };

        const setTaxCell = (address,value,fill,bold=false) => {
            const cell=sheet.getCell(address); cell.value=value; cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:fill}};
            cell.font={...baseFont,bold}; cell.alignment={horizontal:bold?'center':'left',vertical:'middle',wrapText:true};
        };
        [3,4,5,6,7].forEach(row => {
            ['B','D'].forEach(col => setTaxCell(`${col}${row}`,'',supplierLabelFill,true));
            ['C','E'].forEach(col => setTaxCell(`${col}${row}`,'',supplierFill));
            ['G','I'].forEach(col => setTaxCell(`${col}${row}`,'',buyerLabelFill,true));
            ['H','J'].forEach(col => setTaxCell(`${col}${row}`,'',buyerFill));
        });
        setTaxCell('B3','등록번호',supplierLabelFill,true); setTaxCell('C3',supplier.bizNumber,supplierFill);
        setTaxCell('D3','종사업자\n번호',supplierLabelFill,true); setTaxCell('E3','',supplierFill);
        setTaxCell('B4','상호\n(법인명)',supplierLabelFill,true); setTaxCell('C4',supplier.name,supplierFill);
        setTaxCell('D4','대표자',supplierLabelFill,true); setTaxCell('E4',supplier.representative,supplierFill);
        setTaxCell('B5','사업장 주소',supplierLabelFill,true); sheet.mergeCells('C5:E5'); setTaxCell('C5',supplier.address,supplierFill);
        setTaxCell('B6','업태',supplierLabelFill,true); setTaxCell('C6',supplier.bizType,supplierFill);
        setTaxCell('D6','종목',supplierLabelFill,true); setTaxCell('E6',supplier.bizItem,supplierFill);
        setTaxCell('B7','이메일',supplierLabelFill,true); sheet.mergeCells('C7:E7'); setTaxCell('C7',supplier.email,supplierFill);

        setTaxCell('G3','등록번호',buyerLabelFill,true); setTaxCell('H3',buyer.bizNumber,buyerFill);
        setTaxCell('I3','종사업자\n번호',buyerLabelFill,true); setTaxCell('J3','',buyerFill);
        setTaxCell('G4','상호\n(법인명)',buyerLabelFill,true); setTaxCell('H4',buyer.name,buyerFill);
        setTaxCell('I4','대표자',buyerLabelFill,true); setTaxCell('J4',buyer.representative,buyerFill);
        setTaxCell('G5','사업장 주소',buyerLabelFill,true); sheet.mergeCells('H5:J5'); setTaxCell('H5',buyer.address,buyerFill);
        setTaxCell('G6','업태',buyerLabelFill,true); setTaxCell('H6',buyer.bizType,buyerFill);
        setTaxCell('I6','종목',buyerLabelFill,true); setTaxCell('J6',buyer.bizItem,buyerFill);
        setTaxCell('G7','이메일',buyerLabelFill,true); sheet.mergeCells('H7:J7'); setTaxCell('H7',buyer.email,buyerFill);
        sheet.mergeCells('A8:B8'); sheet.getCell('A8').value='작성일자';
        sheet.mergeCells('C8:D8'); sheet.getCell('C8').value='공급가액';
        sheet.mergeCells('E8:F8'); sheet.getCell('E8').value='세액';
        sheet.mergeCells('G8:J8'); sheet.getCell('G8').value='수정사유';
        sheet.mergeCells('A9:B9'); sheet.getCell('A9').value=issueDate;
        sheet.mergeCells('C9:D9'); sheet.getCell('C9').value=Number(item.supplyAmount);
        sheet.mergeCells('E9:F9'); sheet.getCell('E9').value=Number(item.taxAmount);
        sheet.mergeCells('G9:J9'); sheet.getCell('G9').value='';
        sheet.mergeCells('A10:B10'); sheet.getCell('A10').value='비고';
        const invoiceCar = item.carNumber
            ? (settings.cars || []).find(car => car.number === item.carNumber)
            : (settings.cars || []).find(car => car.type === 'main');
        const accountMemo = `${settings.bankName || '-'} ${settings.accountNumber || '-'} / ${settings.userName || '-'} / ${invoiceCar?.number || '-'}`;
        sheet.mergeCells('C10:J10'); sheet.getCell('C10').value=accountMemo;

        ['A11','B11','C11','D11','E11','F11','H11','I11','J11'].forEach((address,index) => {
            sheet.getCell(address).value = ['월','일','품목','규격','수량','단가','공급가액','세액','비고'][index];
        });
        sheet.mergeCells('F11:G11');
        const [year,month,day] = issueDate.split('-');
        sheet.getRow(12).values = [month,day,item.itemName || '화물운송료','',1,Number(item.supplyAmount),'',Number(item.supplyAmount),Number(item.taxAmount),item.remark || ''];
        sheet.mergeCells('F12:G12');
        for (let row=13; row<=16; row++) { sheet.getRow(row).values = ['','','','','','','','','','']; sheet.mergeCells(`F${row}:G${row}`); }

        sheet.mergeCells('A17:B17'); sheet.getCell('A17').value='합계금액';
        sheet.getCell('C17').value='현금'; sheet.getCell('D17').value='수표'; sheet.getCell('E17').value='어음';
        sheet.mergeCells('F17:G17'); sheet.getCell('F17').value='외상미수금';
        sheet.mergeCells('H17:J17'); sheet.getCell('H17').value='청구 구분';
        sheet.mergeCells('A18:B18'); sheet.getCell('A18').value=Number(item.totalAmount);
        sheet.getCell('C18').value=''; sheet.getCell('D18').value=''; sheet.getCell('E18').value='';
        sheet.mergeCells('F18:G18'); sheet.getCell('F18').value=Number(item.totalAmount);
        sheet.mergeCells('H18:J18'); sheet.getCell('H18').value='이 금액을 청구함';
        sheet.mergeCells('A19:J19'); sheet.getCell('A19').value='※ 본 문서는 세금계산서 작성 및 확인을 위한 자료입니다. 실제 발급 여부는 홈택스에서 확인해 주세요.';

        for (let row=1; row<=19; row++) {
            for (let col=1; col<=10; col++) {
                const cell = sheet.getCell(row,col);
                cell.border = allThin;
                if (!cell.font || !cell.font.name) cell.font = baseFont;
                cell.alignment = { ...(cell.alignment || {}), vertical:'middle', wrapText:true };
            }
        }
        for (let col=1; col<=10; col++) {
            sheet.getCell(1,col).border = { ...sheet.getCell(1,col).border, top:mediumBlue };
            sheet.getCell(19,col).border = { ...sheet.getCell(19,col).border, bottom:mediumBlue };
        }
        for (let row=1; row<=19; row++) {
            sheet.getCell(row,1).border = { ...sheet.getCell(row,1).border, left:mediumBlue };
            sheet.getCell(row,10).border = { ...sheet.getCell(row,10).border, right:mediumBlue };
        }
        const supplierBorder = { style:'thin', color:{argb:'FFFFD9D9'} };
        const buyerBorder = { style:'thin', color:{argb:'FFC2D9F2'} };
        const supplierOuterBorder = { style:'medium', color:{argb:'FFFFD9D9'} };
        const buyerOuterBorder = { style:'medium', color:{argb:'FFC2D9F2'} };
        for (let row=3; row<=7; row++) {
            for (let col=1; col<=5; col++) sheet.getCell(row,col).border={top:supplierBorder,left:supplierBorder,bottom:supplierBorder,right:supplierBorder};
            for (let col=6; col<=10; col++) sheet.getCell(row,col).border={top:buyerBorder,left:buyerBorder,bottom:buyerBorder,right:buyerBorder};
            sheet.getCell(row,1).border={...sheet.getCell(row,1).border,left:supplierOuterBorder};
            sheet.getCell(row,5).border={...sheet.getCell(row,5).border,right:supplierOuterBorder};
            sheet.getCell(row,6).border={...sheet.getCell(row,6).border,left:buyerOuterBorder};
            sheet.getCell(row,10).border={...sheet.getCell(row,10).border,right:buyerOuterBorder};
        }
        for (let col=1; col<=5; col++) {
            sheet.getCell(3,col).border={...sheet.getCell(3,col).border,top:supplierOuterBorder};
            sheet.getCell(7,col).border={...sheet.getCell(7,col).border,bottom:supplierOuterBorder};
        }
        for (let col=6; col<=10; col++) {
            sheet.getCell(3,col).border={...sheet.getCell(3,col).border,top:buyerOuterBorder};
            sheet.getCell(7,col).border={...sheet.getCell(7,col).border,bottom:buyerOuterBorder};
        }
        /* 표 전체 오른쪽 외곽선: J열과 K열 사이의 진한 파란색 굵은 선을 끝까지 유지한다. */
        for (let row=1; row<=19; row++) {
            sheet.getCell(row,10).border={...sheet.getCell(row,10).border,right:mediumBlue};
        }
        ['B3','D3','B4','D4','B5','B6','D6','B7'].forEach(address => {
            sheet.getCell(address).font={...baseFont,bold:true,color:{argb:'FFAF5F5F'}};
        });
        ['G3','I3','G4','I4','G5','G6','I6','G7'].forEach(address => {
            sheet.getCell(address).font={...baseFont,bold:true,color:{argb:'FF3A77A2'}};
        });
        [8,11,17].forEach(row => {
            sheet.getRow(row).eachCell({includeEmpty:true}, cell => {
                cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:headerFill}};
                cell.font={...baseFont,bold:true}; cell.alignment={horizontal:'center',vertical:'middle'};
            });
        });
        [1,2].forEach(row => {
            for (let col=1; col<=10; col++) sheet.getCell(row,col).fill={type:'pattern',pattern:'solid',fgColor:{argb:headerFill}};
        });
        ['F1','F2','A8','C8','E8','G8','A10','A11','B11','C11','D11','E11','F11','H11','I11','J11','A17','C17','D17','E17','F17','H17'].forEach(address => {
            sheet.getCell(address).alignment={horizontal:'center',vertical:'middle',wrapText:true};
            sheet.getCell(address).font={...baseFont,bold:true};
        });
        ['C9','E9','F12','H12','I12','A18','F18'].forEach(address => {
            sheet.getCell(address).numFmt='#,##0'; sheet.getCell(address).alignment={horizontal:'right',vertical:'middle'};
        });
        sheet.getCell('H18').font={...baseFont,bold:true}; sheet.getCell('H18').alignment={horizontal:'center',vertical:'middle'};
        sheet.getCell('A19').font={...baseFont,size:8,color:{argb:'FF777777'}}; sheet.getCell('A19').alignment={horizontal:'center',vertical:'middle'};
        sheet.getRow(1).height=25; sheet.getRow(2).height=25; sheet.getRow(3).height=32; sheet.getRow(4).height=32; sheet.getRow(5).height=34; sheet.getRow(19).height=24;

        const uploadSheet = workbook.addWorksheet('입력자료', {views:[{state:'frozen',ySplit:1}]});
        const uploadHeaders = ['작성일자','공급자등록번호','공급자상호','공급자대표자','공급자주소','공급자업태','공급자종목','공급자이메일','공급받는자등록번호','공급받는자상호','공급받는자대표자','공급받는자주소','공급받는자업태','공급받는자종목','공급받는자이메일','품목','수량','공급가액','세액','합계금액','비고'];
        const uploadRow = [issueDate,supplier.bizNumber,supplier.name,supplier.representative,supplier.address,supplier.bizType,supplier.bizItem,supplier.email,buyer.bizNumber,buyer.name,buyer.representative,buyer.address,buyer.bizType,buyer.bizItem,buyer.email,item.itemName || getTaxInvoiceFlowMeta(item.flow).itemName,1,Number(item.supplyAmount),Number(item.taxAmount),Number(item.totalAmount),item.remark];
        uploadSheet.addRow(uploadHeaders); uploadSheet.addRow(uploadRow);
        uploadSheet.getRow(1).font={name:'맑은 고딕',size:10,bold:true,color:{argb:'FFFFFFFF'}};
        uploadSheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF365B9D'}};
        uploadSheet.columns.forEach((column,index) => { column.width=index===0?13:18; });
        [18,19,20].forEach(col => { uploadSheet.getCell(2,col).numFmt='#,##0'; });

        const buffer = await workbook.xlsx.writeBuffer();
        const url = URL.createObjectURL(new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
        const link = document.createElement('a'); link.href=url; link.download=filename;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url),1000);
        showToastMessage('세금계산서 엑셀 파일을 저장했습니다.');
    } catch (error) {
        console.error('세금계산서 엑셀 저장 실패:', error);
        throw error;
    }
}

// ---------- 미수금 관리 / 월매출 화면 / 기사 정산 헬퍼 (§코드 쪼개기 2차) ----------

function showReceivablesManagement(returnPage = 'main') {
    setUtilityReturnPage(returnPage);
    hideAllPages();
    document.getElementById('receivablesManagementPage').classList.remove('hidden');
    selectReceivableTab('monthly');
}

function selectReceivableTab(tab) {
    document.getElementById('receivableMonthlyTab').classList.toggle('active', tab === 'monthly');
    document.getElementById('receivableDueTab').classList.toggle('active', tab === 'due');
    renderReceivablesManagement(tab);
}

let currentReceivableTab = 'monthly';
let currentReceivableDetail = null;

// ========== 월매출 화면 ==========
let currentRevenueTab = 'monthly'; // 'monthly' | 'yearly'
let revenueViewYear = new Date().getFullYear();
let revenueViewMonth = new Date().getMonth(); // 0-11, yearSelect/monthSelect 관례와 동일

// 소속 기사 계정용(기존 화면)과 차주 계정용(신설 상세 화면) 두 세트의 년/월 select가
// 같은 페이지에 함께 존재한다(계정 유형에 따라 한쪽만 보여준다) — 둘 다 채워둔다.
function initRevenueDateSelects() {
    populateYearMonthSelects('revenueYearSelect', 'revenueMonthSelect');
    populateYearMonthSelects('revenueOwnerYearSelect', 'revenueOwnerMonthSelect');
}

// 차주 화면의 "전체 손익 / 차주 / 기사" 서브탭 — 어느 차량 소스를 집계에 포함할지 결정한다.
// 'all'=메인+공유 서브차량 전부, 'owner'=메인 차량만(차주 본인 운행분), 'driver'=공유 서브차량만(고용 기사분).
let currentRevenueScope = 'owner';

function showRevenuePage(returnPage = 'main') {
    setUtilityReturnPage(returnPage);
    hideAllPages();
    document.getElementById('revenuePage').classList.remove('hidden');
    // 소속 기사 계정은 기존 화면을, 차주 계정은 새 상세 손익 화면을 본다(신설 화면은
    // "차주만" 적용하라는 요청에 따름).
    const isDriverAccount = getUserSettings().accountType === 'employed_driver';
    document.getElementById('revenueOwnerView')?.classList.toggle('hidden', isDriverAccount);
    document.getElementById('revenueDriverView')?.classList.toggle('hidden', !isDriverAccount);
    selectRevenueTab('monthly');
    setActiveNav('revenue');
}

function selectRevenueTab(tab) {
    currentRevenueTab = tab === 'yearly' ? 'yearly' : 'monthly';
    document.querySelectorAll('.revenue-yearly-tab-btn').forEach(el => el.classList.toggle('active', currentRevenueTab === 'yearly'));
    document.querySelectorAll('.revenue-monthly-tab-btn').forEach(el => el.classList.toggle('active', currentRevenueTab === 'monthly'));
    syncRevenueDateSelects();
    renderRevenuePage();
}

function selectRevenueScope(scope) {
    currentRevenueScope = (scope === 'all' || scope === 'driver') ? scope : 'owner';
    document.querySelectorAll('.revenue-scope-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.scope === currentRevenueScope);
    });
    renderRevenuePage();
}

// 화살표 버튼: 월매출 탭에서는 한 달씩, 년매출 탭에서는 한 해씩 이동한다.
function changeRevenueDate(delta) {
    if (currentRevenueTab === 'yearly') {
        revenueViewYear += delta;
    } else {
        revenueViewMonth += delta;
        if (revenueViewMonth < 0) { revenueViewMonth = 11; revenueViewYear -= 1; }
        else if (revenueViewMonth > 11) { revenueViewMonth = 0; revenueViewYear += 1; }
    }
    syncRevenueDateSelects();
    renderRevenuePage();
}

// 소속 기사/차주 두 화면의 select가 각각 onchange로 이 값을 직접 넘겨준다(어느 쪽 DOM이
// 지금 보이는지 굳이 가리지 않아도 되도록).
function changeRevenueYear(value) {
    revenueViewYear = parseInt(value, 10);
    renderRevenuePage();
}

function changeRevenueMonth(value) {
    if (currentRevenueTab === 'monthly') revenueViewMonth = parseInt(value, 10);
    renderRevenuePage();
}

// 선택값/화살표 타이틀/월 선택 노출 여부를 현재 탭·연·월 상태에 맞춰 동기화한다. 소속
// 기사/차주 화면 두 세트의 select·버튼에 전부(숨겨진 쪽도 포함) 반영해 둔다 — 둘 중
// 어느 화면으로 전환되든 항상 최신 상태를 보여주기 위함이다.
function syncRevenueDateSelects() {
    document.querySelectorAll('.revenue-year-select').forEach(sel => {
        sel.value = revenueViewYear;
        sel.parentElement?._dropdownSync?.();
    });
    document.querySelectorAll('.revenue-month-select').forEach(sel => {
        sel.value = revenueViewMonth;
        sel.parentElement?._dropdownSync?.();
        // 년매출 탭에서는 월 선택이 의미가 없으므로 숨긴다.
        if (sel.parentElement) sel.parentElement.style.display = currentRevenueTab === 'yearly' ? 'none' : '';
    });

    const label = currentRevenueTab === 'yearly' ? '해' : '달';
    document.querySelectorAll('.revenue-prev-btn').forEach(btn => { btn.title = `이전 ${label}`; });
    document.querySelectorAll('.revenue-next-btn').forEach(btn => { btn.title = `다음 ${label}`; });
}

function renderRevenuePage() {
    const isDriverAccount = getUserSettings().accountType === 'employed_driver';
    if (isDriverAccount) {
        if (currentRevenueTab === 'yearly') renderRevenueYearly();
        else renderRevenueMonthly();
        return;
    }
    if (currentRevenueTab === 'yearly') renderRevenueOwnerYearly();
    else renderRevenueOwnerMonthly();
}

function renderRevenueMonthly() {
    const container = document.getElementById('revenueResultContainer');
    if (!container) return;

    const monthKey = `${revenueViewYear}-${String(revenueViewMonth + 1).padStart(2, '0')}`;
    const result = getMonthlyFareRevenue(monthKey);

    const vehicleRowsHtml = result.byVehicle.length > 1 ? `
        <div class="revenue-vehicle-list">
            ${result.byVehicle.map(vehicle => `
                <div class="revenue-vehicle-row">
                    <span>${escapeDetailText(vehicle.label)}</span>
                    <span>${vehicle.fare.toLocaleString()}원</span>
                </div>
            `).join('')}
        </div>
    ` : '';

    container.innerHTML = `
        <div class="revenue-summary-card">
            <div class="revenue-summary-total">
                <span>${revenueViewYear}년 ${revenueViewMonth + 1}월 총 운송료</span>
                <strong>${result.totalFare.toLocaleString()}원</strong>
            </div>
            <div class="revenue-summary-count">총 ${result.tripCount}회 운행</div>
        </div>
        ${vehicleRowsHtml}
    `;
}

function renderRevenueYearly() {
    const container = document.getElementById('revenueResultContainer');
    if (!container) return;

    let yearTotal = 0;
    const rows = [];
    for (let month = 0; month < 12; month++) {
        const monthKey = `${revenueViewYear}-${String(month + 1).padStart(2, '0')}`;
        const result = getMonthlyFareRevenue(monthKey);
        yearTotal += result.totalFare;
        rows.push({ month: month + 1, fare: result.totalFare });
    }

    container.innerHTML = `
        <div class="revenue-year-list">
            ${rows.map(row => `
                <div class="revenue-year-row">
                    <span>${row.month}월</span>
                    <span>${row.fare.toLocaleString()}원</span>
                </div>
            `).join('')}
        </div>
        <div class="revenue-year-total">
            <span>${revenueViewYear}년 합계</span>
            <strong>${yearTotal.toLocaleString()}원</strong>
        </div>
    `;
}

// ---------- 차주 계정 전용 "매출" 상세 화면 ----------

// "HH:MM" 출발/도착 시각 두 개로 운행 시간(분)을 구한다. 도착이 출발보다 이르면(자정을
// 넘긴 야간운행) 24시간을 더해 보정한다. 콜상세 카드(renderCallDetailSummaryInMainModal)의
// 소요시간 표시와 동일한 계산 방식이다.
function getCallDetailDurationMinutes(detail) {
    const dep = detail?.departureTime;
    const arr = detail?.arrivalTime;
    if (!dep || !arr) return 0;
    const [sh, sm] = dep.split(':').map(Number);
    const [eh, em] = arr.split(':').map(Number);
    if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return 0;
    let minutes = (eh * 60 + em) - (sh * 60 + sm);
    if (minutes < 0) minutes += 1440;
    return minutes;
}

// 콜상세 한 건의 운임 수수료(거래처에 걸린 브로커/플랫폼 수수료)를 계산한다. 저장 시점의
// commissionSnapshot이 있으면 그 값을 우선 쓰고(거래처명 변경·수수료율 수정이 이미 저장된
// 기록을 소급해서 바꾸지 않도록), 없으면(마이그레이션 이전 기록) 현재 거래처 설정으로
// 폴백한다. renderCallDetailSummaryInMainModal() 내부의 동명 계산과 동일한 공식이다.
function getCallDetailCommissionAmount(detail, fare, settings) {
    const snapshot = detail?.commissionSnapshot;
    let enabled, type, value;
    if (snapshot) {
        enabled = snapshot.enabled;
        type = snapshot.type;
        value = snapshot.value;
    } else {
        const client = (settings.clients || []).find(c => c.companyName === detail?.client);
        enabled = !!client?.commEnabled;
        type = client?.commType;
        value = client?.commValue;
    }
    if (!enabled) return 0;
    return type === 'direct' ? parseCurrencyValue(value) : Math.floor(fare * (parseFloat(value) || 0) / 100);
}

// "매출 > 차주" 화면 전용 종합 집계. getMonthlyFareRevenue와 동일한 차량 소스 기준으로
// 운송 수입(운송료/운임 수수료/유가보조금 환급)·운행 지출(정비/주유비/기타)·부가세·
// 미입금 운송료·총 운행거리/시간을 한 번에 계산해서, 화면의 각 "상세보기(>)" 항목이
// 펼쳐 보일 세부 목록까지 함께 반환한다.
// scope: 'all'(메인+공유 서브차량 전부) | 'owner'(메인 차량만) | 'driver'(공유 서브차량만)
function getOwnerMonthlyFinanceDetail(monthKey, scope = 'owner') {
    const settings = getUserSettings();
    const cars = Array.isArray(settings.cars) ? settings.cars : [];

    const sources = [];
    if (scope !== 'driver') sources.push({ logId: 'main', label: '메인 차량', data: readWorkDataStorage('workData') });
    if (scope !== 'owner') {
        cars.filter(car => car.type === 'sub' && isVehicleRevenueSharedWithOwner(car)).forEach(car => {
            const mode = getEffectiveDriverSettlementMode(car, settings);
            if (mode === 'company' || mode === 'employee') {
                sources.push({ logId: car.number, label: getShortCarNum(car.number), data: getDriverCarWorkData(car, settings) });
            }
        });
    }

    const fixedRouteClientForTotals = getFixedRouteClient(settings);
    const fixedClientLabel = fixedRouteClientForTotals?.companyName || '고정노선';

    let tripCount = 0;
    let distanceKm = 0;
    let durationMinutes = 0;
    let vatAmount = 0;

    const fareByClient = new Map();
    const commissionByClient = new Map();
    const maintItems = [];
    const fuelItems = [];
    const miscItems = [];
    const fuelSubsidyItems = [];
    let fuelSubsidyTotal = 0;

    sources.forEach(source => {
        const isMain = source.logId === 'main';
        const activeFixedOn = isMain ? settings.fixedOn : settings.subFixedOn;
        const activePalletOn = !!fixedRouteClientForTotals?.palletOn;
        const fixedUnitPrice = parseCurrencyValue(fixedRouteClientForTotals?.fixedUnitPrice);
        const palletUnitPrice = parseCurrencyValue(fixedRouteClientForTotals?.palletPrice);

        Object.entries(source.data || {}).forEach(([dateKey, record]) => {
            if (!dateKey.startsWith(monthKey) || !record || typeof record !== 'object') return;

            // 정비/주유/기타 지출은 "휴무"로 표시된 날에도 입력할 수 있다(예: 쉬는 날 차량
            // 정비를 맡기는 경우 — autoSaveWorkRecord()가 isOff와 무관하게 이 항목들을
            // 함께 저장한다). 그래서 운송료/운행 건수와 달리 record.isOff 여부와 관계없이
            // 항상 집계해야 한다 — isOff인 날을 통째로 건너뛰면 그날 등록한 지출이 "매출"
            // 화면의 운행 지출에서 누락되는 문제가 있었다(실제로 보고됨).
            if (!record.isOff) {
                if (record.fixedCount > 0) {
                    const count = Number(record.fixedCount) || 0;
                    tripCount += count;
                    const amount = count * fixedUnitPrice;
                    fareByClient.set(fixedClientLabel, (fareByClient.get(fixedClientLabel) || 0) + amount);
                    // 고정노선 건은 개별 부가세 면제 설정이 없어 기본 과세로 계산한다.
                    vatAmount += Math.round(amount * 0.1);
                }
                if (record.palletCount > 0 && activeFixedOn && activePalletOn) {
                    const amount = (Number(record.palletCount) || 0) * palletUnitPrice;
                    fareByClient.set(fixedClientLabel, (fareByClient.get(fixedClientLabel) || 0) + amount);
                    vatAmount += Math.round(amount * 0.1);
                }

                (Array.isArray(record.callDetails) ? record.callDetails : []).forEach(detail => {
                    const type = detail?.distanceType || '';
                    if (type === '공차') {
                        // 0회 처리(getMonthlyFareRevenue와 동일 규칙)
                    } else if (type === '혼짐') {
                        if (detail.linkedLoadIndex === 'pending' || detail.linkedLoadIndex === '-1' || detail.linkedLoadIndex === undefined) tripCount += 1;
                    } else {
                        tripCount += 1;
                    }

                    const fare = parseCurrencyValue(detail?.fare);
                    const clientLabel = detail?.client || '미지정 거래처';
                    fareByClient.set(clientLabel, (fareByClient.get(clientLabel) || 0) + fare);

                    if (!detail?.vatExempt) vatAmount += Math.round(fare * 0.1);

                    const commission = getCallDetailCommissionAmount(detail, fare, settings);
                    if (commission > 0) commissionByClient.set(clientLabel, (commissionByClient.get(clientLabel) || 0) + commission);

                    distanceKm += parseCurrencyValue(detail?.distanceKm);
                    durationMinutes += getCallDetailDurationMinutes(detail);
                });
            }

            (record.maintItems || []).forEach(item => {
                maintItems.push({ date: dateKey, label: item.name || item.category || '정비', amount: parseCurrencyValue(item.fare) });
            });
            (record.fuelItems || []).forEach(item => {
                const cost = parseCurrencyValue(item.cost);
                const subsidy = parseCurrencyValue(item.subsidy);
                fuelItems.push({ date: dateKey, label: `${item.type || '주유'}${item.liter ? ` ${item.liter}L` : ''}`, amount: cost });
                if (subsidy > 0) {
                    fuelSubsidyItems.push({ date: dateKey, label: item.type || '주유', amount: subsidy });
                    fuelSubsidyTotal += subsidy;
                }
            });
            (record.miscItems || []).forEach(item => {
                miscItems.push({ date: dateKey, label: item.name || item.category || '기타', amount: parseCurrencyValue(item.fare) });
            });
        });
    });

    const sortByDate = (a, b) => a.date.localeCompare(b.date);
    maintItems.sort(sortByDate);
    fuelItems.sort(sortByDate);
    miscItems.sort(sortByDate);
    fuelSubsidyItems.sort(sortByDate);

    const fareItems = Array.from(fareByClient.entries()).map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount);
    const commissionItems = Array.from(commissionByClient.entries()).map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount);

    const fareTotal = fareItems.reduce((sum, i) => sum + i.amount, 0);
    const commissionTotal = commissionItems.reduce((sum, i) => sum + i.amount, 0);
    const maintTotal = maintItems.reduce((sum, i) => sum + i.amount, 0);
    const fuelTotal = fuelItems.reduce((sum, i) => sum + i.amount, 0);
    const miscTotal = miscItems.reduce((sum, i) => sum + i.amount, 0);

    const incomeTotal = fareTotal - commissionTotal + fuelSubsidyTotal;
    const expenseTotal = maintTotal + fuelTotal + miscTotal;

    // 미입금 운송료: 기존 미수금 관리(getReceivableItems)와 동일한 기준(paymentOn/subPaymentOn,
    // 회사/고용 정산 서브차량)으로 집계된 항목 중 이번 달 운행분만 뽑는다. scope가 'owner'/
    // 'driver'로 좁혀져 있으면 그에 맞춰 로그 소스도 함께 제한한다.
    const unpaidItems = getReceivableItems().filter(item => {
        if (!item.workDate.startsWith(monthKey) || item.remainingAmount <= 0) return false;
        if (scope === 'owner') return item.logId === 'main';
        if (scope === 'driver') return item.logId !== 'main';
        return true;
    });
    const unpaidTotal = unpaidItems.reduce((sum, i) => sum + i.remainingAmount, 0);

    return {
        monthKey,
        tripCount,
        distanceKm: Math.round(distanceKm),
        durationHours: Math.round(durationMinutes / 60),
        vatAmount,
        netProfit: incomeTotal - expenseTotal,
        income: {
            total: incomeTotal,
            fare: { total: fareTotal, items: fareItems },
            commission: { total: commissionTotal, items: commissionItems },
            fuelSubsidy: { total: fuelSubsidyTotal, items: fuelSubsidyItems }
        },
        expense: {
            total: expenseTotal,
            maint: { total: maintTotal, items: maintItems },
            fuel: { total: fuelTotal, items: fuelItems },
            misc: { total: miscTotal, items: miscItems }
        },
        unpaid: { total: unpaidTotal, count: unpaidItems.length, items: unpaidItems }
    };
}

// ">" 를 눌러 펼치는 상세 항목 한 줄(라벨+금액, 클릭 시 아래 화살표로 바뀌며 세부 목록이
// 펼쳐짐)을 만든다. amount는 화면에 표시할 부호 그대로(음수면 "-"가 그대로 붙는다) 받는다.
function revenueDetailRowHtml(rowId, label, amount, bodyItems, dateLabel) {
    const bodyHtml = (bodyItems && bodyItems.length)
        ? bodyItems.map(item => `
            <div class="revenue-detail-line">
                <span>${dateLabel && item.date ? `${escapeDetailText(item.date.slice(5).replace('-', '/'))} ` : ''}${escapeDetailText(item.label)}</span>
                <span>${item.amount.toLocaleString()}원</span>
            </div>
        `).join('')
        : '<div class="revenue-detail-empty">내역이 없습니다.</div>';

    return `
        <div class="revenue-detail-item">
            <button type="button" class="revenue-detail-head" onclick="toggleRevenueDetailRow(this)">
                <span class="revenue-detail-chevron"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
                <span class="revenue-detail-label">${escapeDetailText(label)}</span>
                <span class="revenue-detail-amount${amount < 0 ? ' negative' : ''}">${amount.toLocaleString()}원</span>
            </button>
            <div class="revenue-detail-body hidden" id="${rowId}">${bodyHtml}</div>
        </div>
    `;
}

// ">" 클릭 시 아래 화살표로 바뀌며 세부 내용이 펼쳐진다(요청하신 동작).
function toggleRevenueDetailRow(btn) {
    const body = btn.nextElementSibling;
    if (!body) return;
    const expanding = body.classList.contains('hidden');
    body.classList.toggle('hidden', !expanding);
    btn.classList.toggle('expanded', expanding);
}

function renderRevenueOwnerMonthly() {
    const container = document.getElementById('revenueOwnerResultContainer');
    if (!container) return;

    const monthKey = `${revenueViewYear}-${String(revenueViewMonth + 1).padStart(2, '0')}`;
    const d = getOwnerMonthlyFinanceDetail(monthKey, currentRevenueScope);

    container.innerHTML = `
        <div class="summary-card revenue-net-card">
            <div class="summary-row" style="margin-bottom:2px;">
                <span class="summary-title" style="margin-bottom:0;">당월 순이익</span>
                <span class="summary-value" style="font-size:var(--fs-7); font-weight:850; color:${d.netProfit < 0 ? 'var(--sunday-color)' : 'var(--primary-color)'};">${d.netProfit.toLocaleString()}원</span>
            </div>
            <div class="revenue-net-stats">총 ${d.tripCount}회 운행 / ${d.distanceKm.toLocaleString()}km / ${d.durationHours.toLocaleString()}시간</div>
            <div class="summary-row" style="margin-top:14px;">
                <span>당월 부가세(공급가액 기준 10%)</span>
                <span class="summary-value">${d.vatAmount.toLocaleString()}원</span>
            </div>
            ${revenueDetailRowHtml('revenueDetailUnpaid', `미입금 운송료(${d.unpaid.count}건)`, d.unpaid.total, d.unpaid.items.map(i => ({ label: i.client, amount: i.remainingAmount })))}
        </div>

        <div class="summary-card revenue-net-card">
            <div class="summary-title">운송 수입</div>
            ${revenueDetailRowHtml('revenueDetailFare', '운송료', d.income.fare.total, d.income.fare.items)}
            ${revenueDetailRowHtml('revenueDetailCommission', '운임 수수료', -d.income.commission.total, d.income.commission.items.map(i => ({ label: i.label, amount: -i.amount })))}
            ${revenueDetailRowHtml('revenueDetailSubsidy', '당월 유가보조금 환급', d.income.fuelSubsidy.total, d.income.fuelSubsidy.items, true)}
            <div class="summary-row total">
                <span>합계</span>
                <span class="summary-value">${d.income.total.toLocaleString()} 원</span>
            </div>
        </div>

        <div class="summary-card revenue-net-card">
            <div class="summary-title">운행 지출</div>
            ${revenueDetailRowHtml('revenueDetailMaint', '정비', -d.expense.maint.total, d.expense.maint.items.map(i => ({ ...i, amount: -i.amount })), true)}
            ${revenueDetailRowHtml('revenueDetailFuel', '주유비', -d.expense.fuel.total, d.expense.fuel.items.map(i => ({ ...i, amount: -i.amount })), true)}
            ${revenueDetailRowHtml('revenueDetailMisc', '기타', -d.expense.misc.total, d.expense.misc.items.map(i => ({ ...i, amount: -i.amount })), true)}
            <div class="summary-row total" style="color:var(--sunday-color);">
                <span>합계</span>
                <span class="summary-value" style="color:var(--sunday-color);">-${d.expense.total.toLocaleString()} 원</span>
            </div>
        </div>
    `;
}

function renderRevenueOwnerYearly() {
    const container = document.getElementById('revenueOwnerResultContainer');
    if (!container) return;

    let yearNet = 0;
    const rows = [];
    for (let month = 0; month < 12; month++) {
        const monthKey = `${revenueViewYear}-${String(month + 1).padStart(2, '0')}`;
        const d = getOwnerMonthlyFinanceDetail(monthKey, currentRevenueScope);
        yearNet += d.netProfit;
        rows.push({ month: month + 1, netProfit: d.netProfit });
    }

    container.innerHTML = `
        <div class="revenue-year-list">
            ${rows.map(row => `
                <div class="revenue-year-row">
                    <span>${row.month}월</span>
                    <span class="${row.netProfit < 0 ? 'negative' : ''}">${row.netProfit.toLocaleString()}원</span>
                </div>
            `).join('')}
        </div>
        <div class="revenue-year-total">
            <span>${revenueViewYear}년 순이익 합계</span>
            <strong>${yearNet.toLocaleString()}원</strong>
        </div>
    `;
}

// 지금 열려 있는 차량 로그 하나가 아니라, 세금계산서 집계(getTaxInvoiceSourceGroups)와 동일한
// 방식으로 메인 + 모든 서브 차량의 운행 기록을 합산해서 미수금 항목을 만든다.
// - 메인/서브는 각각 paymentOn(메인)·subPaymentOn(서브, 모든 서브 차량이 공유하는 설정)이
//   켜져 있을 때만 포함한다.
// - 기사 직접 정산(driver_direct) 차량은 그 매출이 회사(내 장부) 몫이 아니므로 세금계산서
//   집계와 동일하게 제외한다.
// - 각 항목에는 어느 로그에서 나왔는지 구분할 수 있도록 logId('main' 또는 차량번호)와
//   화면 표시용 logLabel을 함께 담는다.
function getReceivableItems() {
    const settings = getUserSettings();
    const cars = settings.cars || [];

    const sources = [];
    if (settings.paymentOn) {
        sources.push({ logId: 'main', logLabel: '메인 차량', data: readWorkDataStorage('workData') });
    }
    if (settings.subPaymentOn) {
        cars.filter(car => car.type === 'sub').forEach(car => {
            const mode = getEffectiveDriverSettlementMode(car, settings);
            if (mode === 'company' || mode === 'employee') {
                sources.push({ logId: car.number, logLabel: getShortCarNum(car.number), data: getDriverCarWorkData(car, settings) });
            }
        });
    }

    const items = [];

    sources.forEach(source => {
        Object.keys(source.data || {}).forEach(dateKey => {
            const record = source.data[dateKey];

            if (!record || record.isOff || !record.callDetails) {
                return;
            }

            record.callDetails.forEach((detail, detailIndex) => {
                const paymentSummary = getDetailPaymentSummary(detail);
                if (paymentSummary.status === 'paid') {
                    return;
                }

                items.push({
                    dateKey,
                    detailIndex,
                    logId: source.logId,
                    logLabel: source.logLabel,
                    client: detail.client || '미지정 거래처',
                    fare: parseCurrencyValue(detail.fare),
                    paidAmount: paymentSummary.paidAmount,
                    remainingAmount: paymentSummary.remainingAmount,
                    paymentSummaryStatus: paymentSummary.status,
                    payments: Array.isArray(detail.payments) ? detail.payments : [],
                    paymentDueDate: detail.paymentDueDate || '',
                    workDate: detail.workDate || dateKey,
                    loadLoc: detail.loadLoc || '',
                    unloadLoc: detail.unloadLoc || '',
                    remarks: detail.remarks || ''
                });
            });
        });
    });

    return items;
}

function getOverdueReceivableItems() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return getReceivableItems().filter(item => {
        if (!item.paymentDueDate) return false;
        const dueDate = new Date(`${item.paymentDueDate}T00:00:00`);
        return !Number.isNaN(dueDate.getTime()) && dueDate < today;
    });
}

function renderReceivablesManagement(tab) {
    currentReceivableTab = tab;
    const container = document.getElementById('receivablesListContainer');
    const items = getReceivableItems();
    // 서브 차량이 하나도 없는(메인만 쓰는) 계정에는 차량 구분 배지를 아예 노출하지 않는다.
    const hasSubCars = (getUserSettings().cars || []).some(car => car.type === 'sub');

    if (tab === 'monthly') {
        const grouped = {};

        items.forEach(item => {
            const monthKey = item.workDate.slice(0, 7);
            const groupKey = `${item.client}|${monthKey}`;

            if (!grouped[groupKey]) {
                grouped[groupKey] = {
                    client: item.client,
                    monthKey,
                    total: 0,
                    count: 0,
                    items: []
                };
            }

            grouped[groupKey].total += item.remainingAmount;
            grouped[groupKey].count += 1;
            grouped[groupKey].items.push(item);
        });

        const groups = Object.values(grouped).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

        if (groups.length === 0) {
            container.innerHTML = '<div class="receivable-empty">미수금 내역이 없습니다.</div>';
            return;
        }

        container.innerHTML = groups.map(group => {
            const [year, month] = group.monthKey.split('-');
            // 한 그룹(같은 거래처+월)에 여러 차량의 기록이 섞여 있을 수 있으므로, 관련된
            // 차량을 전부 모아 배지로 보여준다(중복 제거).
            const distinctLogs = hasSubCars
                ? [...new Map(group.items.map(i => [i.logId, i])).values()]
                : [];
            const carBadges = distinctLogs
                .map(i => `<span class="management-badge car-type${i.logId === 'main' ? ' main' : ''}">${escapeDetailText(i.logLabel)}</span>`)
                .join('');
            return `
                <div class="receivable-group-card">
                    <div class="receivable-group-head">
                        <div class="receivable-group-title">${escapeDetailText(group.client)}</div>
                        <div class="receivable-group-period">${year}년 ${parseInt(month, 10)}월 운행분</div>
                    </div>
                    ${carBadges ? `<div class="receivable-group-cars">${carBadges}</div>` : ''}
                    <div class="receivable-group-summary">
                        <span class="receivable-summary-label">미수금</span>
                        <strong class="receivable-summary-amount">${group.total.toLocaleString()}원</strong>
                        <span class="receivable-summary-separator" aria-hidden="true">·</span>
                        <span class="receivable-summary-count">${group.count}건</span>
                    </div>
                    <div class="receivable-card-actions">
                        <button type="button" class="receivable-detail-btn" onclick="openReceivableDetail('${encodeURIComponent(group.client)}', '${group.monthKey}')">미수금 상세</button>
                        <button type="button" class="receivable-complete-btn" onclick="markMonthlyReceivablesPaid('${escapeForInlineHandlerArg(group.client)}', '${group.monthKey}')">입금 완료 처리</button>
                    </div>
                </div>
            `;
        }).join('');

        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueItems = items
        .filter(item => {
            if (!item.paymentDueDate) return false;
            const dueDate = new Date(`${item.paymentDueDate}T00:00:00`);
            dueDate.setHours(0, 0, 0, 0);
            const difference = Math.round((dueDate - today) / 86400000);
            return difference <= 3;
        })
        .sort((a, b) => a.paymentDueDate.localeCompare(b.paymentDueDate));

    if (dueItems.length === 0) {
        container.innerHTML = '<div class="receivable-empty">D-3 이내 또는 연체된 미수금이 없습니다.</div>';
        return;
    }

    container.innerHTML = dueItems.map(item => {
        const workMonth = item.workDate.slice(0, 7).replace('-', '년 ') + '월';
        const carBadge = hasSubCars
            ? `<div class="receivable-item-car"><span class="management-badge car-type${item.logId === 'main' ? ' main' : ''}">${escapeDetailText(item.logLabel)}</span></div>`
            : '';
        return `
            <div class="receivable-item-card">
                <div class="receivable-item-row">
                    <div>
                        <div class="receivable-item-client">${escapeDetailText(item.client)}</div>
                        ${carBadge}
                        <div class="receivable-item-info">${workMonth} 운행분</div>
                        <div class="receivable-item-info">입금 예정일: ${item.paymentDueDate.replace(/-/g, '.')}</div>
                        <div class="receivable-dday">${getDdayText(item.paymentDueDate)}</div>
                    </div>
                    <div class="receivable-item-amount">${item.remainingAmount.toLocaleString()}원</div>
                </div>
            </div>
        `;
    }).join('');
}

function openReceivableDetail(encodedClientName, monthKey) {
    const clientName = decodeURIComponent(encodedClientName);
    currentReceivableDetail = { clientName, monthKey };
    hideAllPages();
    document.getElementById('receivableDetailPage').classList.remove('hidden');
    renderReceivableDetail();
}

function closeReceivableDetail() {
    hideAllPages();
    document.getElementById('receivablesManagementPage').classList.remove('hidden');
    selectReceivableTab(currentReceivableTab);
}

function getCurrentReceivableDetailItems() {
    if (!currentReceivableDetail) return [];
    return getReceivableItems()
        .filter(item => item.client === currentReceivableDetail.clientName && item.workDate.slice(0, 7) === currentReceivableDetail.monthKey)
        .sort((a, b) => a.workDate.localeCompare(b.workDate));
}

function renderReceivableDetail() {
    if (!currentReceivableDetail) return closeReceivableDetail();

    const items = getCurrentReceivableDetailItems();
    const { clientName, monthKey } = currentReceivableDetail;
    const [year, month] = monthKey.split('-');
    const total = items.reduce((sum, item) => sum + item.remainingAmount, 0);
    const dueDates = items.map(item => item.paymentDueDate).filter(Boolean).sort();
    // 서브 차량이 하나도 없는(메인만 쓰는) 계정에는 차량 구분 배지를 아예 노출하지 않는다.
    const hasSubCars = (getUserSettings().cars || []).some(car => car.type === 'sub');

    document.getElementById('receivableDetailClient').textContent = clientName;
    document.getElementById('receivableDetailPeriod').textContent = `${year}년 ${parseInt(month, 10)}월 운행분`;
    document.getElementById('receivableDetailTotal').textContent = `${total.toLocaleString()}원`;
    document.getElementById('receivableDetailCount').textContent = `${items.length}건`;
    document.getElementById('receivableDetailMeta').textContent = dueDates.length
        ? `입금 예정일 ${dueDates[0].replace(/-/g, '.')}`
        : '입금 예정일 미등록';

    const list = document.getElementById('receivableDetailList');
    const allPaidButton = document.getElementById('receivableDetailAllPaidBtn');
    allPaidButton.disabled = items.length === 0;

    if (items.length === 0) {
        list.innerHTML = '<div class="receivable-empty">모든 미수금이 입금 완료 처리되었습니다.</div>';
        return;
    }

    list.innerHTML = items.map(item => {
        const route = item.loadLoc || item.unloadLoc
            ? `${escapeDetailText(item.loadLoc || '상차지 미상')} <span aria-hidden="true">→</span> ${escapeDetailText(item.unloadLoc || '하차지 미상')}`
            : '운행 구간 미등록';
        const due = item.paymentDueDate
            ? `<span>입금 예정 ${item.paymentDueDate.replace(/-/g, '.')}</span><b>${getDdayText(item.paymentDueDate)}</b>`
            : '<span>입금 예정일 미등록</span>';

        const isPartial = item.paymentSummaryStatus === 'partial';
        const statusText = isPartial
            ? `${item.paidAmount.toLocaleString()}원 입금 · ${item.remainingAmount.toLocaleString()}원 남음`
            : '미수';
        const payments = Array.isArray(item.payments) ? item.payments : [];
        const historyRows = payments.map(payment => {
            const paidAtText = payment.paidAt
                ? new Date(payment.paidAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                : '-';
            return `<div class="receivable-payment-history-row"><span>${escapeDetailText(paidAtText)}</span><span>${parseCurrencyValue(payment.amount).toLocaleString()}원</span></div>`;
        }).join('');

        const carBadge = hasSubCars
            ? `<span class="management-badge car-type${item.logId === 'main' ? ' main' : ''}">${escapeDetailText(item.logLabel)}</span>`
            : '';

        return `
            <article class="receivable-detail-item">
                <div class="receivable-detail-item-top">
                    <time datetime="${item.workDate}">${item.workDate.replace(/-/g, '.')}</time>
                    <strong>${item.remainingAmount.toLocaleString()}원</strong>
                </div>
                ${carBadge ? `<div class="receivable-detail-car">${carBadge}</div>` : ''}
                <div class="receivable-detail-route">${route}</div>
                <div class="receivable-detail-due">${due}</div>
                ${item.remarks ? `<p class="receivable-detail-remarks">${escapeDetailText(item.remarks)}</p>` : ''}
                <div class="receivable-payment-status ${isPartial ? 'partial' : 'unpaid'}">${statusText} <span class="receivable-original-fare">(전체 ${item.fare.toLocaleString()}원)</span></div>
                ${payments.length ? `<button type="button" class="receivable-history-toggle-btn" onclick="togglePaymentHistory(this)">입금 내역 보기 (${payments.length}건)</button>
                <div class="receivable-payment-history hidden">${historyRows}</div>` : ''}
                <div class="receivable-item-actions">
                    <button type="button" class="receivable-item-paid-btn" onclick="markReceivableItemPaid('${escapeForInlineHandlerArg(item.logId)}', '${item.dateKey}', ${item.detailIndex})">이 건 입금 완료</button>
                    <button type="button" class="receivable-item-partial-btn" onclick="togglePartialPaymentInput(this)">부분 입금 처리</button>
                    ${payments.length ? `<button type="button" class="receivable-item-undo-btn" onclick="undoLastPayment('${escapeForInlineHandlerArg(item.logId)}', '${item.dateKey}', ${item.detailIndex})">취소</button>` : ''}
                </div>
                <div class="receivable-partial-input-row hidden">
                    <input type="text" inputmode="numeric" class="input-box receivable-partial-amount" placeholder="입금액 입력" oninput="formatCurrencyInput(this)">
                    <button type="button" class="receivable-partial-confirm-btn" onclick="confirmPartialPayment(this, '${escapeForInlineHandlerArg(item.logId)}', '${item.dateKey}', ${item.detailIndex})">확인</button>
                </div>
            </article>`;
    }).join('');
}

function togglePartialPaymentInput(btnEl) {
    const row = btnEl.closest('.receivable-detail-item')?.querySelector('.receivable-partial-input-row');
    if (!row) return;
    row.classList.toggle('hidden');
    if (!row.classList.contains('hidden')) {
        row.querySelector('input')?.focus();
    }
}

function togglePaymentHistory(btnEl) {
    btnEl.closest('.receivable-detail-item')?.querySelector('.receivable-payment-history')?.classList.toggle('hidden');
}

// 부분 입금 등록: payments 배열에 한 건을 추가한다. 남은 금액을 초과하는 입력은 막는다.
// logId('main' 또는 서브 차량 번호)로 그 항목이 속한 실제 로그를 찾아 반영한다 — 지금 열려
// 있는 차량 로그가 아니어도 정확히 그 차량의 저장소에 반영된다.
function addPartialPayment(logId, dateKey, detailIndex, amount) {
    const store = readWorkDataStoreForLog(logId);
    const detail = store[dateKey]?.callDetails?.[detailIndex];
    if (!detail) return;

    const value = parseCurrencyValue(amount);
    if (!(value > 0)) {
        showToastMessage('입금액을 올바르게 입력해 주세요.');
        return;
    }

    const summary = getDetailPaymentSummary(detail);
    if (value > summary.remainingAmount) {
        showToastMessage('남은 금액보다 큰 금액은 입력할 수 없습니다.');
        return;
    }

    if (!Array.isArray(detail.payments)) {
        // 레거시 데이터 이전: payments 없이 이미 완료 처리된 기록이 있었다면 결제 이력 1건으로 보존
        detail.payments = [];
        if ((detail.paymentStatus || '미수') !== '미수') {
            const fare = parseCurrencyValue(detail.fare);
            if (fare > 0) {
                detail.payments.push({ id: generateLocalId('pay'), amount: fare, paidAt: new Date().toISOString(), note: '(이전 기록)' });
            }
        }
    }

    detail.payments.push({ id: generateLocalId('pay'), amount: value, paidAt: new Date().toISOString(), note: '' });
    syncDetailPaymentStatus(detail);

    writeWorkDataStoreForLog(logId, store);
    if (logId === activeLogId) buildCalendar();
    renderReceivableDetail();
    showToastMessage('부분 입금을 등록했습니다.');
}

function confirmPartialPayment(btnEl, logId, dateKey, detailIndex) {
    const input = btnEl.closest('.receivable-partial-input-row')?.querySelector('input');
    if (!input) return;
    addPartialPayment(logId, dateKey, detailIndex, input.value);
}

// 가장 최근에 추가된 입금 기록 1건만 되돌린다 (전체 초기화가 아님).
function undoLastPayment(logId, dateKey, detailIndex) {
    const store = readWorkDataStoreForLog(logId);
    const detail = store[dateKey]?.callDetails?.[detailIndex];
    if (!detail || !Array.isArray(detail.payments) || detail.payments.length === 0) {
        showToastMessage('되돌릴 입금 기록이 없습니다.');
        return;
    }

    showConfirmModal('가장 최근 입금 기록 1건을 취소하시겠습니까?', () => {
        detail.payments.pop();
        syncDetailPaymentStatus(detail);
        writeWorkDataStoreForLog(logId, store);
        if (logId === activeLogId) buildCalendar();
        renderReceivableDetail();
        showToastMessage('입금 기록을 취소했습니다.');
    });
}

// "이 건 입금 완료": 남은 금액 전액을 결제 이력 한 건으로 등록해 완납 처리한다.
// (부분입금이 이미 있는 상태에서 눌러도 잔액만큼만 추가되므로 중복 합산되지 않는다.)
function markReceivableItemPaid(logId, dateKey, detailIndex) {
    const store = readWorkDataStoreForLog(logId);
    const detail = store[dateKey]?.callDetails?.[detailIndex];
    const summary = detail ? getDetailPaymentSummary(detail) : null;
    if (!detail || summary.status === 'paid') {
        showToastMessage('이미 처리된 내역입니다.');
        return renderReceivableDetail();
    }

    if (!Array.isArray(detail.payments)) detail.payments = [];
    if (summary.remainingAmount > 0) {
        detail.payments.push({ id: generateLocalId('pay'), amount: summary.remainingAmount, paidAt: new Date().toISOString(), note: '' });
    }
    syncDetailPaymentStatus(detail);

    writeWorkDataStoreForLog(logId, store);
    if (logId === activeLogId) buildCalendar();
    renderReceivableDetail();
    showToastMessage('입금 완료 처리했습니다.');
}

function markCurrentReceivableGroupPaid() {
    if (!currentReceivableDetail) return;
    markMonthlyReceivablesPaid(currentReceivableDetail.clientName, currentReceivableDetail.monthKey, true);
}

// 그룹(거래처+월)에 속한 항목이 여러 차량 로그에 걸쳐 있을 수 있으므로, getReceivableItems()로
// 정확히 같은 대상을 다시 추려서 로그별로 묶은 뒤 각 로그의 저장소에 정확히 반영한다.
function markMonthlyReceivablesPaid(clientName, monthKey, stayOnDetail = false) {
    const targets = getReceivableItems().filter(item =>
        item.client === clientName && item.workDate.slice(0, 7) === monthKey
    );

    const itemsByLog = new Map();
    targets.forEach(item => {
        if (!itemsByLog.has(item.logId)) itemsByLog.set(item.logId, []);
        itemsByLog.get(item.logId).push(item);
    });

    itemsByLog.forEach((logItems, logId) => {
        const store = readWorkDataStoreForLog(logId);
        logItems.forEach(({ dateKey, detailIndex }) => {
            const detail = store[dateKey]?.callDetails?.[detailIndex];
            if (!detail) return;

            const summary = getDetailPaymentSummary(detail);
            if (summary.status === 'paid') return;

            if (!Array.isArray(detail.payments)) detail.payments = [];
            if (summary.remainingAmount > 0) {
                detail.payments.push({ id: generateLocalId('pay'), amount: summary.remainingAmount, paidAt: new Date().toISOString(), note: '' });
            }
            syncDetailPaymentStatus(detail);
        });
        writeWorkDataStoreForLog(logId, store);
    });

    if (itemsByLog.has(activeLogId)) buildCalendar();
    if (stayOnDetail) renderReceivableDetail();
    else renderReceivablesManagement('monthly');
    showToastMessage(`${clientName} ${parseInt(monthKey.slice(5, 7), 10)}월분 미수금을 수금 완료 처리했습니다.`);
}

// ---------- 기사 정산 헬퍼 (월매출/미수금/세금계산서 공용) ----------

// 이 차량이 초대 코드로 연동된 기사차량이든 아니든, 실제 운행 기록은 항상 같은 로컬 키
// (workData_<차량번호>)에서 읽는다. 연동된 기사차량의 경우 그 키는 initWorkDataFromSupabase()가
// 로그인/새로고침 때마다 Supabase(daily_logs/transport_details, vehicle_id 기준)에서 실제
// 기사가 작성한 기록을 그대로 받아와 채워둔다 — settings.cars의 모든 차량(메인+기사차량)을
// car.supabaseId 기준으로 동일하게 처리하기 때문에 여기서 따로 분기할 필요가 없다.
// (예전엔 여기서 getLinkedDriverRecordData()라는, 이미 삭제된 로컬 전용 함수를 불렀는데 —
// 그 함수가 없어지면서 연동된 기사차량이 있는 계정의 미수금/월매출/세금계산서 집계가 전부
// ReferenceError로 깨지고 있었다. 실제로 재현해서 확인하고 고쳤다.)
function getDriverCarWorkData(car, settings) {
    return readWorkDataStorage(`workData_${car.number}`);
}

// link(연동 기사 할당 정보)가 주어지면 assignmentStart/End 밖의 날짜는 집계에서 제외한다.
// 소속기사 개인 조회가 아니라 "차주가 연동 기사의 기록을 집계"할 때만 쓰이는 함수다.
function getMonthlyDriverTotals(data, monthKey, link = null) {
    let grossAmount = 0;
    let insuranceAmount = 0;
    let count = 0;
    Object.entries(data || {}).forEach(([dateKey, record]) => {
        if (!dateKey.startsWith(monthKey) || !record || typeof record !== 'object') return;
        if (!isDateWithinAssignment(dateKey, link?.assignmentStart, link?.assignmentEnd)) return;
        const details = Array.isArray(record.callDetails) ? record.callDetails : [];
        details.forEach(detail => {
            const workDate = detail.workDate || dateKey;
            if (!workDate.startsWith(monthKey)) return;
            if (!isDateWithinAssignment(workDate, link?.assignmentStart, link?.assignmentEnd)) return;
            grossAmount += parseCurrencyValue(detail.fare);
            insuranceAmount += parseCurrencyValue(detail.insuranceFee);
            count += 1;
        });
        const fixedFare = parseCurrencyValue(record.fare || record.fixedFare || record.totalFare);
        if (fixedFare > 0) grossAmount += fixedFare;
        count += Number(record.fixedCount || record.count || 0);
    });
    return { grossAmount, insuranceAmount, count };
}

function calculateDriverVehicleCommission(car, grossAmount, count) {
    if (!car?.commEnabled || !car.commission) return 0;
    const tripCount = Number(count) || 0;
    // 건당(direct) 수수료는 실제 운행 건수만큼만 청구한다. Math.max(1, count)로 최소 1건을
    // 강제하면, 이번 달 운행이 0회인 기사차량도 건당 수수료 1건분이 그대로 청구돼 정산이
    // 마이너스로 나오는 결함이 있었다(실제로 확인됨).
    if (car.commType === 'direct') return tripCount > 0 ? parseCurrencyValue(car.commission) * tripCount : 0;
    return Math.floor(grossAmount * (parseFloat(car.commission) || 0) / 100);
}

// 월매출("월매출" 화면) 전용 순수 계산 함수. buildCalendar()의 고정노선/파렛트/콜상세
// 운송료 공식을 그대로 따르되, 여기서는 화면(DOM)을 전혀 건드리지 않고 값만 계산해서
// 반환한다 — buildCalendar() 자체는 그대로 두고 별도로 새로 만든 함수다.
// 세금계산서 집계(getTaxInvoiceSourceGroups)와 동일한 기준으로 메인 차량 + "회사 정산"/
// "고용 정산" 모드인 서브 차량만 합산한다(기사 직접 정산 차량은 그 매출이 회사 몫이
// 아니므로 제외).
// 차량의 "기사 월매출 조회" 스위치(shareRevenueWithOwner)가 꺼져 있으면 이 화면(월매출
// 집계)에서만 제외한다 — 실제 운행기록/서버 데이터는 전혀 건드리지 않고, 다른 화면(미수금,
// 세금계산서 등)에도 영향을 주지 않는 "이 화면 한정" 조회 권한이다.
function getMonthlyFareRevenue(monthKey) {
    const settings = getUserSettings();
    const cars = Array.isArray(settings.cars) ? settings.cars : [];

    const sources = [{ logId: 'main', label: '메인 차량', data: readWorkDataStorage('workData') }];
    cars.filter(car => car.type === 'sub' && isVehicleRevenueSharedWithOwner(car)).forEach(car => {
        const mode = getEffectiveDriverSettlementMode(car, settings);
        if (mode === 'company' || mode === 'employee') {
            sources.push({ logId: car.number, label: getShortCarNum(car.number), data: getDriverCarWorkData(car, settings) });
        }
    });

    let totalFare = 0;
    let tripCount = 0;
    const byVehicle = [];

    const fixedRouteClientForTotals = getFixedRouteClient(settings);
    sources.forEach(source => {
        const isMain = source.logId === 'main';
        const activeFixedOn = isMain ? settings.fixedOn : settings.subFixedOn;
        const activePalletOn = !!fixedRouteClientForTotals?.palletOn;
        const fixedUnitPrice = parseCurrencyValue(fixedRouteClientForTotals?.fixedUnitPrice);
        const palletUnitPrice = parseCurrencyValue(fixedRouteClientForTotals?.palletPrice);

        let vehicleFare = 0;
        let vehicleCount = 0;

        Object.entries(source.data || {}).forEach(([dateKey, record]) => {
            if (!dateKey.startsWith(monthKey) || !record || typeof record !== 'object' || record.isOff) return;

            if (record.fixedCount > 0) {
                vehicleCount += parseInt(record.fixedCount, 10) || 0;
                vehicleFare += (Number(record.fixedCount) || 0) * fixedUnitPrice;
            }
            if (record.palletCount > 0 && activeFixedOn && activePalletOn) {
                vehicleFare += (Number(record.palletCount) || 0) * palletUnitPrice;
            }

            (Array.isArray(record.callDetails) ? record.callDetails : []).forEach(detail => {
                // 운행 건수 집계 규칙은 buildCalendar()와 동일하게 맞춘다(공차는 제외, 혼짐은
                // 대표 건만 카운트).
                const type = detail?.distanceType || '';
                if (type === '공차') {
                    // 0회 처리
                } else if (type === '혼짐') {
                    if (detail.linkedLoadIndex === 'pending' || detail.linkedLoadIndex === '-1' || detail.linkedLoadIndex === undefined) {
                        vehicleCount += 1;
                    }
                } else {
                    vehicleCount += 1;
                }

                const gross = parseCurrencyValue(detail?.fare);
                vehicleFare += gross;
            });
        });

        totalFare += vehicleFare;
        tripCount += vehicleCount;
        byVehicle.push({ logId: source.logId, label: source.label, fare: vehicleFare, tripCount: vehicleCount });
    });

    return { totalFare, tripCount, byVehicle };
}
