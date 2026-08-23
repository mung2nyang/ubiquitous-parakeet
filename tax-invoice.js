// ============================================================================
// 세금계산서 관리 (script.js에서 분리 — §코드 쪼개기 1차, 테스트 저장소 한정)
// ============================================================================
// script.js가 먼저 로드된 뒤 이 파일이 로드된다(index.html 참고). 여기 있는 함수들은
// 전부 전역(window) 함수로 등록되며, script.js 쪽의 공용 헬퍼(getUserSettings,
// escapeDetailText, parseCurrencyValue, getFixedRouteClient, getVehicleSupplierIdentity,
// getEffectiveDriverSettlementMode, readWorkDataStorage, getDriverCarWorkData,
// getMonthlyDriverTotals, calculateDriverVehicleCommission, setUserSettings,
// showToastMessage, markFieldError, showConfirmModal, runSaveAction, hideAllPages,
// setUtilityReturnPage 등)와, tax-invoice-sync.js 쪽의 scheduleSupabaseTaxInvoiceSync를
// 그대로 전역으로 참조한다 — 파일만 나눴을 뿐 실행 방식(전역 스코프, 함수 호이스팅)은
// script.js에 있을 때와 완전히 동일하다.

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
