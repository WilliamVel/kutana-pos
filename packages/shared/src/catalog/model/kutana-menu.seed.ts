import { createCategory, type Category } from "./category.js";
import { createProduct, type Product, type PourSize } from "./product.js";

export const KUTANA_MENU_CATEGORY_IDS = {
  cervezas: "11111111-1111-4111-8111-111111111111",
  gaseosas: "22222222-2222-4222-8222-222222222222",
  bebidas: "33333333-3333-4333-8333-333333333333",
  entradas: "44444444-4444-4444-8444-444444444444",
  pizzas: "55555555-5555-4555-8555-555555555555",
  especialidades: "66666666-6666-4666-8666-666666666666",
} as const;

export const KUTANA_MENU_CATEGORIES: readonly Category[] = [
  createCategory({ id: KUTANA_MENU_CATEGORY_IDS.cervezas, name: "Cervezas", sortOrder: 1 }),
  createCategory({ id: KUTANA_MENU_CATEGORY_IDS.gaseosas, name: "Gaseosas", sortOrder: 2 }),
  createCategory({ id: KUTANA_MENU_CATEGORY_IDS.bebidas, name: "Bebidas", sortOrder: 3 }),
  createCategory({ id: KUTANA_MENU_CATEGORY_IDS.entradas, name: "Entradas", sortOrder: 4 }),
  createCategory({ id: KUTANA_MENU_CATEGORY_IDS.pizzas, name: "Pizzas", sortOrder: 5 }),
  createCategory({
    id: KUTANA_MENU_CATEGORY_IDS.especialidades,
    name: "Especialidades",
    sortOrder: 6,
  }),
];

const TAX_RATE_BP = 1200;
const POUR_PRICES: ReadonlyArray<{ readonly size: PourSize; readonly priceCents: number }> = [
  { size: 330, priceCents: 300 },
  { size: 500, priceCents: 500 },
  { size: 1000, priceCents: 800 },
];

const beers = [
  {
    slug: "blonde-ale",
    baseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa",
    name: "Blonde Ale",
    abv: "5.5%",
    description:
      "¡Mi suquita! Una cerveza artesanal con maltas y lúpulos seleccionados que proporcionan una experiencia sensorial refrescante, que desprende notas aromáticas que recuerdan a maracuyá.",
  },
  {
    slug: "irish-red-ale",
    baseId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb",
    name: "Irish Red Ale",
    abv: "6%",
    description:
      "¡Colorada! Sabores sutiles equilibrados con la maltosidad característica de este estilo, seguidos de toques iniciales de toffee o caramelo suave, una textura granulosa y a galleta en el paladar, culminando en una sequedad tostada delicada.",
  },
  {
    slug: "oatmeal-stout",
    baseId: "cccccccc-cccc-4ccc-8ccc-ccccccccccc",
    name: "Oatmeal Stout",
    abv: "7%",
    description:
      "¡Negrita! Una cerveza artesanal de carácter distintivo, con tonalidades que oscilan entre el marrón medio y el negro profundo. Su espuma, densa y cremosa, destaca sutiles notas de café y cacao, proporcionando una experiencia sensorial única.",
  },
  {
    slug: "west-coast-ipa",
    baseId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd",
    name: "West Coast IPA",
    abv: "6.5%",
    description:
      "¡Mamahuaca! Una fiesta de lúpulos americanos Old School. Cítrica, afrutada, rabiosa, seca y amarga.",
  },
  {
    slug: "kombucha",
    baseId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee",
    name: "Kombucha",
    abv: "0%",
    description:
      "¡Fresquita! Agua filtrada, azúcar orgánica fermentada, cultivo vivo de kombucha y sabores naturales como frutas, hierbas y especias. (cero alcohol)",
  },
  {
    slug: "rye-ipa",
    baseId: "ffffffff-ffff-4fff-8fff-fffffffffff",
    name: "Rye IPA",
    abv: "8%",
    description:
      "¡Taita! Cerveza lupulada y amarga, con lúpulos americanos y del Nuevo Mundo, con una base de malta de centeno. Fermentación limpia, final seco, dejando espacio para que resalte la malta y el lúpulo.",
  },
] as const;

function productId(baseId: string, index: number): string {
  return `${baseId}${index}`;
}

const beerProducts: Product[] = beers.flatMap((beer) =>
  POUR_PRICES.map(({ size, priceCents }, index) =>
    createProduct({
      id: productId(beer.baseId, index + 1),
      sku: `MENU-${beer.slug.toUpperCase().replaceAll("-", "-")}-${size}`,
      name: `${beer.name} ${size}ml`,
      categoryId: KUTANA_MENU_CATEGORY_IDS.cervezas,
      priceCents,
      taxRateBp: TAX_RATE_BP,
      description: `${beer.description} ABV ${beer.abv}`,
      stockKind: "volume",
      pourSizeMl: size,
      stockItemId: null,
    }),
  ),
);

