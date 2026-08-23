// ============================================================================
// 공용 UI 위젯 — 앱 내부 드롭다운 / 날짜·시간 선택기 / 자동완성 / 모달 배경클릭 닫기
// (코드 쪼개기 3차: script.js에서 분리)
// ============================================================================
// 순수 DOM 유틸리티라 workData/settings 등 앱 데이터 모델과 무관하다. 다만 아래 함수들
// 안에서 getUserSettings()/currentTempCallDetails/workData/parseCurrencyValue(전부
// script.js가 정의)를 참조하므로, 반드시 script.js보다 먼저 로드해야 한다(호출 자체는
// DOMContentLoaded 이후에나 일어나므로, "먼저 로드"는 이 파일이 script.js보다 먼저
// 파싱되기만 하면 충분하다 — 아래 top-level 즉시실행 코드들이 의존하는 것도 DOM API뿐,
// script.js의 다른 함수가 아니다).
// ============================================================================

/* 단순 선택형 입력을 앱 내부 드롭다운으로 표시한다. 원본 select의 값과 이벤트는 유지한다. */
const APP_OVERLAY_GAP = 7;
const APP_OVERLAY_EDGE = 8;

function positionAnchoredOverlay(anchor, overlay) {
    if (!anchor || !overlay || overlay.hidden) return;

    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.visualViewport?.width || document.documentElement.clientWidth;
    const availableRight = viewportWidth - APP_OVERLAY_EDGE;
    const left = rect.right > availableRight
        ? Math.max(APP_OVERLAY_EDGE, availableRight - rect.width)
        : rect.left;

    overlay.style.left = `${left}px`;
    overlay.style.top = `${rect.bottom + APP_OVERLAY_GAP}px`;
    overlay.style.bottom = 'auto';
    overlay.style.width = `${rect.width}px`;
}

function refreshOpenAnchoredOverlays() {
    document.querySelectorAll('.app-dropdown.open').forEach(wrapper => {
        positionAnchoredOverlay(wrapper.querySelector('.app-dropdown-trigger'), wrapper._dropdownMenu);
    });
    document.querySelectorAll('.app-temporal.open').forEach(wrapper => wrapper._temporalPosition?.());
    document.querySelectorAll('input[data-app-autocomplete][aria-expanded="true"]').forEach(input => input._autocompletePosition?.());
}

