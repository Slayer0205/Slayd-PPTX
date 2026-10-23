export type TemplateCategory = (typeof templateCategories)[number]['id'];
export const templateCategories = [
  {
    id: 'science',
    name: 'Ilm-fan',
    keywords: ['ilmiy', 'tadqiqot', 'laboratoriya', 'science', 'research', 'наука', 'исследован'],
    ink: '#172e45',
    accent: '#2b6b93',
    soft: '#dceaf1',
    sections: ['Tadqiqot savoli', 'Metod va dalillar', 'Tahlil', 'Xulosa'],
  },
  {
    id: 'biology',
    name: 'Biologiya',
    keywords: [
      'biolog',
      'hujayr',
      'genetik',
      'dna',
      'dnk',
      'botanik',
      'biologiya',
      'biology',
      'cell',
      'биолог',
      'клетк',
    ],
    ink: '#183e32',
    accent: '#458a56',
    soft: '#dfecd1',
    sections: ['Tuzilish', 'Hayotiy jarayon', 'Kuzatuv va dalillar', 'Ekotizimdagi o‘rni'],
  },
  {
    id: 'medicine',
    name: 'Tibbiyot',
    keywords: [
      'tibb',
      'yurak',
      'soglom',
      'sog‘liq',
      'kasallik',
      'anatomi',
      'medic',
      'health',
      'cardio',
      'медицин',
      'здоров',
    ],
    ink: '#133747',
    accent: '#137f8a',
    soft: '#d4eeed',
    sections: ['Muammo va ahamiyat', 'Tuzilish va vazifa', 'Dalillar tahlili', 'Amaliy tavsiyalar'],
  },
  {
    id: 'technology',
    name: 'IT va sun’iy intellekt',
    keywords: [
      'python',
      'tkinter',
      'dastur',
      'kompyut',
      'texnolog',
      'suniy intellekt',
      'machine learning',
      'ai',
      'it',
      'code',
      'web',
      'программ',
      'технолог',
    ],
    ink: '#202b49',
    accent: '#5b68cf',
    soft: '#e2e6fc',
    sections: ['Muammo va yechim', 'Tizim arxitekturasi', 'Amaliy misol', 'Sinov va natija'],
  },
  {
    id: 'business',
    name: 'Biznes',
    keywords: [
      'biznes',
      'startap',
      'startup',
      'marketing',
      'brend',
      'business',
      'pitch',
      'mijoz',
      'bozor',
      'бизнес',
      'маркетинг',
    ],
    ink: '#28343d',
    accent: '#bc6d37',
    soft: '#f1e1d2',
    sections: ['Muammo', 'Qiymat taklifi', 'Amaliy reja', 'Keyingi qadamlar'],
  },
  {
    id: 'economics',
    name: 'Iqtisodiyot',
    keywords: [
      'iqtisod',
      'moliya',
      'bank',
      'invest',
      'buxgalter',
      'econom',
      'financ',
      'inflats',
      'эконом',
      'финанс',
    ],
    ink: '#183b37',
    accent: '#3e806d',
    soft: '#d9e9df',
    sections: ['Iqtisodiy savol', 'Ko‘rsatkichlar', 'Taqqoslash va tahlil', 'Xulosa'],
  },
  {
    id: 'education',
    name: 'Ta’lim',
    keywords: [
      'talim',
      'maktab',
      'universitet',
      'pedagog',
      'oqit',
      'dars',
      'education',
      'teach',
      'lesson',
      'обучен',
      'педагог',
    ],
    ink: '#3b3048',
    accent: '#9b6b91',
    soft: '#eee0ec',
    sections: ['O‘quv maqsadi', 'Asosiy tushunchalar', 'Mashq va misollar', 'Mustahkamlash'],
  },
  {
    id: 'history',
    name: 'Tarix',
    keywords: [
      'tarix',
      'qadim',
      'temur',
      'siviliz',
      'history',
      'histor',
      'ancient',
      'истори',
      'древн',
    ],
    ink: '#483329',
    accent: '#aa7748',
    soft: '#ecdfc7',
    sections: ['Davr va kontekst', 'Muhim voqealar', 'Manbalar tahlili', 'Tarixiy ta’sir'],
  },
  {
    id: 'psychology',
    name: 'Psixologiya',
    keywords: [
      'psixolog',
      'ruhiy',
      'xotira',
      'tafakkur',
      'psixik',
      'psych',
      'cognit',
      'психолог',
      'памят',
    ],
    ink: '#40334b',
    accent: '#a379ae',
    soft: '#ece1f0',
    sections: ['Asosiy tushuncha', 'Nazariya va yondashuv', 'Kuzatuv va tahlil', 'Amaliy xulosa'],
  },
  {
    id: 'ecology',
    name: 'Ekologiya',
    keywords: [
      'ekolog',
      'yashil',
      'iqlim',
      'tabiat',
      'barqaror',
      'ecolog',
      'climate',
      'sustain',
      'green',
      'эколог',
      'климат',
    ],
    ink: '#283d2b',
    accent: '#6a8840',
    soft: '#e5ebcf',
    sections: ['Tabiiy tizim', 'Muammo va sabablar', 'Ta’sir tahlili', 'Barqaror yechim'],
  },
  {
    id: 'mathematics',
    name: 'Matematika',
    keywords: [
      'matematik',
      'algebra',
      'geometri',
      'hisob',
      'math',
      'formula',
      'statistics',
      'statistik',
      'математ',
      'геометр',
    ],
    ink: '#24364d',
    accent: '#447dbe',
    soft: '#dce7f6',
    sections: ['Masala sharti', 'Asosiy model', 'Yechish bosqichlari', 'Tekshirish'],
  },
  {
    id: 'chemistry',
    name: 'Kimyo',
    keywords: ['kimyo', 'reaksiya', 'molekula', 'organik', 'chem', 'molecul', 'хими', 'реакц'],
    ink: '#203c3c',
    accent: '#218f8a',
    soft: '#d6eddf',
    sections: ['Tarkib va tuzilish', 'Xossalar', 'Jarayon va shartlar', 'Qo‘llanish'],
  },
  {
    id: 'physics',
    name: 'Fizika va koinot',
    keywords: [
      'fizik',
      'koinot',
      'kosmos',
      'energiya',
      'mexanik',
      'physics',
      'space',
      'astronom',
      'физик',
      'космос',
    ],
    ink: '#242c48',
    accent: '#8c79bf',
    soft: '#e3def2',
    sections: ['Hodisa', 'Model va qonuniyat', 'Tajriba va tahlil', 'Amaliy qo‘llanish'],
  },
  {
    id: 'literature',
    name: 'Adabiyot va tillar',
    keywords: [
      'adabiyot',
      'til',
      'navoiy',
      'asar',
      'she r',
      'literat',
      'language',
      'english',
      'grammar',
      'литерат',
      'язык',
    ],
    ink: '#4d343c',
    accent: '#ac6874',
    soft: '#f0e1df',
    sections: ['Muallif va kontekst', 'Asar yoki tushuncha', 'Tahlil va misollar', 'Xulosa'],
  },
  {
    id: 'architecture',
    name: 'Arxitektura',
    keywords: [
      'arxitekt',
      'qurilish',
      'shahar',
      'interyer',
      'architecture',
      'urban',
      'building',
      'архитект',
      'строител',
    ],
    ink: '#3b3a35',
    accent: '#a47f51',
    soft: '#e8e2d6',
    sections: ['Vazifa va kontekst', 'Konsepsiya', 'Tuzilma va yechim', 'Muhokama'],
  },
  {
    id: 'creative',
    name: 'San’at va ijod',
    keywords: [
      'sanat',
      'dizayn',
      'ijod',
      'musiqa',
      'fotograf',
      'art',
      'design',
      'music',
      'creative',
      'искусств',
      'дизайн',
    ],
    ink: '#3b2b3e',
    accent: '#c36765',
    soft: '#f1dbd1',
    sections: ['G‘oya', 'Uslub va kompozitsiya', 'Ijodiy jarayon', 'Natija va talqin'],
  },
] as const;

