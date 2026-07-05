// ═══════════════════════════════════════════════════════════════
// РуГрейн — ФГИС Помощник | Telegram Mini App
// ═══════════════════════════════════════════════════════════════

const tg = window.Telegram?.WebApp;

// ── State ─────────────────────────────────────────────────────
let currentUser = null;
let currentOrg = null;
let organizations = JSON.parse(localStorage.getItem('rugrein_orgs') || '[]');
let tasks = [];
let documents = JSON.parse(localStorage.getItem('rugrein_docs') || '[]');
let currentTab = 'tasks';

// ── Data: FGIS Tasks & Route ────────────────────────────────
const ROUTE_DATA = [
  {
    stage: 'Подготовка',
    icon: '📋',
    items: [
      {
        id: 'reg_1',
        title: 'Регистрация в ФГИС "Зерно"',
        desc: 'Создание учетной записи юридического лица или ИП в ФГИС "Зерно". Необходимы: ИНН, ОГРН, КПП, адрес, контактные данные.',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: '2025-07-15',
        docs: ['Копия ИНН/ОГРН', 'Устав (для юр.лиц)', 'Доверенность представителя'],
        links: [
          { label: 'ФГИС Зерно', url: 'https://fgis-zerno.ru' },
          { label: 'Инструкция по регистрации', url: 'https://fgis-zerno.ru/help' }
        ],
        conditions: [
          { type: 'branch', text: 'Если у вас уже есть аккаунт в ФГИС — пропустите этот шаг' },
          { type: 'validation', text: 'Проверьте корректность ИНН и ОГРН перед отправкой' }
        ]
      },
      {
        id: 'reg_2',
        title: 'Регистрация в ФГИС "Ветис"',
        desc: 'Оформление доступа к системе ветеринарного учета для оформления ветсертификатов.',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: '2025-07-20',
        docs: ['Ветеринарное свидетельство', 'Договор с ветврачом'],
        links: [
          { label: 'ФГИС Ветис', url: 'https://vetis.ru' }
        ],
        conditions: [
          { type: 'info', text: 'Требуется для межрегиональных поставок зерна' }
        ]
      },
      {
        id: 'reg_3',
        title: 'Подключение к ЭДО (электронный документооборот)',
        desc: 'Настройка электронного документооборота для обмена с ФГИС и контрагентами.',
        badge: 'Рекомендуется',
        badgeClass: 'blue',
        priority: 'normal',
        deadline: '2025-07-30',
        docs: ['Заявка на подключение ЭДО', 'Договор с оператором ЭДО'],
        links: [
          { label: 'Список операторов ЭДО', url: 'https://edi-list.ru' }
        ]
      }
    ]
  },
  {
    stage: 'Учет и контроль',
    icon: '📊',
    items: [
      {
        id: 'control_1',
        title: 'Внесение данных о посевных площадях',
        desc: 'Фиксация информации о засеянных площадях в ФГИС "Зерно" для последующего контроля урожая.',
        badge: 'Сезонное',
        badgeClass: 'yellow',
        priority: 'warning',
        deadline: '2025-08-01',
        docs: ['Кадастровые выписки', 'Акты обследования полей'],
        links: [
          { label: 'Форма внесения площадей', url: 'https://fgis-zerno.ru/areas' }
        ],
        conditions: [
          { type: 'dependency', text: 'Требуется завершенная регистрация в ФГИС "Зерно"' }
        ]
      },
      {
        id: 'control_2',
        title: 'Оформление элеваторных свидетельств',
        desc: 'Регистрация зерна на элеваторах с получением электронных свидетельств о хранении.',
        badge: 'По мере поступления',
        badgeClass: 'purple',
        priority: 'normal',
        deadline: '2025-09-15',
        docs: ['Акт приемки зерна', 'Протокол лабораторного анализа', 'Транспортная накладная'],
        links: [
          { label: 'Оформление свидетельств', url: 'https://fgis-zerno.ru/certificates' }
        ]
      },
      {
        id: 'control_3',
        title: 'Подача декларации о соответствии зерна',
        desc: 'Декларирование качества зерна перед реализацией.',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: '2025-09-30',
        docs: ['Протоколы испытаний', 'Сертификаты соответствия'],
        links: [
          { label: 'Форма декларации', url: 'https://fgis-zerno.ru/declaration' }
        ],
        conditions: [
          { type: 'validation', text: 'Декларация действительна 1 год с момента подписания' }
        ]
      }
    ]
  },
  {
    stage: 'Субсидии и поддержка',
    icon: '💰',
    items: [
      {
        id: 'sub_1',
        title: 'Заявка на субсидию за хранение зерна',
        desc: 'Компенсация затрат на хранение зерна на элеваторах. Ставка: до 500 руб/тонна.',
        badge: 'Субсидия',
        badgeClass: 'brown',
        priority: 'warning',
        deadline: '2025-10-15',
        docs: [
          'Заявление на субсидию',
          'Копия договора хранения',
          'Элеваторные свидетельства',
          'Справка об объемах хранения',
          'Выписка из ЕГРЮЛ/ЕГРИП'
        ],
        links: [
          { label: 'Портал госуслуг — субсидии АПК', url: 'https://gosuslugi.ru/subsidies' },
          { label: 'Минсельхоз РФ', url: 'https://mcx.gov.ru' }
        ],
        conditions: [
          { type: 'branch', text: 'Субсидия доступна только при наличии элеваторных свидетельств в ФГИС' },
          { type: 'info', text: 'Максимальный объем: 50 000 тонн на одного заявителя' }
        ]
      },
      {
        id: 'sub_2',
        title: 'Компенсация транспортных расходов',
        desc: 'Возмещение части затрат на перевозку зерна железнодорожным или водным транспортом.',
        badge: 'Субсидия',
        badgeClass: 'brown',
        priority: 'normal',
        deadline: '2025-11-01',
        docs: ['Транспортные накладные', 'Акты выполненных работ', 'Счета-фактуры'],
        links: [
          { label: 'Постановление о компенсации', url: 'https://mcx.gov.ru/docs' }
        ]
      },
      {
        id: 'sub_3',
        title: 'Субсидия на приобретение сельхозтехники',
        desc: 'Возмещение до 25% стоимости техники из реестра Минсельхоза.',
        badge: 'Субсидия',
        badgeClass: 'brown',
        priority: 'normal',
        deadline: '2025-12-01',
        docs: [
          'Договор купли-продажи техники',
          'Акт приема-передачи',
          'Платежные документы',
          'Сертификат соответствия техники'
        ],
        links: [
          { label: 'Реестр техники Минсельхоза', url: 'https://mcx.gov.ru/tech' }
        ],
        conditions: [
          { type: 'dependency', text: 'Техника должна быть включена в реестр до даты покупки' }
        ]
      }
    ]
  },
  {
    stage: 'Отчетность',
    icon: '📑',
    items: [
      {
        id: 'report_1',
        title: 'Ежемесячный отчет в ФГИС "Зерно"',
        desc: 'Формирование и подача ежемесячного отчета об объемах хранения и движения зерна.',
        badge: 'Ежемесячно',
        badgeClass: 'blue',
        priority: 'warning',
        deadline: 'Ежемесячно, до 5 числа',
        docs: ['Отчет о движении зерна', 'Сводная ведомость'],
        links: [
          { label: 'Форма отчета', url: 'https://fgis-zerno.ru/reports' }
        ]
      },
      {
        id: 'report_2',
        title: 'Годовая отчетность в Росстат',
        desc: 'Подача формы 29-СХ "Сведения о запасах зерна и продуктов его переработки".',
        badge: 'Ежегодно',
        badgeClass: 'blue',
        priority: 'normal',
        deadline: '2026-01-15',
        docs: ['Форма 29-СХ', 'Пояснительная записка'],
        links: [
          { label: 'Росстат — формы отчетности', url: 'https://rosstat.gov.ru/forms' }
        ]
      }
    ]
  }
];

