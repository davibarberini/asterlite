export type LanguageCode = 'en-US' | 'pt-BR';

export const languageStorageKey = 'asteridle.language';

type TranslationKey =
  | 'menu.subtitle'
  | 'menu.subtitleSaved'
  | 'menu.language'
  | 'menu.portuguese'
  | 'menu.english'
  | 'menu.start'
  | 'menu.continue'
  | 'menu.warping'
  | 'hud.money'
  | 'hud.next'
  | 'hud.shipHull'
  | 'hud.currentObjective'
  | 'hud.openZoneMap'
  | 'hud.openSettings'
  | 'hud.idleSystems'
  | 'hud.closeShop'
  | 'hud.openUpgrades'
  | 'hud.shopTabs'
  | 'hud.map'
  | 'nav.upgrades'
  | 'nav.technologies'
  | 'nav.hangar'
  | 'nav.drones'
  | 'nav.skills'
  | 'nav.achievements'
  | 'unit.crystals'
  | 'unit.ranks'
  | 'unit.semiPierce'
  | 'status.offline'
  | 'status.destroyed'
  | 'status.droneReboot'
  | 'status.refineryReduced'
  | 'status.shieldActive'
  | 'status.shieldRecharge'
  | 'status.shieldReady'
  | 'status.survival'
  | 'status.firstBossCountdown'
  | 'status.firstBossDetected'
  | 'status.default'
  | 'goal.installDroneSystems'
  | 'goal.warpForFirstCore'
  | 'goal.defeatGateBoss'
  | 'goal.drawGateBoss'
  | 'goal.collectWarpCrystals'
  | 'goal.cores'
  | 'goal.coreReady'
  | 'goal.bossActive'
  | 'goal.asteroids'
  | 'goal.crystals'
  | 'shop.upgradesKicker'
  | 'shop.shipCore'
  | 'shop.shotDamage'
  | 'shop.fireRate'
  | 'shop.hull'
  | 'shop.income'
  | 'shop.skillsTitle'
  | 'shop.skillsCopy'
  | 'shop.skillsStatCrystals'
  | 'shop.skillsStatTalents'
  | 'shop.skillsStatSemiPierce'
  | 'shop.skillsStatRefinery'
  | 'shop.skillsActionTitle'
  | 'shop.skillsActionMeta'
  | 'shop.skillsActionLabel'
  | 'shop.level'
  | 'shop.max'
  | 'shop.damage'
  | 'shop.perSecond'
  | 'shop.warpReset'
  | 'shop.gainCores'
  | 'shop.resetRun'
  | 'shop.notReady'
  | 'shop.crystals'
  | 'shop.availableAfter'
  | 'shop.route'
  | 'shop.owned'
  | 'shop.nextCore'
  | 'shop.reachZone'
  | 'shop.unlockNext'
  | 'shop.bankCores'
  | 'shop.defeatBosses'
  | 'shop.collectCrystals'
  | 'settings.audio'
  | 'settings.sound'
  | 'settings.saveData'
  | 'settings.reset'
  | 'settings.resetCopy'
  | 'settings.resetAll'
  | 'settings.confirmReset'
  | 'settings.resetDone';

