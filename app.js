// ═══════════════════════════════════════════════════════════════
// Помощник по ФГИС | Telegram Mini App
// Маршрут собран по 4 системам: ЕФГИС ЗСН, ФГИС «Зерно»,
// ФГИС «Семеноводство», ФГИС «Сатурн»
// ═══════════════════════════════════════════════════════════════

const tg = window.Telegram?.WebApp;

// ── State ─────────────────────────────────────────────────────
let currentUser = null;
let currentOrg = null;
let organizations = JSON.parse(localStorage.getItem('fgis_orgs') || '[]');
let tasks = [];
let documents = JSON.parse(localStorage.getItem('fgis_docs') || '[]');
let currentTab = 'tasks';

// Filters state
let activeFilters = {
  stage: null,
  deadline: null,
  priority: null,
  required: false,
  recommended: false,
  search: ''
};

// ── Data: задачи по системам ФГИС ────────────────────────────
const ROUTE_DATA = [
  {
    stage: 'ЕФГИС ЗСН',
    icon: '🌍',
    items: [
      {
        id: 'efgis_1',
        title: 'Закрепить поля в Госмониторинге ЕФГИС ЗСН',
        desc: 'Проверьте, что все поля закреплены за вами, а площадь и реквизиты совпадают с документами. Если поле не закреплено или у вас изменились права — подайте заявку на внесение изменений в поле с приложением подтверждающих документов.',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: 'До начала полевых работ',
        deadlineType: 'seasonal',
        docs: ['Документы о праве собственности/аренды', 'Кадастровый номер поля (формат 1234-5678)'],
        links: [
          { label: 'ЕФГИС ЗСН (efis.mcx.ru)', url: 'https://efis.mcx.ru' },
          { label: 'НСПД — поиск участка и координат', url: 'https://nspd.gov.ru' }
        ],
        conditions: [
          { type: 'info', text: 'Если поле не закреплено — сначала найдите его на НСПД, затем создайте заявку «Внести изменения в поле» или «Добавить новое поле»' },
          { type: 'validation', text: 'Заявки на поля с отметкой «Подтверждено ЕГРН» проходят автоматическую проверку корректно' }
        ]
      },
      {
        id: 'efgis_2',
        title: 'Внести кадастры в Реестр ЗСН',
        desc: 'Добавьте кадастровые номера участков (включая участки под производственными базами) в «Реестр ЗСН» — отдельно от Госмониторинга. Это подтверждает использование земли в сельхозпроизводстве, в том числе для применения пониженной ставки земельного налога 0,3% вместо 1,5%.',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: 'В течение 30 календарных дней с даты возникновения/изменения сведений',
        deadlineType: 'fixed',
        docs: ['Кадастровый номер участка', 'Договор аренды (для прав без регистрации) или выписка из ЕГРН'],
        links: [{ label: 'Письмо ФНС от 07.08.2025 № БС-4-21/7365@', url: 'https://efis.mcx.ru' }],
        conditions: [
          { type: 'info', text: 'Запросы на кадастры лучше подавать от лица правообладателя — так подтверждение «Подтверждено ЕГРН» приходит быстрее' }
        ]
      },
      {
        id: 'efgis_3',
        title: 'Внести плановый севооборот',
        desc: 'В карточке поля укажите плановый севооборот: культуру, цель посева, площадь и период сева. Эти данные позже автоматически подтянутся в раздел «Сев и уборка урожая».',
        badge: 'Сезонно',
        badgeClass: 'yellow',
        priority: 'warning',
        deadline: 'Заблаговременно, до начала сева',
        deadlineType: 'seasonal',
        docs: []
      },
      {
        id: 'efgis_4',
        title: 'Зафиксировать фактический севооборот и обработки',
        desc: 'После сева внесите фактический севооборот по каждому кадастровому номеру (культура, сорт, площадь, признак «Семеноводство» или «Пищевые цели»). Обработки пестицидами и агрохимикатами теперь подтягиваются автоматически из ФГИС «Сатурн».',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: 'Сведения о сохранившихся площадях сева озимых — до 1 июля текущего года',
        deadlineType: 'fixed',
        docs: ['Данные о севообороте по каждому полю'],
        conditions: [
          { type: 'dependency', text: 'Если номер поля подтянулся из Госмониторинга в Реестр ЗСН — севооборот подтянется автоматически' }
        ]
      },
      {
        id: 'efgis_5',
        title: 'Внести данные почвенных обследований',
        desc: 'Добавьте в карточку поля сведения о результатах почвенного/агрохимического обследования — дату, лабораторию, реквизиты и итоги, приложите скан заключения.',
        badge: 'По мере получения',
        badgeClass: 'blue',
        priority: 'normal',
        deadline: 'После получения агрохимпаспорта поля',
        deadlineType: 'ongoing',
        docs: ['Паспорт агрохимического обследования']
      }
    ]
  },
  {
    stage: 'ФГИС Зерно',
    icon: '🌾',
    items: [
      {
        id: 'zerno_1',
        title: 'Создать место формирования партии зерна',
        desc: 'Создайте карточку места формирования партии по конкретной культуре (ОКПД2). До внесения сведений об урожае статус должен оставаться «Наполняется».',
        badge: 'Сезонно',
        badgeClass: 'yellow',
        priority: 'warning',
        deadline: 'Перед началом уборки урожая',
        deadlineType: 'seasonal',
        docs: []
      },
      {
        id: 'zerno_2',
        title: 'Внести сведения о собранном урожае',
        desc: 'Укажите номер поля из ЕФГИС ЗСН, площадь, с которой собран урожай, и массу зерна, а также место хранения. По одному месту формирования партии можно указать данные с нескольких полей.',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: 'В день (или сразу после) уборки',
        deadlineType: 'fixed',
        docs: ['Данные о массе намолота']
      },
      {
        id: 'zerno_3',
        title: 'Подать заявку на Госмониторинг',
        desc: 'Заявку на проведение госмониторинга качества зерна теперь отправляют только в ФГИС «Зерно» — дублировать её на почту ЦОКЗ больше не нужно. Укажите желаемую дату выезда отборщика проб.',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: 'Сразу после внесения сведений об урожае',
        deadlineType: 'fixed',
        docs: []
      },
      {
        id: 'zerno_4',
        title: 'Дождаться отбора проб',
        desc: 'После отбора проб сотрудник ЦОКЗ присвоит номер акта отбора проб к месту формирования партии — статус сменится на «Пробы отобраны».',
        badge: 'По записи',
        badgeClass: 'purple',
        priority: 'normal',
        deadline: 'По согласованной дате выезда пробоотборщика',
        deadlineType: 'appointment',
        docs: ['Акт отбора проб']
      },
      {
        id: 'zerno_5',
        title: 'Сформировать партию зерна',
        desc: 'Сформируйте партию одним из двух способов: «при отборе проб» (потребительские свойства вносите сами) или «по результатам Госмониторинга» (свойства подгружаются автоматически из протокола исследований).',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: 'После получения результатов исследований',
        deadlineType: 'fixed',
        docs: ['Номер акта отбора проб или номер протокола исследований']
      },
      {
        id: 'zerno_6',
        title: 'Оформить декларацию соответствия',
        desc: 'На основании сформированной партии, протоколов испытаний (включая исследование на ГМО) и справки о применённых пестицидах из ФГИС «Сатурн» оформите декларацию соответствия во ФГИС «Росаккредитация».',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: 'Перед реализацией зерна',
        deadlineType: 'fixed',
        docs: ['Протоколы испытаний', 'Справка о применении пестицидов (из ФГИС Сатурн)'],
        links: [{ label: 'ЛК «Платежи» (регистрация деклараций)', url: 'https://pay.niakk.ru' }],
        conditions: [
          { type: 'info', text: 'С 1 марта 2025 г. регистрация деклараций и публикация сертификатов соответствия платные — оплата через ЛК «Платежи»' }
        ]
      }
    ]
  },
  {
    stage: 'ФГИС Семеноводство',
    icon: '🌱',
    items: [
      {
        id: 'seeds_1',
        title: 'Оформить лицензионный договор на охраняемый сорт',
        desc: 'Для выращивания семян на семена (кроме гороха, гречихи, картофеля, овса, проса, пшеницы, ржи, тритикале и ячменя — для МСП в течение 2 лет без НЛД) нужен лицензионный договор с патентообладателем. Без него посевы не апробируют.',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: 'До посева семян охраняемого сорта',
        deadlineType: 'fixed',
        docs: ['Лицензионный договор', 'Оплата госпошлины'],
        links: [{ label: 'Госсорткомиссия — по лицензионным договорам', url: 'https://gossortrf.ru' }],
        conditions: [
          { type: 'branch', text: 'МСП могут без НЛД в течение 2 лет выращивать 9 культур из перечня — все остальные культуры требуют договор всегда' }
        ]
      },
      {
        id: 'seeds_2',
        title: 'Принять сделку с семенами',
        desc: 'Внесите сделку по приобретению семян (например, элиты), сверьте с УПД/накладной и прикрепите скан документа перехода права собственности.',
        badge: 'По факту сделки',
        badgeClass: 'blue',
        priority: 'normal',
        deadline: 'В день получения УПД',
        deadlineType: 'fixed',
        docs: ['УПД / накладная на семена']
      },
      {
        id: 'seeds_3',
        title: 'Списать объём семян на посев в ЕФГИС ЗСН',
        desc: 'Спишите объём с указанием цели посева — «Семенные» (если сеете на семена) или «Пищевые» (если на товарное зерно). Документ автоматически уйдёт в ЕФГИС ЗСН.',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: 'Перед посевом',
        deadlineType: 'fixed',
        docs: []
      },
      {
        id: 'seeds_4',
        title: 'Подать заявку на определение сортовых качеств (акт апробации)',
        desc: 'Создайте заявку на основании документа «Посев семян», выберите аккредитованную организацию и согласуйте дату апробации посевов.',
        badge: 'Сезонно',
        badgeClass: 'yellow',
        priority: 'warning',
        deadline: 'В фазу молочно-восковой спелости (для пшеницы) — до уборки',
        deadlineType: 'seasonal',
        docs: []
      },
      {
        id: 'seeds_5',
        title: 'Учесть урожай и заказать протокол посевных качеств',
        desc: 'После подписания акта апробации внесите фактически выращенный объём семян в «Результаты посева», затем сформируйте заявку на определение посевных (посадочных) качеств семян — протокол испытаний.',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: 'Сразу после уборки и подписания акта апробации',
        deadlineType: 'fixed',
        docs: ['Акт апробации посевов']
      }
    ]
  },
  {
    stage: 'ФГИС Сатурн',
    icon: '🧪',
    items: [
      {
        id: 'saturn_1',
        title: 'Создать место хранения ПАТ',
        desc: 'Создайте склад (место хранения пестицидов и агрохимикатов) в разделе «Места хранения» и запросите подтверждение статуса «Актуально» в своём территориальном управлении Россельхознадзора.',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: 'До первой приёмки накладной',
        deadlineType: 'fixed',
        docs: [],
        links: [
          { label: 'ФГИС «Сатурн»', url: 'https://fgis-saturn.ru' },
          { label: 'Wiki Сатурн', url: 'https://wiki.fgis-saturn.ru/hs/' }
        ]
      },
      {
        id: 'saturn_2',
        title: 'Добавить место применения',
        desc: 'Добавьте склад (или земельный участок) в «Места применения», если планируете протравку семян, приготовление приманок от грызунов или обработку полей. Тоже требует подтверждения ТУ Россельхознадзора.',
        badge: 'По необходимости',
        badgeClass: 'blue',
        priority: 'normal',
        deadline: 'До начала работ с ПАТ на объекте',
        deadlineType: 'ongoing',
        docs: []
      },
      {
        id: 'saturn_3',
        title: 'Принять накладную на ПАТ',
        desc: 'Примите поступившую накладную полностью или частично, проверьте номер, дату и количество, обратите внимание на срок регистрации препарата, чтобы не возникло проблем при применении.',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: 'По факту поступления груза',
        deadlineType: 'fixed',
        docs: ['УПД поставщика']
      },
      {
        id: 'saturn_4',
        title: 'Сформировать план применения',
        desc: 'Составьте план применения пестицидов/агрохимикатов по местам применения и препаратам с указанием доз и способа внесения. Планы по полям с фактическим севооборотом из ЕФГИС ЗСН автоматически публикуются на портале пчеловода — отдельное объявление в СМИ по 490-ФЗ не требуется.',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: 'Не ранее 10 и не позднее 5 дней до начала работ',
        deadlineType: 'fixed',
        docs: [],
        links: [{ label: 'Портал пчеловода', url: 'https://bee-saturn.ru' }],
        conditions: [
          { type: 'validation', text: 'Если плана на севооборот из ЗСН нет — по 490-ФЗ нужно отдельно давать объявление о обработке в СМИ (газету)' }
        ]
      },
      {
        id: 'saturn_5',
        title: 'Оформить акт применения',
        desc: 'После проведения обработки сформируйте акт применения на основании плана: номер акта, дата и время фактических работ, использованные партии и дозировки препаратов.',
        badge: 'Обязательно',
        badgeClass: 'green',
        priority: 'urgent',
        deadline: 'В день фактического проведения работ',
        deadlineType: 'fixed',
        docs: []
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

**Подача:** через портал Госуслуг или лично в Минсельхоз региона.`,

  'ефгис зсн': `**ЕФГИС ЗСН** — единая система учёта земель сельхозназначения (Госмониторинг + Реестр ЗСН + севообороты).

**Порядок работы:**
1. Закрепите поля в Госмониторинге ЗСН (заявка на редактирование поля + документы о праве)
2. Внесите кадастры в «Реестр ЗСН» — в течение 30 дней с момента изменения сведений
3. Заполните плановый севооборот по каждому полю
4. После сева зафиксируйте фактический севооборот (данные о сохранившихся площадях озимых — до 1 июля)
5. Добавьте результаты почвенных обследований`,

  'семеноводство': `**ФГИС «Семеноводство»** — учёт оборота семян: от покупки элиты до реализации.

**Порядок работы:**
1. При работе с охраняемым сортом — оформите лицензионный договор с патентообладателем
2. Примите сделку с семенами (сверка с УПД)
3. Спишите объём на посев в ЕФГИС ЗСН (цель — «Семенные» или «Пищевые»)
4. Дождитесь молочно-восковой спелости и подайте заявку на акт апробации
5. После уборки учтите урожай и закажите протокол посевных качеств`,

  'фгис сатурн': `**ФГИС «Сатурн»** — учёт оборота пестицидов и агрохимикатов (ПАТ).

**Порядок работы:**
1. Создайте место хранения (склад) и подтвердите его в ТУ Россельхознадзора
2. При необходимости добавьте место применения (протравка, приманки, обработка полей)
3. Принимайте накладные на ПАТ по факту поступления
4. Формируйте план применения не ранее 10 и не позднее 5 дней до начала работ
5. После обработки оформляйте акт применения на основании плана`
};

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTelegram();
  renderTasks();
  renderRoute();
  renderDocs();
  updateBadge();
  updateProgressBar();
});

function initTelegram() {
  if (tg) {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();

    applyTelegramTheme();
    tg.onEvent('themeChanged', applyTelegramTheme);

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
  const scheme = tg.colorScheme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', scheme);
  tg.setHeaderColor(scheme === 'dark' ? '#1c232b' : '#ffffff');
  if (tg.setBackgroundColor) tg.setBackgroundColor(scheme === 'dark' ? '#14191f' : '#f5f5f0');
}

// ── Login ───────────────────────────────────────────────────────
function handleLogin() {
  if (tg) {
    tg.openTelegramLink('https://t.me/your_fgis_bot?start=auth');
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

// ── Progress Bar ────────────────────────────────────────────────
function updateProgressBar() {
  let total = 0, done = 0;
  ROUTE_DATA.forEach(stage => {
    stage.items.forEach(item => {
      total++;
      if (localStorage.getItem('done_' + item.id) === 'true') done++;
    });
  });
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const fill = document.getElementById('progressBarFill');
  const text = document.getElementById('progressBarText');
  const percent = document.getElementById('progressBarPercent');
  if (fill) fill.style.width = pct + '%';
  if (text) text.textContent = `${done} из ${total} выполнено`;
  if (percent) percent.textContent = pct + '%';
}

// ── Filters ───────────────────────────────────────────────────
function setFilter(type, value) {
  if (type === 'all') {
    activeFilters = { stage: null, deadline: null, priority: null, required: false, recommended: false, search: activeFilters.search };
  } else if (type === 'priority') {
    activeFilters.priority = activeFilters.priority === value ? null : value;
  } else if (type === 'required') {
    activeFilters.required = !activeFilters.required;
    if (activeFilters.required) activeFilters.recommended = false;
  } else if (type === 'recommended') {
    activeFilters.recommended = !activeFilters.recommended;
    if (activeFilters.recommended) activeFilters.required = false;
  }
  updateFilterChips();
  renderTasks();
}

function updateFilterChips() {
  document.querySelectorAll('.filter-chip').forEach(chip => {
    const filter = chip.dataset.filter;
    let isActive = false;
    if (filter === 'all') isActive = !activeFilters.stage && !activeFilters.deadline && !activeFilters.priority && !activeFilters.required && !activeFilters.recommended;
    else if (filter === 'priority') isActive = activeFilters.priority === 'urgent';
    else if (filter === 'required') isActive = activeFilters.required;
    else if (filter === 'recommended') isActive = activeFilters.recommended;
    else if (filter === 'stage') isActive = !!activeFilters.stage;
    else if (filter === 'deadline') isActive = !!activeFilters.deadline;

    chip.classList.toggle('active', isActive);
    if (filter === 'stage' && activeFilters.stage) {
      chip.textContent = '📍 ' + activeFilters.stage + ' ✕';
    } else if (filter === 'stage') {
      chip.textContent = '📍 Система ▾';
    }
    if (filter === 'deadline' && activeFilters.deadline) {
      const labels = { fixed: 'Фиксированный', seasonal: 'Сезонный', ongoing: 'По мере поступления', appointment: 'По записи' };
      chip.textContent = '📅 ' + labels[activeFilters.deadline] + ' ✕';
    } else if (filter === 'deadline') {
      chip.textContent = '📅 Срок ▾';
    }
  });
}

function toggleStageFilter() {
  if (activeFilters.stage) {
    activeFilters.stage = null;
    updateFilterChips();
    renderTasks();
    return;
  }
  const list = document.getElementById('stageFilterList');
  list.innerHTML = ROUTE_DATA.map(s => `
    <div class="org-item" onclick="selectStageFilter('${s.stage}')">
      <div class="org-item-avatar">${s.icon}</div>
      <div class="org-item-info">
        <div class="org-item-name">${s.stage}</div>
        <div class="org-item-inn">${s.items.length} задач</div>
      </div>
    </div>
  `).join('');
  document.getElementById('stageFilterOverlay').classList.add('open');
  document.getElementById('stageFilterPanel').classList.add('open');
}

function selectStageFilter(stage) {
  activeFilters.stage = stage;
  closeStageFilter();
  updateFilterChips();
  renderTasks();
}

function closeStageFilter() {
  document.getElementById('stageFilterOverlay').classList.remove('open');
  document.getElementById('stageFilterPanel').classList.remove('open');
}

function toggleDeadlineFilter() {
  if (activeFilters.deadline) {
    activeFilters.deadline = null;
    updateFilterChips();
    renderTasks();
    return;
  }
  const options = [
    { value: 'fixed', label: 'Фиксированный срок', desc: 'Точные даты и периоды' },
    { value: 'seasonal', label: 'Сезонный', desc: 'Привязан к сельхозциклу' },
    { value: 'ongoing', label: 'По мере поступления', desc: 'Без жёсткого дедлайна' },
    { value: 'appointment', label: 'По записи', desc: 'Согласовывается отдельно' }
  ];
  const list = document.getElementById('deadlineFilterList');
  list.innerHTML = options.map(o => `
    <div class="org-item" onclick="selectDeadlineFilter('${o.value}')">
      <div class="org-item-info">
        <div class="org-item-name">${o.label}</div>
        <div class="org-item-inn">${o.desc}</div>
      </div>
    </div>
  `).join('');
  document.getElementById('deadlineFilterOverlay').classList.add('open');
  document.getElementById('deadlineFilterPanel').classList.add('open');
}

function selectDeadlineFilter(type) {
  activeFilters.deadline = type;
  closeDeadlineFilter();
  updateFilterChips();
  renderTasks();
}

function closeDeadlineFilter() {
  document.getElementById('deadlineFilterOverlay').classList.remove('open');
  document.getElementById('deadlineFilterPanel').classList.remove('open');
}

// ── Search ────────────────────────────────────────────────────
function handleSearch(value) {
  activeFilters.search = value.toLowerCase().trim();
  const clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.classList.toggle('visible', activeFilters.search.length > 0);
  renderTasks();
}

function clearSearch() {
  const input = document.getElementById('taskSearch');
  if (input) input.value = '';
  activeFilters.search = '';
  const clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.classList.remove('visible');
  renderTasks();
}

// ── Tasks ───────────────────────────────────────────────────────
function getFilteredTasks() {
  let allItems = [];
  ROUTE_DATA.forEach(stage => {
    stage.items.forEach(item => {
      allItems.push({ ...item, stage: stage.stage });
    });
  });

  // Apply filters
  if (activeFilters.stage) {
    allItems = allItems.filter(i => i.stage === activeFilters.stage);
  }
  if (activeFilters.deadline) {
    allItems = allItems.filter(i => i.deadlineType === activeFilters.deadline);
  }
  if (activeFilters.priority) {
    allItems = allItems.filter(i => i.priority === activeFilters.priority);
  }
  if (activeFilters.required) {
    allItems = allItems.filter(i => i.badge === 'Обязательно');
  }
  if (activeFilters.recommended) {
    allItems = allItems.filter(i => i.badge !== 'Обязательно');
  }
  if (activeFilters.search) {
    allItems = allItems.filter(i =>
      i.title.toLowerCase().includes(activeFilters.search) ||
      i.desc.toLowerCase().includes(activeFilters.search) ||
      i.stage.toLowerCase().includes(activeFilters.search) ||
      i.deadline.toLowerCase().includes(activeFilters.search)
    );
  }

  const priorityOrder = { urgent: 0, warning: 1, normal: 2 };
  allItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return allItems;
}

function renderTasks() {
  const list = document.getElementById('tasksList');
  const allItems = getFilteredTasks();
  tasks = allItems;

  if (allItems.length === 0) {
    const hasFilters = activeFilters.stage || activeFilters.deadline || activeFilters.priority || activeFilters.required || activeFilters.recommended || activeFilters.search;
    list.innerHTML = emptyState('📋', hasFilters ? 'Ничего не найдено' : 'Нет задач', hasFilters ? 'Попробуйте изменить фильтры или поиск' : 'Все задачи выполнены!');
    updateBadge();
    return;
  }

  list.innerHTML = allItems.map(item => {
    const isDone = localStorage.getItem('done_' + item.id) === 'true';
    return `
    <div class="task-card ${item.priority} ${isDone ? 'done' : ''}" onclick="openDetail('${item.id}')" style="${isDone ? 'opacity:0.6' : ''}">
      <div class="task-top">
        <div class="task-title">${isDone ? '✅ ' : ''}${item.title}</div>
        <div class="task-badge ${item.badgeClass}">${item.badge}</div>
      </div>
      <div class="task-desc">${item.desc}</div>
      <div class="task-meta">
        <div class="task-meta-item ${item.priority}">📅 ${item.deadline}</div>
        <div class="task-meta-item">📁 ${item.docs.length} док.</div>
        <div class="task-meta-item">${item.stage}</div>
        ${item.deadlineType ? `<div class="task-meta-item">⏱️ ${getDeadlineLabel(item.deadlineType)}</div>` : ''}
      </div>
    </div>
  `}).join('');

  updateBadge();
}

function getDeadlineLabel(type) {
  const labels = { fixed: 'Фиксированный', seasonal: 'Сезонный', ongoing: 'По мере поступления', appointment: 'По записи' };
  return labels[type] || type;
}

function updateBadge() {
  const urgentCount = tasks.filter(t => t.priority === 'urgent' && localStorage.getItem('done_' + t.id) !== 'true').length;
  const badge = document.getElementById('tasksBadge');
  if (badge) {
    if (urgentCount > 0) {
      badge.textContent = urgentCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
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
                  <div class="route-card-title">${isDone ? '✅ ' : ''}${item.title}</div>
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

  const counter = document.getElementById('routeCounter');
  if (counter) counter.textContent = `${done}/${total}`;
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
      <strong>Тип срока:</strong> ${getDeadlineLabel(item.deadlineType)}<br>
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
  updateProgressBar();
  updateBadge();
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
  localStorage.setItem('fgis_current_org', JSON.stringify(currentOrg));
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
  localStorage.setItem('fgis_orgs', JSON.stringify(organizations));

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

  if (q.includes('ефгис') || q.includes('зсн') || q.includes('севооборот')) {
    return AI_KNOWLEDGE['ефгис зсн'];
  }

  if (q.includes('семен') || q.includes('апробац')) {
    return AI_KNOWLEDGE['семеноводство'];
  }

  if (q.includes('сатурн') || q.includes('пестицид') || q.includes('план примен')) {
    return AI_KNOWLEDGE['фгис сатурн'];
  }

  if (q.includes('фгис зерно') || q.includes('регистрация') || q.includes('партию') || q.includes('зерно')) {
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
    return `Привет! 👋 Я AI-помощник по ФГИС. Готов помочь с вопросами по ЕФГИС ЗСН, ФГИС «Зерно», «Семеноводство» и «Сатурн».\n\nСпросите меня о:\n• Закреплении полей в ЕФГИС ЗСН\n• Регистрации и партиях в ФГИС «Зерно»\n• Апробации и учёте семян\n• Планах и актах применения в ФГИС «Сатурн»`;
  }

  return `Пока не нашёл точный ответ. Попробуйте уточнить вопрос, например:\n• «Что делать в ЕФГИС ЗСН?»\n• «Как сформировать партию во ФГИС Зерно?»\n• «Как оформить апробацию семян?»\n• «Как сделать план применения в Сатурне?»`;
}

// ── Documents ───────────────────────────────────────────────────
function renderDocs() {
  const list = document.getElementById('docsList');
  const counter = document.getElementById('docsCounter');
  if (counter) counter.textContent = documents.length;

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
  localStorage.setItem('fgis_docs', JSON.stringify(documents));
  renderDocs();
  showToast(`📎 Загружено ${files.length} файл(ов)`);
  e.target.value = '';
}

function removeDoc(idx) {
  documents.splice(idx, 1);
  localStorage.setItem('fgis_docs', JSON.stringify(documents));
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
const savedOrg = localStorage.getItem('fgis_current_org');
if (savedOrg) {
  try { currentOrg = JSON.parse(savedOrg); } catch(e) {}
}
