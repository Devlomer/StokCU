// StokCU — Product Database & Configuration
// All 36 minibar products organized in 5 categories with default box quantities

export const STORAGE_KEY = 'stokcu';

export const CATEGORIES = [
  {
    id: 'alkol',
    name: 'Alkollü İçecekler',
    emoji: '🍺',
    products: [
      { name: 'BIRA SISE EFES 33CL', boxQty: 24 },
      { name: 'BIRA SISE HEINEKEN 33CL', boxQty: 24 },
      { name: 'SARAP R SUVLA CABERNET SAUVIGNON KARASAKIZ 75CL', boxQty: 6 },
      { name: 'SARAP RY SARTORI BLUSH 75 CL', boxQty: 6 }
    ]
  },
  {
    id: 'soft',
    name: 'Soft İçecekler',
    emoji: '🥤',
    products: [
      { name: 'COCA COLA SISE CAM 25CL - ORIGINAL', boxQty: 24 },
      { name: 'COCA COLA SISE CAM 25CL - ZERO', boxQty: 24 },
      { name: 'FANTA KUTU 33CL', boxQty: 24 },
      { name: 'SPRITE KUTU 33CL', boxQty: 24 },
      { name: 'FUSE TEA KUTU 33CL - SEFTALI', boxQty: 24 },
      { name: 'GAZOZ BODRUM MANDALINA 25CL', boxQty: 24 },
      { name: 'SODA SAN PELLEGRINO 25CL - SADE', boxQty: 24 },
      { name: 'SUT 20CL - SADE', boxQty: 24 },
      { name: 'SU CAM 33CL', boxQty: 24 },
      { name: 'SU CAM 75CL', boxQty: 12 }
    ]
  },
  {
    id: 'sicak',
    name: 'Sıcak İçecekler',
    emoji: '☕',
    products: [
      { name: 'CAY POSET MELEZ TEA - BLACK 2GR', boxQty: 20 },
      { name: 'CAY POSET MELEZ TEA - CAMOMILE 2GR', boxQty: 20 },
      { name: 'CAY POSET MELEZ TEA - GREEN 2GR', boxQty: 20 },
      { name: 'CAY POSET MELEZ TEA - WAKE UP 2GR', boxQty: 20 },
      { name: 'KAHVE NESPRESSO KAPSUL 5GR', boxQty: 50 }
    ]
  },
  {
    id: 'kuru',
    name: 'Kuru Gıda & Atıştırmalıklar',
    emoji: '🍫',
    products: [
      { name: 'MINIBAR BAR PROTEIN BAHS 60GR', boxQty: 12 },
      { name: 'MINIBAR BISKUVI LOTUS BISCOFF 125GR', boxQty: 10 },
      { name: 'MINIBAR BISKUVI OREO MINI BARDAK 115GR', boxQty: 12 },
      { name: 'MINIBAR CIKOLATA JOVIA 40GR', boxQty: 20 },
      { name: 'MINIBAR CIKOLATA RAFAELLO 40GR', boxQty: 16 },
      { name: 'MINIBAR CIPS BREAD UNISTANBUL 110GR', boxQty: 15 },
      { name: 'MINIBAR CIPS MASTER POTATO 60GR', boxQty: 14 },
      { name: 'MINIBAR GOFRET NUTELLA B-READY 22GR', boxQty: 24 },
      { name: 'MINIBAR KURABIYE TAFE BARAZEK 55GR', boxQty: 12 },
      { name: 'MINIBAR KURABIYE TAFE BISCOTTI YABAN MERSINI BADEM 60GR', boxQty: 12 },
      { name: 'MINIBAR KURABIYE TAFE PURE BUTTER 50GR', boxQty: 12 },
      { name: 'MINIBAR KURUYEMIS BADEM 50GR (Logolu)', boxQty: 30 },
      { name: 'MINIBAR KURUYEMIS FINDIK 50GR (Logolu)', boxQty: 30 },
      { name: 'MINIBAR SANDWICH WASA 30GR', boxQty: 20 }
    ]
  },
  {
    id: 'destek',
    name: 'Destekleyici Ürünler',
    emoji: '🍬',
    products: [
      { name: 'SEKER STICK - BEYAZ (Logolu)', boxQty: 500 },
      { name: 'SEKER STICK - ESMER (Logolu)', boxQty: 500 },
      { name: 'SEKER STICK - SAKARIN (Logolu)', boxQty: 500 }
    ]
  }
];