const translations: Record<LanguageCode, Record<TranslationKey, string>> = {
  'en-US': {
    'menu.subtitle': 'Choose your language, then jump into the asteroid field.',
    'menu.subtitleSaved': 'Start the jump and continue your run.',
    'menu.language': 'Language',
    'menu.portuguese': 'Portuguese',
    'menu.english': 'English',
    'menu.start': 'Start Run',
    'menu.continue': 'Continue',
    'menu.warping': 'Warping...',
    'hud.money': 'Money',
    'hud.next': 'Next',
    'hud.shipHull': 'Ship hull',
    'hud.currentObjective': 'Current objective',
    'hud.openZoneMap': 'Open zone map',
    'hud.openSettings': 'Open settings',
    'hud.idleSystems': 'Idle systems',
    'hud.closeShop': 'Close shop',
    'hud.openUpgrades': 'Open upgrades menu',
    'hud.shopTabs': 'Shop tabs',
    'hud.map': 'Map',
    'nav.upgrades': 'Upgrades',
    'nav.technologies': 'Technologies',
    'nav.hangar': 'Hangar',
    'nav.drones': 'Drones',
    'nav.skills': 'Skills',
    'nav.achievements': 'Achievements',
    'unit.crystals': 'crystals',
    'unit.ranks': 'ranks',
    'unit.semiPierce': 'semi pierce',
    'status.offline': 'Offline refinery payout: {amount}.',
    'status.destroyed': 'Ship destroyed. Repair {amount}. Respawning in {seconds}.',
    'status.droneReboot': 'Drone wing rebooting: {seconds} sec.',
    'status.refineryReduced': 'Refinery output reduced: {seconds} sec.',
    'status.shieldActive': 'Temporary shield active.',
    'status.shieldRecharge': 'Shield bubble recharging: {seconds} sec.',
    'status.shieldReady': 'Shield bubble armed: next hit absorbed.',
    'status.survival': 'Survival {time} · Threat {threat} · Best {best}',
    'status.firstBossCountdown': 'Destroy {remaining} more asteroids to draw the first gate boss.',
    'status.firstBossDetected': 'First gate boss detected.',
    'status.default': 'Drag away from the ship path to slingshot. WASD / arrows also fly. H for hyperspace.',
    'goal.installDroneSystems': 'Install Drone Systems',
    'goal.warpForFirstCore': 'Exchange ships for your first core',
    'goal.defeatGateBoss': 'Defeat the gate boss',
    'goal.drawGateBoss': 'Draw out the gate boss',
    'goal.collectWarpCrystals': 'Collect warp crystals',
    'goal.cores': '{current}/{target} core',
    'goal.coreReady': '+{count} {unit} ready',
    'goal.bossActive': 'Boss active',
    'goal.asteroids': '{current}/{target} asteroids',
    'goal.crystals': '{current}/{target} crystals',
    'shop.upgradesKicker': 'Upgrades',
    'shop.shipCore': 'Ship Core',
    'shop.shotDamage': 'Shot Damage',
    'shop.fireRate': 'Fire Rate',
    'shop.hull': 'Hull',
    'shop.income': 'Income',
    'shop.skillsTitle': 'Talent Tree',
    'shop.skillsCopy': 'Spend crystals on connected nodes. Branches unlock after buying the matching drone type.',
    'shop.skillsStatCrystals': 'Crystals',
    'shop.skillsStatTalents': 'Talents',
    'shop.skillsStatSemiPierce': 'Semi pierce',
    'shop.skillsStatRefinery': 'Refinery',
    'shop.skillsActionTitle': 'Talent Constellation',
    'shop.skillsActionMeta': '{count} ranks unlocked',
    'shop.skillsActionLabel': 'Open Talent Tree',
    'shop.level': 'Lv {level}/{cap}',
    'shop.max': 'MAX',
    'shop.damage': '{value} dmg',
    'shop.perSecond': '{value} / sec',
    'shop.warpReset': 'Ship Exchange',
    'shop.gainCores': 'Gain {count} {unit}',
    'shop.resetRun': 'Exchange Ship',
    'shop.notReady': 'Not Ready',
    'shop.crystals': 'Crystals',
    'shop.availableAfter': 'After exchange',
    'shop.route': 'Route',
    'shop.owned': '{count} owned',
    'shop.nextCore': '{count} {unit} to exchange ships',
    'shop.reachZone': 'Reach {zone}',
    'shop.unlockNext': 'Unlock next: {items}.',
    'shop.bankCores': 'Exchange ships now to bank cores for the next technology.',
    'shop.defeatBosses': 'Defeat gate bosses to open a deep enough route for warp cores.',
    'shop.collectCrystals': 'Collect crystal asteroids until this exchange can create a core.',
    'settings.audio': 'Audio',
    'settings.sound': 'Sound Settings',
    'settings.saveData': 'Save Data',
    'settings.reset': 'Reset',
    'settings.resetCopy': 'Clears all Asteridle save, progression, technologies, achievements, and local settings on this device.',
    'settings.resetAll': 'Reset All Data',
    'settings.confirmReset': 'Reset all Asteridle data on this device? This cannot be undone.',
    'settings.resetDone': 'All local data reset'
  },
  'pt-BR': {
    'menu.subtitle': 'Escolha o idioma e entre no campo de asteroides.',
    'menu.subtitleSaved': 'Inicie a viagem e continue sua run.',
    'menu.language': 'Idioma',
    'menu.portuguese': 'Português',
    'menu.english': 'Inglês',
    'menu.start': 'Iniciar',
    'menu.continue': 'Continuar',
    'menu.warping': 'Viajando...',
    'hud.money': 'Dinheiro',
    'hud.next': 'Próximo',
    'hud.shipHull': 'Casco da nave',
    'hud.currentObjective': 'Objetivo atual',
    'hud.openZoneMap': 'Abrir mapa de zonas',
    'hud.openSettings': 'Abrir configurações',
    'hud.idleSystems': 'Sistemas idle',
    'hud.closeShop': 'Fechar loja',
    'hud.openUpgrades': 'Abrir melhorias',
    'hud.shopTabs': 'Abas da loja',
    'hud.map': 'Mapa',
    'nav.upgrades': 'Melhorias',
    'nav.technologies': 'Tecnologias',
    'nav.hangar': 'Hangar',
    'nav.drones': 'Drones',
    'nav.skills': 'Habilidades',
    'nav.achievements': 'Conquistas',
    'unit.crystals': 'cristais',
    'unit.ranks': 'níveis',
    'unit.semiPierce': 'perfuração semi-auto',
    'status.offline': 'Refinaria offline gerou: {amount}.',
    'status.destroyed': 'Nave destruída. Reparo {amount}. Reaparece em {seconds}.',
    'status.droneReboot': 'Drones reiniciando: {seconds} s.',
    'status.refineryReduced': 'Refinaria reduzida: {seconds} s.',
    'status.shieldActive': 'Escudo temporário ativo.',
    'status.shieldRecharge': 'Bolha de escudo recarregando: {seconds} s.',
    'status.shieldReady': 'Bolha de escudo pronta: o próximo hit será absorvido.',
    'status.survival': 'Sobrevivência {time} · Ameaça {threat} · Recorde {best}',
    'status.firstBossCountdown': 'Destrua mais {remaining} asteroides para atrair o primeiro boss.',
    'status.firstBossDetected': 'Primeiro boss detectado.',
    'status.default': 'Arraste para longe da rota da nave e solte. WASD / setas também voam. H ativa hyperspace.',
    'goal.installDroneSystems': 'Instale Sistemas de Drones',
    'goal.warpForFirstCore': 'Troque de nave pelo primeiro núcleo',
    'goal.defeatGateBoss': 'Derrote o boss do portal',
    'goal.drawGateBoss': 'Atraia o boss do portal',
    'goal.collectWarpCrystals': 'Colete cristais de warp',
    'goal.cores': '{current}/{target} núcleo',
    'goal.coreReady': '+{count} {unit} pronto',
    'goal.bossActive': 'Boss ativo',
    'goal.asteroids': '{current}/{target} asteroides',
    'goal.crystals': '{current}/{target} cristais',
    'shop.upgradesKicker': 'Melhorias',
    'shop.shipCore': 'Núcleo da Nave',
    'shop.shotDamage': 'Dano do Tiro',
    'shop.fireRate': 'Velocidade de Ataque',
    'shop.hull': 'Vida',
    'shop.income': 'Dinheiro/s',
    'shop.skillsTitle': 'Árvore de Habilidades',
    'shop.skillsCopy': 'Gaste cristais em nós conectados. Alguns ramos abrem depois de comprar o tipo de drone correspondente.',
    'shop.skillsStatCrystals': 'Cristais',
    'shop.skillsStatTalents': 'Habilidades',
    'shop.skillsStatSemiPierce': 'Perfuração',
    'shop.skillsStatRefinery': 'Refinaria',
    'shop.skillsActionTitle': 'Constelação de Habilidades',
    'shop.skillsActionMeta': '{count} níveis desbloqueados',
    'shop.skillsActionLabel': 'Abrir árvore',
    'shop.level': 'Nv {level}/{cap}',
    'shop.max': 'MAX',
    'shop.damage': '{value} dano',
    'shop.perSecond': '{value} / s',
    'shop.warpReset': 'Troca de Nave',
    'shop.gainCores': 'Ganhar {count} {unit}',
    'shop.resetRun': 'Trocar Nave',
    'shop.notReady': 'Bloqueado',
    'shop.crystals': 'Cristais',
    'shop.availableAfter': 'Depois da troca',
    'shop.route': 'Rota',
    'shop.owned': '{count} comprados',
    'shop.nextCore': 'Faltam {count} {unit} para trocar de nave',
    'shop.reachZone': 'Alcance {zone}',
    'shop.unlockNext': 'Próximo desbloqueio: {items}.',
    'shop.bankCores': 'Troque de nave agora para guardar núcleos para a próxima tecnologia.',
    'shop.defeatBosses': 'Derrote bosses de portal para abrir uma rota profunda o suficiente para núcleos.',
    'shop.collectCrystals': 'Colete asteroides de cristal até esta troca gerar um núcleo.',
    'settings.audio': 'Áudio',
    'settings.sound': 'Configurações de Som',
    'settings.saveData': 'Dados salvos',
    'settings.reset': 'Reset',
    'settings.resetCopy': 'Apaga todo o save, progresso, tecnologias, conquistas e configurações locais deste aparelho.',
    'settings.resetAll': 'Resetar tudo',
    'settings.confirmReset': 'Resetar todos os dados do Asteridle neste aparelho? Isso não pode ser desfeito.',
    'settings.resetDone': 'Dados locais resetados'
  }
};