const unitProducts: Product[] = [
  ["77777777-7777-4777-8777-777777777771", "MENU-COCA-COLA", "Coca-Cola", "gaseosas", 100, null],
  ["77777777-7777-4777-8777-777777777772", "MENU-FIORAVANTI", "Fioravanti", "gaseosas", 100, null],
  ["77777777-7777-4777-8777-777777777773", "MENU-FANTA", "Fanta", "gaseosas", 100, null],
  ["77777777-7777-4777-8777-777777777774", "MENU-INCA-KOLA", "Inca Kola", "gaseosas", 100, null],
  ["88888888-8888-4888-8888-888888888881", "MENU-TE", "Té", "bebidas", 100, null],
  ["88888888-8888-4888-8888-888888888882", "MENU-CAFE", "Café", "bebidas", 100, null],
  [
    "88888888-8888-4888-8888-888888888883",
    "MENU-AGUA-SIN-GAS",
    "Agua sin gas",
    "bebidas",
    100,
    null,
  ],
  [
    "99999999-9999-4999-8999-999999999991",
    "MENU-PAPAS-FRANCESAS-MAYO",
    "Papas a la Francesa con Mayonesa Casera",
    "entradas",
    200,
    "Crujientes papas fritas con mayonesa casera y vienesa.",
  ],
  [
    "99999999-9999-4999-8999-999999999992",
    "MENU-NACHOS-GUACAMOLE",
    "Nachos con Guacamole Fresco",
    "entradas",
    300,
    "Totopos crujientes con guacamole fresco.",
  ],
  [
    "99999999-9999-4999-8999-999999999993",
    "MENU-NACHOS-QUESO-TOCINO",
    "Nachos Gratinados con Queso y Tocino",
    "entradas",
    300,
    "Totopos con queso mozzarella fundido y tocino crujiente.",
  ],
  [
    "99999999-9999-4999-8999-999999999994",
    "MENU-PAPAS-RUSTICAS-GRATINADAS",
    "Papas Fritas Rústicas Gratinadas",
    "entradas",
    350,
    "Papas fritas con jamón, queso mozzarella, cebollín y cebollas encurtidas.",
  ],
  [
    "99999999-9999-4999-8999-999999999995",
    "MENU-ENSALADA-CESAR-POLLO",
    "Ensalada César con Pollo",
    "entradas",
    400,
    "Lechuga romana, pollo grillado, crutones y aderezo César.",
  ],
  [
    "12121212-1212-4121-8121-121212121211",
    "MENU-PIZZA-MARGARITA",
    "Pizza Margarita",
    "pizzas",
    650,
    "Salsa de tomate, queso mozzarella, albahaca fresca y un toque de orégano.",
  ],
  [
    "12121212-1212-4121-8121-121212121212",
    "MENU-PIZZA-JAMON-QUESO",
    "Pizza Jamón y Queso",
    "pizzas",
    700,
    "Salsa de tomate, queso mozzarella, jamón y un toque de orégano.",
  ],
  [
    "13131313-1313-4131-8131-131313131311",
    "MENU-HAMBURGUESA-CLASICA",
    "Hamburguesa Clásica",
    "especialidades",
    350,
    "Lechuga, tomate, carne de 180g y queso.",
  ],
  [
    "13131313-1313-4131-8131-131313131312",
    "MENU-HAMBURGUESA-ESPECIAL",
    "Hamburguesa Especial",
    "especialidades",
    450,
    "Lechuga, tomate, carne de 180g, queso, champiñones, huevo frito y tocino.",
  ],
  [
    "13131313-1313-4131-8131-131313131313",
    "MENU-ALITAS-BBQ-5",
    "Alitas BBQ (5 unidades)",
    "especialidades",
    500,
    "Cinco alitas crujientes con salsa BBQ, acompañadas de papas fritas.",
  ],
].map(([id, sku, name, categoryKey, priceCents, description]) =>
  createProduct({
    id: id as string,
    sku: sku as string,
    name: name as string,
    categoryId: KUTANA_MENU_CATEGORY_IDS[categoryKey as keyof typeof KUTANA_MENU_CATEGORY_IDS],
    priceCents: priceCents as number,
    taxRateBp: TAX_RATE_BP,
    description: description as string | null,
    stockKind: "unit",
    stockItemId: null,
  }),
);

export const KUTANA_MENU_PRODUCTS: readonly Product[] = [...beerProducts, ...unitProducts];
