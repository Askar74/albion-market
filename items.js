// Curated subset of popular Albion Online items for fast searching.
// Full game has 7000+ items; this covers the most-traded ones.
// Item IDs follow the form T<tier>_<TYPE>[_LEVEL][@<enchant>]
// You can also paste any raw ID into the search box (e.g. T6_BAG@2).
window.ALBION_ITEMS = [
  // Bags
  { id: "T2_BAG",  name: "Novice's Bag" },
  { id: "T3_BAG",  name: "Journeyman's Bag" },
  { id: "T4_BAG",  name: "Adept's Bag" },
  { id: "T5_BAG",  name: "Expert's Bag" },
  { id: "T6_BAG",  name: "Master's Bag" },
  { id: "T7_BAG",  name: "Grandmaster's Bag" },
  { id: "T8_BAG",  name: "Elder's Bag" },

  // Capes
  { id: "T4_CAPE", name: "Adept's Cape" },
  { id: "T5_CAPE", name: "Expert's Cape" },
  { id: "T6_CAPE", name: "Master's Cape" },
  { id: "T7_CAPE", name: "Grandmaster's Cape" },
  { id: "T8_CAPE", name: "Elder's Cape" },
  { id: "T4_CAPEITEM_FW_LYMHURST", name: "Adept's Lymhurst Cape" },
  { id: "T4_CAPEITEM_FW_BRIDGEWATCH", name: "Adept's Bridgewatch Cape" },
  { id: "T4_CAPEITEM_FW_MARTLOCK", name: "Adept's Martlock Cape" },
  { id: "T4_CAPEITEM_FW_FORTSTERLING", name: "Adept's Fort Sterling Cape" },
  { id: "T4_CAPEITEM_FW_THETFORD", name: "Adept's Thetford Cape" },
  { id: "T4_CAPEITEM_FW_CAERLEON", name: "Adept's Caerleon Cape" },

  // Resources - raw
  { id: "T4_WOOD",  name: "Adept's Rough Logs" },
  { id: "T5_WOOD",  name: "Expert's Rugged Logs" },
  { id: "T6_WOOD",  name: "Master's Cursed Logs" },
  { id: "T7_WOOD",  name: "Grandmaster's Bloodoak Logs" },
  { id: "T8_WOOD",  name: "Elder's Ashenbark Logs" },

  { id: "T4_ORE",   name: "Adept's Iron Ore" },
  { id: "T5_ORE",   name: "Expert's Titanium Ore" },
  { id: "T6_ORE",   name: "Master's Runite Ore" },
  { id: "T7_ORE",   name: "Grandmaster's Meteorite Ore" },
  { id: "T8_ORE",   name: "Elder's Adamantium Ore" },

  { id: "T4_FIBER", name: "Adept's Cotton" },
  { id: "T5_FIBER", name: "Expert's Flax" },
  { id: "T6_FIBER", name: "Master's Hemp" },
  { id: "T7_FIBER", name: "Grandmaster's Skyflower" },
  { id: "T8_FIBER", name: "Elder's Redleaf Cotton" },

  { id: "T4_HIDE",  name: "Adept's Medium Hide" },
  { id: "T5_HIDE",  name: "Expert's Heavy Hide" },
  { id: "T6_HIDE",  name: "Master's Robust Hide" },
  { id: "T7_HIDE",  name: "Grandmaster's Thick Hide" },
  { id: "T8_HIDE",  name: "Elder's Resilient Hide" },

  { id: "T4_ROCK",  name: "Adept's Limestone" },
  { id: "T5_ROCK",  name: "Expert's Travertine" },
  { id: "T6_ROCK",  name: "Master's Granite" },
  { id: "T7_ROCK",  name: "Grandmaster's Slate" },
  { id: "T8_ROCK",  name: "Elder's Basalt" },

  // Resources - refined
  { id: "T4_PLANKS", name: "Adept's Planks" },
  { id: "T5_PLANKS", name: "Expert's Planks" },
  { id: "T6_PLANKS", name: "Master's Planks" },
  { id: "T7_PLANKS", name: "Grandmaster's Planks" },
  { id: "T8_PLANKS", name: "Elder's Planks" },

  { id: "T4_METALBAR", name: "Adept's Steel Bar" },
  { id: "T5_METALBAR", name: "Expert's Titanium Steel Bar" },
  { id: "T6_METALBAR", name: "Master's Runite Steel Bar" },
  { id: "T7_METALBAR", name: "Grandmaster's Meteorite Steel Bar" },
  { id: "T8_METALBAR", name: "Elder's Adamantium Steel Bar" },

  { id: "T4_CLOTH", name: "Adept's Cloth" },
  { id: "T5_CLOTH", name: "Expert's Cloth" },
  { id: "T6_CLOTH", name: "Master's Cloth" },
  { id: "T7_CLOTH", name: "Grandmaster's Cloth" },
  { id: "T8_CLOTH", name: "Elder's Cloth" },

  { id: "T4_LEATHER", name: "Adept's Leather" },
  { id: "T5_LEATHER", name: "Expert's Leather" },
  { id: "T6_LEATHER", name: "Master's Leather" },
  { id: "T7_LEATHER", name: "Grandmaster's Leather" },
  { id: "T8_LEATHER", name: "Elder's Leather" },

  { id: "T4_STONEBLOCK", name: "Adept's Block" },
  { id: "T5_STONEBLOCK", name: "Expert's Block" },
  { id: "T6_STONEBLOCK", name: "Master's Block" },
  { id: "T7_STONEBLOCK", name: "Grandmaster's Block" },
  { id: "T8_STONEBLOCK", name: "Elder's Block" },

  // Weapons - swords / axes / hammers / maces / spears
  { id: "T4_MAIN_SWORD", name: "Adept's Broadsword" },
  { id: "T5_MAIN_SWORD", name: "Expert's Broadsword" },
  { id: "T6_MAIN_SWORD", name: "Master's Broadsword" },
  { id: "T7_MAIN_SWORD", name: "Grandmaster's Broadsword" },
  { id: "T8_MAIN_SWORD", name: "Elder's Broadsword" },

  { id: "T4_2H_CLAYMORE", name: "Adept's Claymore" },
  { id: "T6_2H_CLAYMORE", name: "Master's Claymore" },
  { id: "T8_2H_CLAYMORE", name: "Elder's Claymore" },

  { id: "T4_2H_AXE",  name: "Adept's Greataxe" },
  { id: "T6_2H_AXE",  name: "Master's Greataxe" },
  { id: "T8_2H_AXE",  name: "Elder's Greataxe" },

  { id: "T4_2H_HAMMER", name: "Adept's Great Hammer" },
  { id: "T6_2H_HAMMER", name: "Master's Great Hammer" },
  { id: "T8_2H_HAMMER", name: "Elder's Great Hammer" },

  { id: "T4_2H_SPEAR",  name: "Adept's Pike" },
  { id: "T6_2H_SPEAR",  name: "Master's Pike" },
  { id: "T8_2H_SPEAR",  name: "Elder's Pike" },

  { id: "T4_2H_BOW",  name: "Adept's Bow" },
  { id: "T6_2H_BOW",  name: "Master's Bow" },
  { id: "T8_2H_BOW",  name: "Elder's Bow" },

  { id: "T4_2H_CROSSBOWLARGE", name: "Adept's Heavy Crossbow" },
  { id: "T6_2H_CROSSBOWLARGE", name: "Master's Heavy Crossbow" },
  { id: "T8_2H_CROSSBOWLARGE", name: "Elder's Heavy Crossbow" },

  { id: "T4_MAIN_FIRESTAFF", name: "Adept's Fire Staff" },
  { id: "T6_MAIN_FIRESTAFF", name: "Master's Fire Staff" },
  { id: "T8_MAIN_FIRESTAFF", name: "Elder's Fire Staff" },

  { id: "T4_2H_HOLYSTAFF", name: "Adept's Holy Staff" },
  { id: "T6_2H_HOLYSTAFF", name: "Master's Holy Staff" },
  { id: "T8_2H_HOLYSTAFF", name: "Elder's Holy Staff" },

  { id: "T4_MAIN_NATURESTAFF", name: "Adept's Nature Staff" },
  { id: "T6_MAIN_NATURESTAFF", name: "Master's Nature Staff" },
  { id: "T8_MAIN_NATURESTAFF", name: "Elder's Nature Staff" },

  { id: "T4_MAIN_ARCANESTAFF", name: "Adept's Arcane Staff" },
  { id: "T6_MAIN_ARCANESTAFF", name: "Master's Arcane Staff" },
  { id: "T8_MAIN_ARCANESTAFF", name: "Elder's Arcane Staff" },

  // Armor (head/chest/feet) — plate, leather, cloth — adept set
  { id: "T4_HEAD_PLATE_SET1",  name: "Adept's Soldier Helmet" },
  { id: "T4_ARMOR_PLATE_SET1", name: "Adept's Soldier Armor" },
  { id: "T4_SHOES_PLATE_SET1", name: "Adept's Soldier Boots" },
  { id: "T6_HEAD_PLATE_SET1",  name: "Master's Soldier Helmet" },
  { id: "T6_ARMOR_PLATE_SET1", name: "Master's Soldier Armor" },
  { id: "T6_SHOES_PLATE_SET1", name: "Master's Soldier Boots" },
  { id: "T8_HEAD_PLATE_SET1",  name: "Elder's Soldier Helmet" },
  { id: "T8_ARMOR_PLATE_SET1", name: "Elder's Soldier Armor" },
  { id: "T8_SHOES_PLATE_SET1", name: "Elder's Soldier Boots" },

  { id: "T4_HEAD_LEATHER_SET1",  name: "Adept's Mercenary Hood" },
  { id: "T4_ARMOR_LEATHER_SET1", name: "Adept's Mercenary Jacket" },
  { id: "T4_SHOES_LEATHER_SET1", name: "Adept's Mercenary Shoes" },
  { id: "T6_HEAD_LEATHER_SET1",  name: "Master's Mercenary Hood" },
  { id: "T6_ARMOR_LEATHER_SET1", name: "Master's Mercenary Jacket" },
  { id: "T6_SHOES_LEATHER_SET1", name: "Master's Mercenary Shoes" },
  { id: "T8_HEAD_LEATHER_SET1",  name: "Elder's Mercenary Hood" },
  { id: "T8_ARMOR_LEATHER_SET1", name: "Elder's Mercenary Jacket" },
  { id: "T8_SHOES_LEATHER_SET1", name: "Elder's Mercenary Shoes" },

  { id: "T4_HEAD_CLOTH_SET1",  name: "Adept's Scholar Cowl" },
  { id: "T4_ARMOR_CLOTH_SET1", name: "Adept's Scholar Robe" },
  { id: "T4_SHOES_CLOTH_SET1", name: "Adept's Scholar Sandals" },
  { id: "T6_HEAD_CLOTH_SET1",  name: "Master's Scholar Cowl" },
  { id: "T6_ARMOR_CLOTH_SET1", name: "Master's Scholar Robe" },
  { id: "T6_SHOES_CLOTH_SET1", name: "Master's Scholar Sandals" },
  { id: "T8_HEAD_CLOTH_SET1",  name: "Elder's Scholar Cowl" },
  { id: "T8_ARMOR_CLOTH_SET1", name: "Elder's Scholar Robe" },
  { id: "T8_SHOES_CLOTH_SET1", name: "Elder's Scholar Sandals" },

  // Mounts
  { id: "T3_MOUNT_OX",      name: "Journeyman's Ox" },
  { id: "T5_MOUNT_OX",      name: "Expert's Ox" },
  { id: "T8_MOUNT_OX",      name: "Elder's Transport Ox" },
  { id: "T3_MOUNT_HORSE",   name: "Journeyman's Riding Horse" },
  { id: "T5_MOUNT_HORSE",   name: "Expert's Swiftclaw" },
  { id: "T6_MOUNT_HORSE",   name: "Master's Armored Horse" },
  { id: "T8_MOUNT_HORSE",   name: "Elder's Battle Mount" },
  { id: "T4_MOUNT_DIREWOLF", name: "Adept's Direwolf" },
  { id: "T8_MOUNT_MAMMOTH_TRANSPORT", name: "Elder's Transport Mammoth" },

  // Consumables
  { id: "T4_MEAL_OMELETTE", name: "Adept's Omelette" },
  { id: "T6_MEAL_OMELETTE", name: "Master's Omelette" },
  { id: "T8_MEAL_OMELETTE", name: "Elder's Omelette" },
  { id: "T4_MEAL_SALAD",    name: "Adept's Salad" },
  { id: "T6_MEAL_SALAD",    name: "Master's Salad" },
  { id: "T8_MEAL_SALAD",    name: "Elder's Salad" },
  { id: "T4_MEAL_SOUP",     name: "Adept's Beef Stew" },
  { id: "T6_MEAL_SOUP",     name: "Master's Beef Stew" },
  { id: "T8_MEAL_SOUP",     name: "Elder's Beef Stew" },
  { id: "T4_MEAL_PIE",      name: "Adept's Pork Pie" },
  { id: "T6_MEAL_PIE",      name: "Master's Pork Pie" },
  { id: "T8_MEAL_PIE",      name: "Elder's Pork Pie" },

  { id: "T4_POTION_HEAL",       name: "Adept's Healing Potion" },
  { id: "T6_POTION_HEAL",       name: "Master's Healing Potion" },
  { id: "T8_POTION_HEAL",       name: "Elder's Major Healing Potion" },
  { id: "T4_POTION_STONESKIN",  name: "Adept's Resistance Potion" },
  { id: "T6_POTION_STONESKIN",  name: "Master's Resistance Potion" },
  { id: "T8_POTION_STONESKIN",  name: "Elder's Resistance Potion" },
  { id: "T4_POTION_ENERGY",     name: "Adept's Energy Potion" },
  { id: "T6_POTION_ENERGY",     name: "Master's Energy Potion" },
  { id: "T4_POTION_GIGANTIFY",  name: "Adept's Gigantify Potion" },
  { id: "T6_POTION_GIGANTIFY",  name: "Master's Gigantify Potion" },
  { id: "T4_POTION_INVISIBILITY", name: "Adept's Invisibility Potion" },
  { id: "T6_POTION_INVISIBILITY", name: "Master's Invisibility Potion" },

  // Special / silver-makers
  { id: "T4_FARM_CARROT_SEED", name: "Carrot Seed" },
  { id: "T5_FARM_BEAN_SEED",   name: "Bean Seed" },
  { id: "T6_FARM_WHEAT_SEED",  name: "Wheat Seed" },
  { id: "T7_FARM_TURNIP_SEED", name: "Turnip Seed" },
  { id: "T8_FARM_CABBAGE_SEED", name: "Cabbage Seed" },

  { id: "T4_FARM_CARROT", name: "Carrot" },
  { id: "T5_FARM_BEAN",   name: "Bean" },
  { id: "T6_FARM_WHEAT",  name: "Wheat" },
  { id: "T7_FARM_TURNIP", name: "Turnip" },
  { id: "T8_FARM_CABBAGE", name: "Cabbage" },

  { id: "T1_CARROT", name: "Carrot (raw)" },
  { id: "T2_BEAN",   name: "Bean (raw)" },
  { id: "T3_WHEAT",  name: "Wheat (raw)" },

  { id: "QUESTITEM_TOKEN_AVALON", name: "Avalonian Energy" },
  { id: "T4_SKILLBOOK_STANDARD", name: "Adept's Tome of Insight" },
  { id: "T8_SKILLBOOK_STANDARD", name: "Elder's Tome of Insight" },
];