type Entry = readonly [id: string, name: string, description: string, keywords: string];
const entries: readonly (readonly Entry[])[] = [
  [
    [
      'research-atlas',
      'Tadqiqot atlasi',
      'Koordinatalar, dalillar va yirik akademik tipografika.',
      'dissertatsiya thesis',
    ],
    [
      'lab-journal',
      'Laboratoriya jurnali',
      'Tungi laboratoriya, grafik to‘r va tizimli yozuvlar.',
      'laboratoriya tajriba laboratory',
    ],
    [
      'science-editorial',
      'Ilmiy nigoh',
      'Jurnal sahifasi uslubida keng ustunlar va izohlar.',
      'maqola article conference',
    ],
    [
      'discovery-map',
      'Kashfiyot xaritasi',
      'Bog‘langan g‘oyalar va ko‘rgazmali tadqiqot tuzilmasi.',
      'kashfiyot discovery innovation',
    ],
  ],
  [
    [
      'bio-cell',
      'Hujayra atlasi',
      'Organik hujayra motivi va ikki darajali izohlar.',
      'hujayra cell cytology',
    ],
    [
      'genetic-code',
      'Genetik kod',
      'DNK ritmi, qoramtir fon va aniq tahlil bloklari.',
      'genetika dna dnk genetics',
    ],
    [
      'botanical-notes',
      'Botanika daftari',
      'Barglar silueti va tabiiy jurnal kompozitsiyasi.',
      'botanika osimlik plant botany',
    ],
    [
      'living-systems',
      'Tirik tizimlar',
      'Hayotiy jarayonlarni bog‘langan bloklarda tushuntiring.',
      'ekotizim organizm organism',
    ],
  ],
  [
    [
      'clinical-atlas',
      'Klinik atlas',
      'Tibbiy ko‘k ranglar va aniq klinik ma’lumot iyerarxiyasi.',
      'klinika anatomiya anatomy',
    ],
    [
      'cardio-pulse',
      'Yurak ritmi',
      'Kardiogramma motivi, katta sarlavha va ixcham izohlar.',
      'yurak kardiolog cardiology heart',
    ],
    [
      'public-health',
      'Sog‘lom jamiyat',
      'Jamoat salomatligi uchun iliq va o‘qilishi oson dizayn.',
      'salomatlik jamoat health',
    ],
    [
      'pharma-lab',
      'Farmatsevtika',
      'Molekulyar belgilar va tartibli farmatsevtik taqdimot.',
      'farmatsiya dori pharmacy',
    ],
  ],
  [
    [
      'code-studio',
      'Python Studio',
      'Kod oynasi va vidjetlar bilan dasturlash taqdimoti.',
      'python tkinter dasturlash gui',
    ],
    [
      'neural-grid',
      'Neyron tarmoq',
      'Bog‘langan tugunlar va zamonaviy texnologik makon.',
      'suniy intellekt ai neural machine learning',
    ],
    [
      'product-interface',
      'Raqamli mahsulot',
      'Interfeys kartalari va mahsulot arxitekturasiga urg‘u.',
      'web ux ui frontend backend app',
    ],
    [
      'cyber-terminal',
      'Kiber terminal',
      'Monospace yozuvlar, terminal ritmi va xavfsizlik bloklari.',
      'kiber cybersecurity security linux',
    ],
  ],
  [
    [
      'startup-pitch',
      'Startap sahnasi',
      'Katta qiymat taklifi va ishonchli pitch kompozitsiyasi.',
      'startup startap pitch investor',
    ],
    [
      'brand-strategy',
      'Brend strategiyasi',
      'Editorial sarlavhalar va yorqin brend aksentlari.',
      'brend brand marketing',
    ],
    [
      'business-blueprint',
      'Biznes arxitekturasi',
      'Muammo, yechim va reja uchun tizimli maket.',
      'biznes business plan reja',
    ],
    [
      'market-story',
      'Bozor hikoyasi',
      'Taqqoslashlar va mijoz yo‘liga mos vizual hikoya.',
      'bozor market mijoz sales',
    ],
  ],
  [
    [
      'finance-ledger',
      'Moliya daftari',
      'Ustunlar, ajratilgan raqam maydonlari va ishonchli serif.',
      'moliya finance bank buxgalter',
    ],
    [
      'economy-outlook',
      'Iqtisodiy nigoh',
      'Ko‘rsatkich va tendensiyalar uchun keng tahliliy sahnalar.',
      'iqtisodiyot economy makroiqtisod',
    ],
    [
      'investment-map',
      'Investitsiya xaritasi',
      'Kapital yo‘nalishlari va strategiya bloklari.',
      'investitsiya invest portfolio',
    ],
    [
      'data-economics',
      'Ma’lumot va iqtisod',
      'Ma’lumot kartalari va xulosaga olib boruvchi tartib.',
      'statistika inflatsiya data analytics',
    ],
  ],
  [
    [
      'learning-path',
      'Bilim yo‘li',
      'Bosqichli o‘quv xaritasi va oson kuzatiladigan bo‘limlar.',
      'dars lesson talim teaching',
    ],
    [
      'campus-editorial',
      'Universitet kundaligi',
      'Universitet mavzulari uchun jurnalga xos zamonaviy uslub.',
      'universitet university campus',
    ],
    [
      'lesson-workshop',
      'Dars ustaxonasi',
      'Mashq kartalari, katta savollar va faol o‘rganish.',
      'maktab pedagogika school pedagogy',
    ],
    [
      'knowledge-cards',
      'Bilim kartalari',
      'Tushuncha, misol va mashqlarni alohida ko‘rsating.',
      'test education learning seminar',
    ],
  ],
  [
    [
      'history-chronicle',
      'Tarix solnomasi',
      'Xronologik chiziq va arxivga xos iliq qog‘oz palitrasi.',
      'tarix history chronology',
    ],
    [
      'silk-road',
      'Ipak yo‘li',
      'Yo‘l tugunlari, me’moriy ritm va sharqona sokin ranglar.',
      'ipak yoli silk road uzbekiston',
    ],
    [
      'heritage-archive',
      'Meros arxivi',
      'Manba kartalari va yirik tarixiy sarlavhalar.',
      'temur meros heritage ancient',
    ],
    [
      'civilization-map',
      'Sivilizatsiyalar',
      'Davrlar va o‘zgarishlarni qatlamli kompozitsiyada oching.',
      'sivilizatsiya civilization qadim',
    ],
  ],
  [
    [
      'mind-atlas',
      'Tafakkur atlasi',
      'Bog‘langan fikrlar va sokin binafsha makon.',
      'tafakkur cognition psychology',
    ],
    [
      'human-behavior',
      'Inson va xulq',
      'Inson markazidagi tahlil uchun organik shakllar.',
      'xulq behavior psixologiya',
    ],
    [
      'memory-path',
      'Xotira yo‘llari',
      'Xotira va o‘rganish uchun izchil vizual yo‘nalish.',
      'xotira memory learning',
    ],
    [
      'emotional-balance',
      'Hissiy muvozanat',
      'Keng bo‘shliq, yumshoq shakllar va mulohaza bloklari.',
      'hissiyot stress emotion mental',
    ],
  ],
  [
    [
      'green-horizon',
      'Yashil ufq',
      'Tabiat silueti va ekologik hikoya uchun katta sahnalar.',
      'yashil green ekologiya',
    ],
    [
      'climate-action',
      'Iqlim va harakat',
      'Sabab, ta’sir va yechimlarni alohida ko‘rsating.',
      'iqlim climate global',
    ],
    [
      'sustainable-future',
      'Barqaror kelajak',
      'Aylana jarayonlar va barqaror rivojlanish kompozitsiyasi.',
      'barqaror sustainability sdg',
    ],
    [
      'earth-notes',
      'Yer daftari',
      'Ekotizim kuzatuvlari uchun tabiiy editorial uslub.',
      'yer tabiat earth nature',
    ],
  ],
  [
    [
      'geometry-lab',
      'Geometriya laboratoriyasi',
      'Geometrik jismlar va ravshan matematik izohlar.',
      'geometriya geometry',
    ],
    [
      'algebra-grid',
      'Algebra maydoni',
      'Koordinata to‘ri va formula uchun ajratilgan maydonlar.',
      'algebra formula tenglama',
    ],
    [
      'statistical-lens',
      'Statistik nigoh',
      'Taqqoslash va ma’lumot izohlariga yo‘naltirilgan dizayn.',
      'statistika statistics ehtimol probability',
    ],
    [
      'proof-notebook',
      'Isbot daftari',
      'Masala, yechim va tekshirish uchun qat’iy mantiqiy tartib.',
      'matematika math isbot proof',
    ],
  ],
  [
    [
      'molecular-world',
      'Molekulalar olami',
      'Atom tugunlari va kimyoviy bog‘lanish motivlari.',
      'molekula molecular kimyo',
    ],
    [
      'reaction-lab',
      'Reaksiya laboratoriyasi',
      'Jarayon va shartlarni bosqichlarda tushuntiring.',
      'reaksiya reaction tajriba',
    ],
    [
      'organic-pattern',
      'Organik tuzilma',
      'Organik bog‘lanishlar va aniq izoh bloklari.',
      'organik organic chemistry',
    ],
    [
      'material-science',
      'Moddalar va xossalar',
      'Tarkib, xossa va qo‘llanish uchun ilmiy kompozitsiya.',
      'modda material element',
    ],
  ],
  [
    [
      'cosmic-orbit',
      'Koinot orbitasi',
      'Orbital chiziqlar va keng astronomik sarlavhalar.',
      'koinot kosmos space astronomiya',
    ],
    [
      'energy-field',
      'Energiya maydoni',
      'To‘lqinlar, harakat va tajriba uchun jonli maket.',
      'energiya energy fizika',
    ],
    [
      'quantum-notes',
      'Kvant daftari',
      'Tungi fon, atom motivi va fokuslangan tushuntirish.',
      'kvant quantum atom',
    ],
    [
      'mechanics-workshop',
      'Mexanika ustaxonasi',
      'Tuzilma va kuchlarni tartibli sahnalarda ko‘rsating.',
      'mexanika mechanics physics',
    ],
  ],
  [
    [
      'literary-journal',
      'Adabiy jurnal',
      'Katta serif sarlavha, izoh va ochiq kitob motivi.',
      'adabiyot literature navoiy',
    ],
    [
      'language-studio',
      'Til ustaxonasi',
      'Misollar va qoida uchun rangli tahrirlanadigan kartalar.',
      'til english grammar language',
    ],
    [
      'poetry-pages',
      'She’riyat sahifalari',
      'Iqtibos va talqin uchun sokin, keng kompozitsiya.',
      'she r sher poetry asar',
    ],
    [
      'story-structure',
      'Hikoya tuzilishi',
      'Voqea, qahramon va talqinni izchil ko‘rsating.',
      'hikoya story roman narrative',
    ],
  ],
  [
    [
      'urban-blueprint',
      'Shahar chizmasi',
      'Reja to‘ri va arxitektura ritmi bilan loyiha taqdimoti.',
      'shahar urban architecture',
    ],
    [
      'architectural-form',
      'Me’moriy shakl',
      'Masshtab, shakl va bo‘shliqni markazga olib chiqing.',
      'arxitektura architecture forma',
    ],
    [
      'interior-lines',
      'Interyer chiziqlari',
      'Issiq material palitrasi va sokin chiziqli maket.',
      'interyer interior design',
    ],
    [
      'structural-vision',
      'Tuzilmaviy nigoh',
      'Qurilish va konstruksiya uchun aniq ustunlar.',
      'qurilish building construction',
    ],
  ],
  [
    [
      'creative-collage',
      'Ijodiy kollaj',
      'Yirik shakllar, noodatiy ritm va yorqin sarlavhalar.',
      'ijod creative art design',
    ],
    [
      'gallery-exhibition',
      'Galereya',
      'Asar va talqinga joy beradigan tahririy kompozitsiya.',
      'sanat art galereya exhibition',
    ],
    [
      'music-rhythm',
      'Musiqa ritmi',
      'Ritm bloklari va dinamik sahna kompozitsiyasi.',
      'musiqa music rhythm',
    ],
    [
      'design-manifesto',
      'Dizayn manifesti',
      'Qalin tipografika va dadil geometrik aksentlar.',
      'dizayn design portfolio',
    ],
  ],
];

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  categoryName: string;
  keywords: readonly string[];
  sections: readonly string[];
  layout: number;
  variant: number;
  motif: number;
  background: string;
  ink: string;
  accent: string;
  soft: string;
  surface: string;
  font: 'Arial' | 'Georgia' | 'Courier New';
}
export const templateCatalog: readonly TemplateDefinition[] = templateCategories.flatMap(
  (category, c) =>
    entries[c].map(([id, name, description, keywords], v) => ({
      id,
      name,
      description,
      category: category.id,
      categoryName: category.name,
      keywords: [...category.keywords, ...keywords.split(' ')],
      sections: category.sections,
      layout: id === 'code-studio' ? 9 : (c * 5 + v * 3) % 16,
      variant: v,
      motif: c,
      background:
        id === 'code-studio'
          ? '#152235'
          : v === 1
            ? category.ink
            : v === 2
              ? category.soft
              : v === 3
                ? '#f6f2e9'
                : '#fffdf8',
      ink: id === 'code-studio' ? '#eef2ff' : v === 1 ? '#fffdf5' : category.ink,
      accent: id === 'code-studio' ? '#96c2fb' : v === 1 ? category.soft : category.accent,
      soft: v === 1 ? category.accent : category.soft,
      surface: v === 1 ? category.accent : '#ffffff',
      font:
        v === 3
          ? 'Georgia'
          : v === 1 && ['technology', 'mathematics', 'physics'].includes(category.id)
            ? 'Courier New'
            : 'Arial',
    })),
);
export const defaultTemplate = templateCatalog[0];
export function findTemplate(id: string) {
  return templateCatalog.find((t) => t.id === id);
}
export function normalizeTopic(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize('NFKC')
    .replace(/[ʻ‘’'`´ʼ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
function matches(topic: string, keyword: string) {
  const k = normalizeTopic(keyword);
  if (!k) return false;
  if (k.includes(' ')) return ` ${topic} `.includes(` ${k} `);
  return topic.split(' ').some((word) => (k.length >= 4 ? word.startsWith(k) : word === k));
}
export function recommendTemplates(topic: string, limit = 6) {
  const normalized = normalizeTopic(topic);
  return templateCatalog
    .map((template, index) => ({
      template,
      score: normalized
        ? template.keywords.reduce(
            (score, word) => score + (matches(normalized, word) ? (word.length > 4 ? 5 : 2) : 0),
            0,
          )
        : 0,
      index,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit);
}