// ── AI Knowledge Base ─────────────────────────────────────────
const AI_KNOWLEDGE = {
  'фгис зерно': `ФГИС «Зерно» — федеральная государственная информационная система учета зерна и продуктов его переработки.

**Для регистрации нужно:**
1. Перейти на fgis-zerno.ru
2. Выбрать «Регистрация» → «Юридическое лицо / ИП»
3. Заполнить: ИНН, ОГРН, КПП, юридический адрес, контактные данные
4. Подтвердить email и телефон
5. Дождаться модерации (1–3 рабочих дня)

**После регистрации вы сможете:**
• Вносить данные о посевных площадях
• Оформлять элеваторные свидетельства
• Подавать декларации о соответствии
• Формировать отчетность`,

  'документы на субсидию': `**Документы для получения субсидии за хранение зерна:**

1. Заявление на предоставление субсидии
2. Копия договора хранения с элеватором
3. Элеваторные свидетельства из ФГИС «Зерно»
4. Справка об объемах хранения (от элеватора)
5. Выписка из ЕГРЮЛ / ЕГРИП (не старше 30 дней)
6. Копия паспорта заявителя (для ИП)
7. Реквизиты банковского счета

**Условия:**
• Субсидия до 500 руб/тонна
• Максимум 50 000 тонн на заявителя
• Зерно должно быть зарегистрировано в ФГИС
• Срок подачи: обычно до 15 октября`,

  'элеваторные свидетельства': `**Элеваторное свидетельство** — электронный документ в ФГИС «Зерно», подтверждающий факт приемки и хранения зерна на элеваторе.

**Как оформить:**
1. Зарегистрируйтесь в ФГИС «Зерно»
2. Заключите договор с элеватором (если еще нет)
3. При приемке зерна элеватор создаст свидетельство
4. Проверьте данные в личном кабинете

**Свидетельство содержит:**
• Номер и дату
• Наименование и ИНН владельца
• Наименование элеватора
• Культура, класс, масса
• Показатели качества (влажность, сорная примесь и др.)`,

  'декларация соответствия': `**Декларация о соответствии зерна** — обязательный документ перед реализацией зерна.

**Порядок оформления:**
1. Проведите лабораторный анализ зерна
2. Получите протоколы испытаний
3. Войдите в ФГИС «Зерно» → «Декларирование»
4. Заполните форму с данными анализа
5. Подпишите ЭЦП

**Срок действия:** 1 год с момента подписания.

**Штраф за отсутствие:** до 50 000 руб для юр.лиц.`,

  'субсидия техника': `**Субсидия на приобретение сельхозтехники:**

• Размер: до 25% от стоимости
• Техника должна быть в реестре Минсельхоза
• Минимальный срок эксплуатации: 3 года
• Необходимы: договор, акт приема-передачи, платежные документы

**Подача:** через портал Госуслуг или лично в Минсельхоз региона.`
};

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTelegram();
  renderTasks();
  renderRoute();
  renderDocs();
  updateBadge();
});