function initAppDropdowns(root = document) {
    root.querySelectorAll('select[data-app-dropdown]:not([data-dropdown-ready])').forEach(select => {
        select.dataset.dropdownReady = 'true';

        const wrapper = document.createElement('span');
        wrapper.className = 'app-dropdown';
        if (select.classList.contains('date-select')) wrapper.classList.add('app-date-dropdown');
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'app-dropdown-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.innerHTML = '<span class="app-dropdown-value"></span><span class="app-dropdown-chevron" aria-hidden="true"></span>';

        const menu = document.createElement('div');
        menu.className = 'app-dropdown-menu';
        menu.setAttribute('role', 'listbox');
        menu.hidden = true;
        wrapper.append(trigger);
        document.body.appendChild(menu);
        wrapper._dropdownMenu = menu;

        const close = () => {
            menu.hidden = true;
            wrapper.classList.remove('open', 'open-up');
            trigger.setAttribute('aria-expanded', 'false');
        };

        const positionMenu = () => {
            wrapper.classList.remove('open-up');
            positionAnchoredOverlay(trigger, menu);
            menu.style.maxHeight = '124px';
        };

        const sync = () => {
            const selected = select.options[select.selectedIndex];
            trigger.querySelector('.app-dropdown-value').textContent = selected ? selected.textContent : '';
            trigger.disabled = select.disabled;
            trigger.setAttribute('aria-label', select.title || selected?.textContent || '선택');
            menu.replaceChildren();

            Array.from(select.options).forEach((option, index) => {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'app-dropdown-option';
                item.setAttribute('role', 'option');
                item.setAttribute('aria-selected', String(index === select.selectedIndex));
                item.dataset.value = option.value;
                item.textContent = option.textContent;
                item.disabled = option.disabled;
                item.addEventListener('click', () => {
                    select.value = option.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    sync();
                    close();
                    trigger.focus();
                });
                menu.appendChild(item);
            });
        };
        wrapper._dropdownSync = sync;

        trigger.addEventListener('click', () => {
            const willOpen = menu.hidden;
            document.querySelectorAll('.app-dropdown.open').forEach(openDropdown => {
                if (openDropdown !== wrapper) openDropdown._dropdownMenu.hidden = true;
                openDropdown.classList.remove('open', 'open-up');
                openDropdown.querySelector('.app-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
            });
            if (!willOpen) {
                close();
                return;
            }
            sync();
            menu.hidden = false;
            wrapper.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
            positionMenu();
            menu.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
        });

        trigger.addEventListener('keydown', event => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'].includes(event.key)) return;
            event.preventDefault();
            if (event.key === 'Escape') {
                close();
                return;
            }
            if (menu.hidden) trigger.click();
            const enabled = Array.from(menu.querySelectorAll('.app-dropdown-option:not(:disabled)'));
            const current = enabled.indexOf(document.activeElement);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 :
                event.key === 'ArrowUp' ? Math.max(0, current < 0 ? enabled.length - 1 : current - 1) :
                Math.min(enabled.length - 1, current + 1);
            enabled[next]?.focus();
        });

        select.addEventListener('change', sync);
        new MutationObserver(sync).observe(select, { childList: true, subtree: true, attributes: true });

        const containingLabel = select.closest('label') ||
            (select.id ? document.querySelector(`label[for="${CSS.escape(select.id)}"], label[data-dropdown-label="${CSS.escape(select.id)}"]`) : null);
        if (containingLabel) {
            containingLabel.addEventListener('click', event => {
                if (wrapper.contains(event.target)) return;
                event.preventDefault();
                event.stopPropagation();
                trigger.focus();
                trigger.click();
            });
        }
        sync();
    });
}

