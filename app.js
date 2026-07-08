// ═══════════════════════════════════════════════════════════════
// Помощник по ФГИС | MAX Mini App
// Маршрут собран по 4 системам: ЕФГИС ЗСН, ФГИС «Зерно»,
// ФГИС «Семеноводство», ФГИС «Сатурн»
// Вход в приложение возможен только через мессенджер MAX.
// ═══════════════════════════════════════════════════════════════

const maxApp = window.WebApp || null;
const MAX_BOT_LINK = 'https://max.ru/your_fgis_bot?startapp=auth'; // замените на диплинк вашего бота

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
  applySystemTheme();
  initMax();
  renderTasks();
  renderRoute();
  renderDocs();
  updateBadge();
  updateProgressBar();
});

function applySystemTheme() {
  const scheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', scheme);
}

// ── MAX-only авторизация ─────────────────────────────────────
// Приложение открывается только внутри MAX. Библиотека max-web-app.js
// сразу после загрузки прокладывает данные пользователя в window.WebApp,
// отдельного вызова инициализации не требуется.
function initMax() {
  const user = maxApp?.initDataUnsafe?.user;

  if (user) {
    currentUser = {
      id: user.id,
      firstName: user.first_name || 'Пользователь',
      lastName: user.last_name || '',
      username: user.username || '',
      photoUrl: user.photo_url || '',
      platform: 'max'
    };
    if (maxApp.enableClosingConfirmation) maxApp.enableClosingConfirmation();
    showApp();
    updateProfile();
    showToast(`👋 Добро пожаловать, ${currentUser.firstName}!`);
    return;
  }

  // Приложение открыто не из MAX (например, напрямую в браузере) —
  // initDataUnsafe.user недоступен. Показываем экран с просьбой
  // открыть приложение через бота в MAX.
  showMaxOnlyPrompt();
}

function showMaxOnlyPrompt() {
  const checking = document.getElementById('loginChecking');
  const btn = document.getElementById('maxLoginBtn');
  const hint = document.getElementById('maxLoginHint');
  if (checking) checking.style.display = 'none';
  if (btn) btn.style.display = 'flex';
  if (hint) hint.style.display = 'block';
}

// ── Login ───────────────────────────────────────────────────────
// Единственный способ входа — через MAX. Кнопка нужна только на случай,
// если приложение было открыто вне контекста MAX: она либо переоткрывает
// диплинк бота внутри MAX, либо (в обычном браузере) сообщает пользователю,
// что нужно перейти в MAX.
function handleMaxLogin() {
  if (maxApp?.initDataUnsafe?.user) {
    initMax();
  } else if (maxApp?.openMaxLink) {
    maxApp.openMaxLink(MAX_BOT_LINK);
  } else {
    showToast('⚠️ Откройте это приложение через мессенджер MAX');
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
    if (maxApp?.HapticFeedback) maxApp.HapticFeedback.notificationOccurred('success');
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
    div.innerHTML = `<div class="ai-label"><img src="data:image/png;base64,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" style="width:16px;height:16px;vertical-align:middle;margin-right:4px"> AI Помощник</div>${formatAIText(text)}`;
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
