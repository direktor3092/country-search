import { debounce } from '../lib/debounce.js';
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className)
        node.className = className;
    if (text !== undefined)
        node.textContent = text;
    return node;
}
function renderFlag(country, className) {
    if (country.flagUrl === '') {
        const placeholder = el('span', className);
        placeholder.setAttribute('aria-hidden', 'true');
        return placeholder;
    }
    const img = el('img', className);
    img.src = country.flagUrl;
    img.alt = country.flagAlt;
    img.loading = 'lazy';
    return img;
}
function createCard(country, onOpen) {
    const item = el('li');
    const card = el('button', 'card');
    card.type = 'button';
    const head = el('div', 'card__head');
    head.append(renderFlag(country, 'card__flag'), el('span', 'card__name', country.name));
    const meta = el('dl', 'card__meta');
    const fields = [
        ['Capital', country.capital],
        ['Region', country.region],
        ['Population', country.populationFormatted],
    ];
    for (const [label, value] of fields) {
        meta.append(el('dt', undefined, label), el('dd', undefined, value));
    }
    card.append(head, meta);
    card.addEventListener('click', () => onOpen(country));
    item.append(card);
    return item;
}
function createLoading() {
    const box = el('div', 'state');
    box.setAttribute('aria-live', 'polite');
    box.append(el('div', 'state__title', 'Searching…'));
    return box;
}
function createIdle() {
    const box = el('div', 'state');
    box.append(el('p', 'state__message', 'Start typing a country name to begin.'));
    return box;
}
function createEmpty(query) {
    const box = el('div', 'state');
    box.append(el('div', 'state__title', 'Nothing found'), el('p', 'state__message', `No countries match "${query}". Try a different spelling.`));
    return box;
}
function createError(state, onRetry) {
    const box = el('div', 'state state--error');
    box.setAttribute('role', 'alert');
    box.append(el('div', 'state__title', 'Something went wrong'));
    const message = state.error.kind === 'abort' ? '' : state.error.message;
    box.append(el('p', 'state__message', message));
    const retry = el('button', 'state__retry', 'Try again');
    retry.type = 'button';
    retry.addEventListener('click', onRetry);
    box.append(retry);
    return box;
}
function createResults(state, onOpen) {
    const list = el('ul', 'results');
    for (const country of state.countries) {
        list.append(createCard(country, onOpen));
    }
    return list;
}
function renderDetail(country) {
    const overlay = el('div', 'detail');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `${country.name} details`);
    const panel = el('div', 'detail__panel');
    const close = el('button', 'detail__close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    const head = el('div', 'detail__head');
    head.append(el('h2', 'detail__title', country.name), renderFlag(country, 'detail__flag'));
    const grid = el('dl', 'detail__grid');
    const rows = [
        ['Capital', country.capital],
        ['Region', country.region],
        ['Population', country.populationFormatted],
        ['Area', `${country.area.toLocaleString('en-US')} km²`],
        ['Languages', country.languages.length > 0 ? country.languages.join(', ') : '—'],
        ['Currency', country.currency],
        ['Borders', country.borders.length > 0 ? country.borders.join(', ') : 'None'],
    ];
    for (const [label, value] of rows) {
        grid.append(el('dt', undefined, label), el('dd', undefined, value));
    }
    const description = el('p', 'detail__description', country.description);
    panel.append(close, head, grid, description);
    overlay.append(panel);
    document.body.style.overflow = 'hidden';
    function closeOverlay() {
        overlay.remove();
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKey);
    }
    function onKey(event) {
        if (event.key === 'Escape') {
            closeOverlay();
        }
    }
    close.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay)
            closeOverlay();
    });
    document.addEventListener('keydown', onKey);
    return overlay;
}
export function mountApp(root, controller, history) {
    const app = el('div', 'app');
    const header = el('header', 'app__header');
    const headerInner = el('div', 'app__header-inner');
    const title = el('h1', 'app__title');
    title.append(document.createTextNode('Country'), el('span', 'app__title-mark', 'Search'));
    headerInner.append(title);
    header.append(headerInner);
    const main = el('main', 'app__main');
    const search = el('div', 'search');
    const label = el('label', 'search__label', 'Search countries');
    label.htmlFor = 'search-input';
    const field = el('div', 'search__field');
    const input = el('input', 'search__input');
    input.id = 'search-input';
    input.type = 'search';
    input.placeholder = 'e.g. Spain, Japan, Brazil';
    input.autocomplete = 'off';
    input.spellcheck = false;
    const spinner = el('span', 'search__spinner');
    spinner.dataset['active'] = 'false';
    field.append(input, spinner);
    const historyBox = el('div', 'history');
    historyBox.setAttribute('aria-label', 'Recent searches');
    const renderHistory = () => {
        const entries = history.get();
        historyBox.replaceChildren();
        if (entries.length === 0)
            return;
        historyBox.append(el('span', 'history__label', 'Recent:'));
        for (const query of entries) {
            const chip = el('button', 'history__chip', query);
            chip.type = 'button';
            chip.addEventListener('click', () => {
                input.value = query;
                controller.setQuery(query);
            });
            historyBox.append(chip);
        }
    };
    const saveHistory = debounce((query) => {
        history.add(query);
        renderHistory();
    }, 1000);
    renderHistory();
    search.append(label, field, historyBox);
    const output = el('section');
    output.setAttribute('aria-live', 'polite');
    output.setAttribute('aria-label', 'Search results');
    main.append(search, output);
    const footer = el('footer', 'app__footer');
    footer.textContent = 'Data from countries.dev';
    app.append(header, main, footer);
    root.replaceChildren(app);
    input.addEventListener('input', () => {
        controller.setQuery(input.value);
    });
    const open = (country) => {
        document.body.append(renderDetail(country));
    };
    controller.subscribe((state) => {
        spinner.dataset['active'] = state.status === 'loading' ? 'true' : 'false';
        if (state.status === 'results' || state.status === 'empty') {
            saveHistory(state.query);
        }
        let view;
        switch (state.status) {
            case 'idle':
                view = createIdle();
                break;
            case 'loading':
                view = createLoading();
                break;
            case 'empty':
                view = createEmpty(state.query);
                break;
            case 'error':
                view = createError(state, () => controller.retry());
                break;
            case 'results':
                view = createResults(state, open);
                break;
        }
        output.replaceChildren(view);
    });
}