function initAppTemporalInputs(root = document) {
    root.querySelectorAll('input[type="date"]:not([data-temporal-ready]), input[type="time"]:not([data-temporal-ready])').forEach(input => {
        input.dataset.temporalReady = 'true';
        const type = input.type;
        const wrapper = document.createElement('span');
        wrapper.className = `app-temporal app-temporal-${type}`;
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'app-temporal-trigger';
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.innerHTML = '<span class="app-temporal-value"></span><span class="app-temporal-icon" aria-hidden="true"></span>';

        const menu = document.createElement('div');
        menu.className = 'app-temporal-menu';
        menu.hidden = true;
        wrapper.append(trigger);
        document.body.appendChild(menu);
        wrapper._temporalMenu = menu;

        const pad = value => String(value).padStart(2, '0');
        const valueText = () => {
            if (!input.value) return type === 'date' ? '날짜 선택' : '시간 선택';
            if (type === 'time') return input.value;
            const [year, month, day] = input.value.split('-');
            return `${year}.${month}.${day}`;
        };
        const sync = () => {
            trigger.querySelector('.app-temporal-value').textContent = valueText();
            trigger.disabled = input.disabled;
        };
        wrapper._temporalSync = sync;

        const close = () => {
            menu.hidden = true;
            wrapper.classList.remove('open', 'open-up');
            trigger.setAttribute('aria-expanded', 'false');
        };
        const position = () => {
            wrapper.classList.remove('open-up');
            positionAnchoredOverlay(trigger, menu);
            menu.style.height = '112px';
            menu.style.maxHeight = '';
        };
        wrapper._temporalPosition = position;
        const selectedDateParts = () => {
            const today = new Date();
            const parts = input.value ? input.value.split('-').map(Number) : [today.getFullYear(), today.getMonth() + 1, today.getDate()];
            return { year: parts[0], month: parts[1], day: parts[2] };
        };
        const selectedTimeParts = () => {
            const now = new Date();
            const parts = input.value ? input.value.split(':').map(Number) : [now.getHours(), now.getMinutes()];
            return { hour: parts[0], minute: parts[1] };
        };
        const optionButton = (text, selected, onClick) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'app-temporal-option';
            button.textContent = text;
            button.setAttribute('aria-selected', String(selected));
            button.addEventListener('click', event => {
                event.stopPropagation();
                onClick(event);
            });
            return button;
        };
        const renderDate = state => {
            menu.replaceChildren();
            const columns = document.createElement('div');
            columns.className = 'app-temporal-columns date-columns';
            const yearColumn = document.createElement('div');
            const monthColumn = document.createElement('div');
            const dayColumn = document.createElement('div');
            [yearColumn, monthColumn, dayColumn].forEach(column => column.className = 'app-temporal-column');
            const minYear = input.min ? Number(input.min.slice(0, 4)) : state.year - 8;
            const maxYear = input.max ? Number(input.max.slice(0, 4)) : state.year + 8;
            for (let year = minYear; year <= maxYear; year++) {
                yearColumn.appendChild(optionButton(`${year}년`, year === state.year, () => {
                    state.year = year;
                    state.day = Math.min(state.day, new Date(state.year, state.month, 0).getDate());
                    renderDate(state);
                }));
            }
            for (let month = 1; month <= 12; month++) {
                monthColumn.appendChild(optionButton(`${month}월`, month === state.month, () => {
                    state.month = month;
                    state.day = Math.min(state.day, new Date(state.year, state.month, 0).getDate());
                    renderDate(state);
                }));
            }
            const days = new Date(state.year, state.month, 0).getDate();
            for (let day = 1; day <= days; day++) {
                dayColumn.appendChild(optionButton(`${day}일`, day === state.day, () => {
                    const nextValue = `${state.year}-${pad(state.month)}-${pad(day)}`;
                    input.value = nextValue;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    if (input.value !== nextValue) input.value = nextValue;
                    sync();
                    close();
                    trigger.focus();
                    setTimeout(() => {
                        input.value = nextValue;
                        sync();
                    }, 0);
                }));
            }
            columns.append(yearColumn, monthColumn, dayColumn);
            menu.appendChild(columns);
            menu.querySelectorAll('[aria-selected="true"]').forEach(option => option.scrollIntoView({ block: 'center' }));
        };
        const renderTime = state => {
            menu.replaceChildren();
            const columns = document.createElement('div');
            columns.className = 'app-temporal-columns time-columns';
            const hourColumn = document.createElement('div');
            const minuteColumn = document.createElement('div');
            hourColumn.className = minuteColumn.className = 'app-temporal-column';
            for (let hour = 0; hour < 24; hour++) {
                hourColumn.appendChild(optionButton(`${pad(hour)}시`, hour === state.hour, () => {
                    const hasSavedTime = !!input.value;
                    state.hour = hour;
                    if (!hasSavedTime) state.minute = 0;
                    const nextValue = `${pad(state.hour)}:${pad(state.minute)}`;
                    input.value = nextValue;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    if (input.value !== nextValue) input.value = nextValue;
                    sync();
                    renderTime(state);
                }));
            }
            for (let minute = 0; minute < 60; minute++) {
                minuteColumn.appendChild(optionButton(`${pad(minute)}분`, minute === state.minute, () => {
                    const nextValue = `${pad(state.hour)}:${pad(minute)}`;
                    input.value = nextValue;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    if (input.value !== nextValue) input.value = nextValue;
                    sync();
                    close();
                    trigger.focus();
                    setTimeout(() => {
                        input.value = nextValue;
                        sync();
                    }, 0);
                }));
            }
            columns.append(hourColumn, minuteColumn);
            menu.appendChild(columns);
            menu.querySelectorAll('[aria-selected="true"]').forEach(option => option.scrollIntoView({ block: 'center' }));
        };

        trigger.addEventListener('click', () => {
            const willOpen = menu.hidden;
            document.querySelectorAll('.app-temporal.open').forEach(openPicker => {
                openPicker._temporalMenu.hidden = true;
                openPicker.classList.remove('open', 'open-up');
                openPicker.querySelector('.app-temporal-trigger')?.setAttribute('aria-expanded', 'false');
            });
            if (!willOpen) {
                close();
                return;
            }
            sync();
            menu.hidden = false;
            wrapper.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
            type === 'date' ? renderDate(selectedDateParts()) : renderTime(selectedTimeParts());
            position();
        });
        input.addEventListener('input', sync);
        input.addEventListener('change', sync);
        const label = input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`) : null;
        if (label) {
            label.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                trigger.focus();
                trigger.click();
            });
        }
        sync();
    });
}

function getAppAutocompleteValues(type) {
    const values = [];
    const add = value => {
        const normalized = String(value || '').trim();
        if (normalized && !values.includes(normalized)) values.push(normalized);
    };
    const field = { load: 'loadLoc', unload: 'unloadLoc', fare: 'fare', client: 'client' }[type];
    if (type === 'client') {
        // scopedToVehicleNumber 거래처(특정 직원기사 전용, driver-link.js가 관리)는 차주 본인의
        // 운행 입력 자동완성에는 안 나와야 한다 — "차주 거래처는 차주 것" 원칙.
        (getUserSettings().clients || []).filter(client => client.companyName && !client.scopedToVehicleNumber).forEach(client => add(client.companyName));
    }
    [...currentTempCallDetails].reverse().forEach(item => add(item?.[field]));
    Object.keys(workData).sort().reverse().forEach(dateKey => {
        [...(workData[dateKey]?.callDetails || [])].reverse().forEach(item => add(item?.[field]));
    });
    return type === 'fare'
        ? values.map(value => parseCurrencyValue(value).toLocaleString()).filter(value => value !== '0')
        : values;
}

function initAppAutocompletes(root = document) {
    root.querySelectorAll('input[data-app-autocomplete]:not([data-autocomplete-ready])').forEach(input => {
        input.dataset.autocompleteReady = 'true';
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-expanded', 'false');

        const menu = document.createElement('div');
        menu.className = 'app-autocomplete-menu';
        menu.setAttribute('role', 'listbox');
        menu.hidden = true;
        document.body.appendChild(menu);

        const close = () => {
            menu.hidden = true;
            input.setAttribute('aria-expanded', 'false');
        };
        const position = () => {
            const rect = input.getBoundingClientRect();
            const edge = 8;
            const gap = 5;
            const bottomNav = document.querySelector('.bottom-nav-bar');
            const bottomNavRect = bottomNav?.getBoundingClientRect();
            const viewportBottom = bottomNavRect && bottomNavRect.height > 0
                ? Math.min(window.innerHeight, bottomNavRect.top)
                : window.innerHeight;
            const below = viewportBottom - rect.bottom - gap - edge;
            const above = rect.top - gap - edge;
            const openUp = below < 124 && above > below;
            menu.style.left = `${Math.max(edge, Math.min(rect.left, window.innerWidth - rect.width - edge))}px`;
            menu.style.width = `${Math.min(rect.width, window.innerWidth - edge * 2)}px`;
            menu.style.top = openUp ? 'auto' : `${rect.bottom + gap}px`;
            menu.style.bottom = openUp ? `${window.innerHeight - rect.top + gap}px` : 'auto';
        };
        const render = () => {
            const query = input.value.trim().toLocaleLowerCase();
            const values = getAppAutocompleteValues(input.dataset.appAutocomplete)
                .filter(value => !query || value.toLocaleLowerCase().includes(query));
            menu.replaceChildren();
            values.forEach(value => {
                const option = document.createElement('button');
                option.type = 'button';
                option.className = 'app-autocomplete-option';
                option.setAttribute('role', 'option');
                option.setAttribute('aria-selected', String(value === input.value.trim()));
                option.textContent = value;
                option.addEventListener('mousedown', event => event.preventDefault());
                option.addEventListener('click', () => {
                    input.value = value;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    close();
                    input.focus();
                });
                menu.appendChild(option);
            });
            menu.hidden = values.length === 0;
            input.setAttribute('aria-expanded', String(values.length > 0));
            if (values.length) position();
        };

        input.addEventListener('focus', render);
        input.addEventListener('click', render);
        input.addEventListener('input', render);
        input.addEventListener('keydown', event => {
            if (event.key === 'Escape') close();
            if (event.key === 'ArrowDown' && !menu.hidden) {
                event.preventDefault();
                menu.querySelector('.app-autocomplete-option')?.focus();
            }
        });
        input._autocompleteMenu = menu;
        input._autocompleteClose = close;
        input._autocompletePosition = position;
    });
}

document.addEventListener('click', event => {
    document.querySelectorAll('.app-dropdown.open').forEach(wrapper => {
        if (!wrapper.contains(event.target) && !wrapper._dropdownMenu?.contains(event.target)) {
            wrapper._dropdownMenu.hidden = true;
            wrapper.classList.remove('open', 'open-up');
            wrapper.querySelector('.app-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
        }
    });
    document.querySelectorAll('.app-temporal.open').forEach(wrapper => {
        if (!wrapper.contains(event.target) && !wrapper._temporalMenu?.contains(event.target)) {
            wrapper._temporalMenu.hidden = true;
            wrapper.classList.remove('open', 'open-up');
            wrapper.querySelector('.app-temporal-trigger')?.setAttribute('aria-expanded', 'false');
        }
    });
    document.querySelectorAll('input[data-app-autocomplete][aria-expanded="true"]').forEach(input => {
        if (event.target !== input && !input._autocompleteMenu?.contains(event.target)) input._autocompleteClose?.();
    });
});

window.addEventListener('resize', refreshOpenAnchoredOverlays);
window.addEventListener('scroll', event => {
    if (event.target instanceof Element && event.target.closest('.app-dropdown-menu, .app-temporal-menu')) return;
    refreshOpenAnchoredOverlays();
}, true);
window.visualViewport?.addEventListener('resize', refreshOpenAnchoredOverlays);
window.visualViewport?.addEventListener('scroll', refreshOpenAnchoredOverlays);

function initBackdropDismissModals() {
    const dismissHandlers = {
        callDetailModal: closeCallDetailModal,
        detailReportSelectModal: closeDetailReportModal,
        maintFuelSelectModal: closeMaintFuelSelectModal,
        fuelDetailModal: closeFuelDetailModal,
        maintRecordModal: closeMaintRecordModal,
        carModal: closeCarModal,
        reportCarSelectModal: closeReportCarSelectModal,
        reportShareModal: closeReportShareModal,
        clientModal: cancelClientModal,
        confirmModal: closeConfirmModal
    };

    Object.entries(dismissHandlers).forEach(([modalId, dismiss]) => {
        const modal = document.getElementById(modalId);
        if (!modal || modal.dataset.backdropDismissReady === 'true') return;

        modal.dataset.backdropDismissReady = 'true';
        modal.addEventListener('click', event => {
            if (event.target !== modal || modal.classList.contains('inline-expanded')) return;
            dismiss();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initAppDropdowns();
    initAppTemporalInputs();
    initAppAutocompletes();
    initBackdropDismissModals();
    setupMobileBackIntegration();
    new MutationObserver(() => {
        document.querySelectorAll('.app-temporal').forEach(wrapper => wrapper._temporalSync?.());
    }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
});

// 화면 디자인을 바꾸지 않고 폼 요소의 접근성 이름을 보완한다.
function enhanceAccessibility() {
    document.querySelectorAll('img:not([alt])').forEach(image => {
        image.alt = '';
    });

    document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(field => {
        if (field.labels && field.labels.length > 0) return;
        if (field.hasAttribute('aria-label') || field.hasAttribute('aria-labelledby')) return;

        const group = field.closest('.form-group, .setting-item, .call-inline-field, .price-setting');
        const nearbyLabel = group ? group.querySelector('label') : null;
        const accessibleName = (nearbyLabel && nearbyLabel.textContent.trim())
            || field.getAttribute('placeholder')
            || field.getAttribute('title')
            || '입력 항목';

        field.setAttribute('aria-label', accessibleName);
    });
}

enhanceAccessibility();
new MutationObserver(enhanceAccessibility).observe(document.body, {
    childList: true,
    subtree: true
});