function initTelegram() {
  if (tg) {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();

    // Apply Telegram theme
    applyTelegramTheme();

    // Auto-login if inside Telegram
    const user = tg.initDataUnsafe?.user;
    if (user) {
      currentUser = {
        id: user.id,
        firstName: user.first_name || 'Пользователь',
        lastName: user.last_name || '',
        username: user.username || '',
        photoUrl: user.photo_url || ''
      };
      showApp();
      updateProfile();
      showToast(`👋 Добро пожаловать, ${currentUser.firstName}!`);
    }
  }
}

function applyTelegramTheme() {
  if (!tg) return;
  const theme = tg.themeParams;
  if (theme.bg_color) document.documentElement.style.setProperty('--bg-white', theme.bg_color);
  if (theme.text_color) document.documentElement.style.setProperty('--text', theme.text_color);
  if (theme.secondary_bg_color) document.documentElement.style.setProperty('--bg', theme.secondary_bg_color);
  if (theme.hint_color) document.documentElement.style.setProperty('--text-muted', theme.hint_color);
  if (theme.link_color) document.documentElement.style.setProperty('--green-dark', theme.link_color);
  if (theme.button_color) document.documentElement.style.setProperty('--green', theme.button_color);
  if (theme.button_text_color) document.documentElement.style.setProperty('--green-bg', theme.button_text_color);

  // Set header color
  tg.setHeaderColor(tg.colorScheme === 'dark' ? 'bg_color' : '#ffffff');
}

