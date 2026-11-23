export const CELL_IMAGES: Record<number, string> = {
  1: '/cells/cell_01_rozhdenie.png',
  2: '/cells/cell_02_illyuziya.png',
  3: '/cells/cell_03_gnev.png',
  4: '/cells/cell_04_zhadnost.png',
  5: '/cells/cell_05_strakh.png',
  6: '/cells/cell_06_len.png',
  7: '/cells/cell_07_gordost.png',
  8: '/cells/cell_08_distsiplina.png',
  9: '/cells/cell_09_otvetstvennost.png',
  10: '/cells/cell_10_sluzhenie.png',
  11: '/cells/cell_11_razvlecheniya.png',
  12: '/cells/cell_12_zavist.png',
  13: '/cells/cell_13_nichtozhnost.png',
  14: '/cells/cell_14_astralnyy_plan.png',
  15: '/cells/cell_15_plan_fantazii.png',
  16: '/cells/cell_16_revnost.png',
  17: '/cells/cell_17_sostradanie.png',
  18: '/cells/cell_18_plan_radosti.png',
  19: '/cells/cell_19_plan_karmy.png',
  20: '/cells/cell_20_blagotvoritelnost.png',
  21: '/cells/cell_21_prisutstvie.png',
  22: '/cells/cell_22_chestnost.png',
  23: '/cells/cell_23_umerennost.png',
  24: '/cells/cell_24_blagodarnost.png',
  25: '/cells/cell_25_proshchenie.png',
  26: '/cells/cell_26_dostoinstvo.png',
  27: '/cells/cell_27_muzhestvo.png',
  28: '/cells/cell_28_terpenie.png',
  29: '/cells/cell_29_doverie.png',
  30: '/cells/cell_30_lyubov.png',
  31: '/cells/cell_31_vernost.png',
  32: '/cells/cell_32_granitsy.png',
  33: '/cells/cell_33_stoykost.png',
  34: '/cells/cell_34_smirenie.png',
  35: '/cells/cell_35_osoznannost.png',
  36: '/cells/cell_36_mudrost.png',
  37: '/cells/cell_37_vernost_puti.png',
  38: '/cells/cell_38_edinstvo.png',
  39: '/cells/cell_39_nasledie.png',
  40: '/cells/cell_40_tsel.png',
  41: '/cells/cell_41_reshimost.png',
  42: '/cells/cell_42_svoboda.png',
  43: '/cells/cell_43_tishina.png',
  44: '/cells/cell_44_samoobladanie.png',
  45: '/cells/cell_45_chest.png',
  46: '/cells/cell_46_shchedrost.png',
  47: '/cells/cell_47_prizvanie.png',
  48: '/cells/cell_48_liderstvo.png',
  49: '/cells/cell_49_sluzhenie_rodu.png',
  50: '/cells/cell_50_smysl.png',
  51: '/cells/cell_51_vera.png',
  52: '/cells/cell_52_pokoy.png',
  53: '/cells/cell_53_prozrenie.png',
  54: '/cells/cell_54_predannost.png',
  55: '/cells/cell_55_masterstvo.png',
  56: '/cells/cell_56_ravnovesie.png',
  57: '/cells/cell_57_zashchita.png',
  58: '/cells/cell_58_sozidanie.png',
  59: '/cells/cell_59_voskhozhdenie.png',
  60: '/cells/cell_60_zavershenie.png',
  61: '/cells/cell_61_obnovlenie.png',
  62: '/cells/cell_62_blagoslovenie.png',
  63: '/cells/cell_63_sozertsanie.png',
  64: '/cells/cell_64_miloserdie.png',
  65: '/cells/cell_65_prinyatie.png',
  66: '/cells/cell_66_vdokhnovenie.png',
  67: '/cells/cell_67_dobrota.png',
  68: '/cells/cell_68_opora.png',
  69: '/cells/cell_69_edinenie.png',
  70: '/cells/cell_70_blagodat.png',
  71: '/cells/cell_71_tselostnost.png',
  72: '/cells/cell_72_istok.png',
};

/**
 * Approved v005 cell symbols. The remaining cells intentionally keep using
 * their legacy artwork until the matching symbol is delivered and reviewed.
 */
export const CELL_ICONS: Record<number, string> = {
  1: '/v005/cell_icons/cell_icon_01.png',
  2: '/v005/cell_icons/cell_icon_02.png',
  3: '/v005/cell_icons/cell_icon_03.png',
  10: '/v005/cell_icons/cell_icon_10.png',
  52: '/v005/cell_icons/cell_icon_52.png',
  68: '/v005/cell_icons/cell_icon_68.png',
};

export function getCellImagePath(cellId: number): string | undefined {
  return CELL_IMAGES[cellId];
}

export function getCellIconPath(cellId: number, highDensity = false): string | undefined {
  const icon = CELL_ICONS[cellId];
  if (!icon || !highDensity) return icon;
  return icon.replace(/\.png$/, '@2x.png');
}