export const normalizeLanguage = (value: string | null | undefined): LanguageCode | null => {
  if (value === 'pt-BR' || value?.toLowerCase().startsWith('pt')) {
    return 'pt-BR';
  }
  if (value === 'en-US' || value?.toLowerCase().startsWith('en')) {
    return 'en-US';
  }
  return null;
};

export const getSavedLanguage = (): LanguageCode | null => {
  try {
    return normalizeLanguage(window.localStorage.getItem(languageStorageKey));
  } catch {
    return null;
  }
};

export const getBrowserLanguage = (): LanguageCode => normalizeLanguage(navigator.language) ?? 'en-US';

export const saveLanguage = (language: LanguageCode): void => {
  try {
    window.localStorage.setItem(languageStorageKey, language);
  } catch {
    // The selected language still applies for this session if storage is unavailable.
  }
};

export const translate = (language: LanguageCode, key: TranslationKey, values: Record<string, string | number> = {}): string => {
  const template = translations[language][key] ?? translations['en-US'][key];
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  );
};

export const formatCoreUnit = (language: LanguageCode, count: number): string => {
  if (language === 'pt-BR') {
    return count === 1 ? 'núcleo' : 'núcleos';
  }
  return count === 1 ? 'core' : 'cores';
};

export const formatCrystalUnit = (language: LanguageCode, count: number): string => {
  if (language === 'pt-BR') {
    return count === 1 ? 'cristal' : 'cristais';
  }
  return count === 1 ? 'crystal' : 'crystals';
};