// ── Login ───────────────────────────────────────────────────────
function handleLogin() {
  if (tg) {
    tg.openTelegramLink('https://t.me/rugrein_bot?start=auth');
  } else {
    showToast('⚠️ Откройте приложение через Telegram');
  }
}

function enterAsGuest() {
  currentUser = { id: 'guest', firstName: 'Гость', lastName: '', username: '', photoUrl: '' };
  showApp();
  updateProfile();
  showToast('👋 Вы вошли как гость. Некоторые функции ограничены.');
}

function showApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.add('visible');
}

function updateProfile() {
  const name = currentUser.firstName + (currentUser.lastName ? ' ' + currentUser.lastName : '');
  document.getElementById('profileName').textContent = name;
  document.getElementById('profileAvatar').textContent = getInitials(name);

  if (currentOrg) {
    document.getElementById('profileOrg').textContent = currentOrg.name;
    document.getElementById('orgNameShort').textContent = currentOrg.name.length > 18 ? currentOrg.name.slice(0, 18) + '…' : currentOrg.name;
  } else {
    document.getElementById('profileOrg').textContent = 'Выберите организацию';
    document.getElementById('orgNameShort').textContent = 'Организация';
  }
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ── Tabs ────────────────────────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;

  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navItems = document.querySelectorAll('.nav-item');
  const tabMap = { tasks: 0, route: 1, chat: 2, docs: 3 };
  if (navItems[tabMap[tab]]) navItems[tabMap[tab]].classList.add('active');

  if (tab === 'route') renderRoute();
  if (tab === 'docs') renderDocs();
}

// ── Tasks ───────────────────────────────────────────────────────
function renderTasks() {
  const list = document.getElementById('tasksList');
  const allItems = [];
  ROUTE_DATA.forEach(stage => {
    stage.items.forEach(item => {
      allItems.push({ ...item, stage: stage.stage });
    });
  });

  // Sort: urgent first, then warning, then normal
  const priorityOrder = { urgent: 0, warning: 1, normal: 2 };
  allItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  tasks = allItems;

  if (allItems.length === 0) {
    list.innerHTML = emptyState('📋', 'Нет задач', 'Все задачи выполнены!');
    return;
  }

  list.innerHTML = allItems.map(item => `
    <div class="task-card ${item.priority}" onclick="openDetail('${item.id}')">
      <div class="task-top">
        <div class="task-title">${item.title}</div>
        <div class="task-badge ${item.badgeClass}">${item.badge}</div>
      </div>
      <div class="task-desc">${item.desc}</div>
      <div class="task-meta">
        <div class="task-meta-item ${item.priority}">📅 ${item.deadline}</div>
        <div class="task-meta-item">📁 ${item.docs.length} док.</div>
        <div class="task-meta-item">${item.stage}</div>
      </div>
    </div>
  `).join('');

  updateBadge();
}

function updateBadge() {
  const urgentCount = tasks.filter(t => t.priority === 'urgent').length;
  const badge = document.getElementById('tasksBadge');
  if (urgentCount > 0) {
    badge.textContent = urgentCount;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// ── Route ─────────────────────────────────────────────────────
function renderRoute() {
  const list = document.getElementById('routeList');
  let total = 0, done = 0;

  list.innerHTML = ROUTE_DATA.map((stage, si) => {
    total += stage.items.length;
    const stageItems = stage.items;
    const stageDone = stageItems.filter((_, i) => localStorage.getItem('done_' + stageItems[i].id) === 'true').length;
    done += stageDone;

    return `
      <div class="route-stage">
        <div class="route-stage-header">
          <div class="route-stage-icon">${stage.icon}</div>
          <div class="route-stage-title">${stage.stage}</div>
          <div class="route-stage-progress">${stageDone}/${stageItems.length}</div>
        </div>
        <div class="route-timeline">
          ${stageItems.map((item, ii) => {
            const isDone = localStorage.getItem('done_' + item.id) === 'true';
            const prevDone = ii === 0 || localStorage.getItem('done_' + stageItems[ii-1].id) === 'true';
            const isActive = !isDone && prevDone;
            return `
              <div class="route-item">
                <div class="route-dot ${isDone ? 'done' : isActive ? 'active' : ''}"></div>
                <div class="route-card" onclick="openDetail('${item.id}')">
                  <div class="route-card-title">${item.title}</div>
                  <div class="route-card-desc">${item.desc.slice(0, 80)}${item.desc.length > 80 ? '…' : ''}</div>
                  <div class="route-card-meta">
                    <span class="route-card-tag" style="background:${getPriorityColor(item.priority)}20;color:${getPriorityColor(item.priority)}">${item.badge}</span>
                    <span class="route-card-tag" style="background:var(--bg-hover);color:var(--text-muted)">📅 ${item.deadline}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('routeCounter').textContent = `${done}/${total}`;
}

function getPriorityColor(p) {
  return p === 'urgent' ? '#e53935' : p === 'warning' ? '#f57c00' : '#7cb342';
}

// ── Detail Panel ──────────────────────────────────────────────
function openDetail(itemId) {
  let item = null;
  ROUTE_DATA.forEach(stage => {
    const found = stage.items.find(i => i.id === itemId);
    if (found) item = { ...found, stage: stage.stage };
  });
  if (!item) return;

  const isDone = localStorage.getItem('done_' + item.id) === 'true';

  document.getElementById('detailTitle').textContent = item.title;

  let html = '';

  html += `<div class="detail-section">
    <div class="detail-section-title">Описание</div>
    <div class="detail-desc">${item.desc}</div>
  </div>`;

  if (item.conditions && item.conditions.length) {
    html += `<div class="detail-section">
      <div class="detail-section-title">Условия</div>
      ${item.conditions.map(c => `<div class="detail-condition ${c.type}">${c.text}</div>`).join('')}
    </div>`;
  }

  html += `<div class="detail-section">
    <div class="detail-section-title">Необходимые документы (${item.docs.length})</div>
    <div class="detail-docs">
      ${item.docs.map(d => `<div class="detail-doc-item">📄 ${d}</div>`).join('')}
    </div>
  </div>`;

  if (item.links && item.links.length) {
    html += `<div class="detail-section">
      <div class="detail-section-title">Полезные ссылки</div>
      <div class="detail-links">
        ${item.links.map(l => `<a class="detail-link-item" href="${l.url}" target="_blank">🔗 ${l.label}</a>`).join('')}
      </div>
    </div>`;
  }

  html += `<div class="detail-section">
    <div class="detail-section-title">Информация</div>
    <div class="detail-desc">
      <strong>Срок:</strong> ${item.deadline}<br>
      <strong>Этап:</strong> ${item.stage}<br>
      <strong>Статус:</strong> ${isDone ? '✅ Выполнено' : '⏳ В процессе'}
    </div>
  </div>`;

  html += `<button class="detail-btn ${isDone ? 'ghost' : 'primary'}" onclick="toggleTaskDone('${item.id}')">
    ${isDone ? '↩️ Отметить невыполненным' : '✅ Отметить выполненным'}
  </button>`;

  document.getElementById('detailContent').innerHTML = html;

  document.getElementById('detailOverlay').classList.add('open');
  document.getElementById('detailPanel').classList.add('open');
}

function closeDetail() {
  document.getElementById('detailOverlay').classList.remove('open');
  document.getElementById('detailPanel').classList.remove('open');
}

function toggleTaskDone(id) {
  const key = 'done_' + id;
  const isDone = localStorage.getItem(key) === 'true';
  if (isDone) {
    localStorage.removeItem(key);
    showToast('↩️ Задача отмечена невыполненной');
  } else {
    localStorage.setItem(key, 'true');
    showToast('✅ Задача выполнена!');
    if (tg) tg.HapticFeedback.notificationOccurred('success');
  }
  closeDetail();
  renderTasks();
  renderRoute();
}

// ── Organization Selector ─────────────────────────────────────
function openOrgSelector() {
  renderOrgList();
  document.getElementById('orgOverlay').classList.add('open');
  document.getElementById('orgPanel').classList.add('open');
}

function closeOrgSelector() {
  document.getElementById('orgOverlay').classList.remove('open');
  document.getElementById('orgPanel').classList.remove('open');
  document.getElementById('addOrgForm').style.display = 'none';
}

function renderOrgList() {
  const list = document.getElementById('orgList');
  if (organizations.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:13px;padding:20px 0">Нет добавленных организаций</p>';
    return;
  }
  list.innerHTML = organizations.map((org, idx) => `
    <div class="org-item ${currentOrg && currentOrg.inn === org.inn ? 'active' : ''}" onclick="selectOrg(${idx})">
      <div class="org-item-avatar">${getInitials(org.name)}</div>
      <div class="org-item-info">
        <div class="org-item-name">${org.name}</div>
        <div class="org-item-inn">ИНН: ${org.inn}</div>
      </div>
    </div>
  `).join('');
}

function selectOrg(idx) {
  currentOrg = organizations[idx];
  localStorage.setItem('rugrein_current_org', JSON.stringify(currentOrg));
  updateProfile();
  closeOrgSelector();
  showToast(`🏢 Выбрана организация: ${currentOrg.name}`);
}

function showAddOrg() {
  document.getElementById('addOrgForm').style.display = 'block';
  document.getElementById('orgNameInput').focus();
}

function addOrganization() {
  const name = document.getElementById('orgNameInput').value.trim();
  const inn = document.getElementById('orgInnInput').value.trim();

  if (!name) { showToast('❌ Введите название организации'); return; }
  if (!inn || inn.length < 10) { showToast('❌ Введите корректный ИНН'); return; }

  const org = { name, inn, createdAt: Date.now() };
  organizations.push(org);
  localStorage.setItem('rugrein_orgs', JSON.stringify(organizations));

  document.getElementById('orgNameInput').value = '';
  document.getElementById('orgInnInput').value = '';
  document.getElementById('addOrgForm').style.display = 'none';

  selectOrg(organizations.length - 1);
  renderOrgList();
}

// ── Chat / AI ───────────────────────────────────────────────────
function sendChat() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  addChatMessage(text, 'user');
  input.value = '';

  setTimeout(() => {
    const response = generateAIResponse(text);
    addChatMessage(response, 'ai');
  }, 600);
}

function sendSuggestion(text) {
  addChatMessage(text, 'user');
  setTimeout(() => {
    const response = generateAIResponse(text);
    addChatMessage(response, 'ai');
  }, 600);
}

function addChatMessage(text, sender) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-message ' + sender;
  if (sender === 'ai') {
    div.innerHTML = `<div class="ai-label">🤖 AI Помощник</div>${formatAIText(text)}`;
  } else {
    div.textContent = text;
  }
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function formatAIText(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function generateAIResponse(query) {
  const q = query.toLowerCase();

  if (q.includes('задач')) {
    const urgent = tasks.filter(t => t.priority === 'urgent');
    if (urgent.length === 0) return 'У вас нет срочных задач. Все идет по плану! 🎉';
    return `У вас ${urgent.length} срочных задач:\n${urgent.map(t => '• ' + t.title).join('\n')}\n\nОткройте вкладку «Задачи» для подробностей.`;
  }

  if (q.includes('фгис зерно') || q.includes('регистрация') || q.includes('зерно')) {
    return AI_KNOWLEDGE['фгис зерно'];
  }

  if (q.includes('документ') && q.includes('субсиди')) {
    return AI_KNOWLEDGE['документы на субсидию'];
  }

  if (q.includes('элеватор')) {
    return AI_KNOWLEDGE['элеваторные свидетельства'];
  }

  if (q.includes('декларац')) {
    return AI_KNOWLEDGE['декларация соответствия'];
  }

  if (q.includes('техник')) {
    return AI_KNOWLEDGE['субсидия техника'];
  }

  if (q.includes('привет') || q.includes('здравств')) {
    return `Привет! 👋 Я AI-помощник РуГрейн. Готов помочь с вопросами по ФГИС, субсидиям и документообороту.\n\nСпросите меня о:\n• Регистрации в ФГИС «Зерно»\n• Необходимых документах\n• Субсидиях и компенсациях\n• Элеваторных свидетельствах`;
  }

  return `Я нашел информацию по вашему запросу. Попробуйте уточнить вопрос, например:\n• «Как зарегистрироваться в ФГИС Зерно?»\n• «Какие документы нужны для субсидии?»\n• «Что такое элеваторное свидетельство?»`;
}

// ── Documents ───────────────────────────────────────────────────
function renderDocs() {
  const list = document.getElementById('docsList');
  document.getElementById('docsCounter').textContent = documents.length;

  if (documents.length === 0) {
    list.innerHTML = emptyState('📁', 'Нет документов', 'Загрузите документы для быстрого доступа');
    return;
  }

  list.innerHTML = documents.map((doc, idx) => `
    <div class="route-card" style="margin-bottom:8px">
      <div class="route-card-title">📄 ${doc.name}</div>
      <div class="route-card-desc">${formatFileSize(doc.size)} • ${new Date(doc.date).toLocaleDateString('ru-RU')}</div>
      <div class="route-card-meta">
        <span class="route-card-tag" style="background:var(--green-bg);color:var(--green-dark)">${doc.type}</span>
        <button class="section-link" onclick="removeDoc(${idx})" style="color:var(--red)">Удалить</button>
      </div>
    </div>
  `).join('');
}

function uploadDocument() {
  document.getElementById('fileInput').click();
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    documents.push({
      name: file.name,
      size: file.size,
      type: file.type || 'Файл',
      date: Date.now()
    });
  });
  localStorage.setItem('rugrein_docs', JSON.stringify(documents));
  renderDocs();
  showToast(`📎 Загружено ${files.length} файл(ов)`);
  e.target.value = '';
}

function removeDoc(idx) {
  documents.splice(idx, 1);
  localStorage.setItem('rugrein_docs', JSON.stringify(documents));
  renderDocs();
  showToast('🗑️ Документ удален');
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Toast ───────────────────────────────────────────────────────
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function emptyState(icon, title, desc) {
  return `<div class="empty-state">
    <div class="icon">${icon}</div>
    <h3>${title}</h3>
    <p>${desc}</p>
  </div>`;
}

// ── Load saved org on startup ─────────────────────────────────
const savedOrg = localStorage.getItem('rugrein_current_org');
if (savedOrg) {
  try { currentOrg = JSON.parse(savedOrg); } catch(e) {}
}
