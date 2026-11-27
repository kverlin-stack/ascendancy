import { advanceFor, isQuarterEnd, runQuarterOf, yearOf } from './calendar';
import { createRng, seedToState, type Rng } from './rng';
import { STATE_VERSION } from './types';
import type {
  Action,
  CardDef,
  CardEffect,
  CardInstance,
  DirectorDef,
  FacilityDef,
  GameContent,
  GameState,
  LossCause,
  RunRule,
  ThreatDef,
  TraitDef,
  TraitRule,
  ThreatEffect,
} from './types';

/**
 * The reducer. Pure: (state, action, content) => new state. The RNG state is
 * stored in GameState, so a run is fully determined by seed + action list.
 * Illegal actions return the input state unchanged.
 */
export function applyAction(state: GameState, action: Action, content: GameContent): GameState {
  if (state.phase === 'reward') {
    return action.type === 'chooseReward' ? chooseReward(state, action.id, content) : state;
  }
  if (state.phase !== 'playing') return state;
  switch (action.type) {
    case 'playCard':
      return canPlay(state, action.uid, content) ? playCard(state, action.uid, content) : state;
    case 'endTurn':
      return endTurn(state, content);
    case 'chooseReward':
      return state;
  }
}

export function newGame(
  content: GameContent,
  seed: number | string,
  directorId: string = content.directors[0]?.id ?? '',
): GameState {
  const seedState = seedToState(seed);
  const rng = createRng(seedState);
  const { rules } = content;
  const director = getDirector(content, directorId);
  const deck: CardInstance[] = director.starterDeck.map((cardId, i) => ({ uid: i + 1, cardId }));
  const s: GameState = {
    version: STATE_VERSION,
    seed: seedState,
    rngState: 0,
    directorId: director.id,
    turn: 0,
    phase: 'playing',
    lossCause: null,
    effort: 0,
    maxEffort: 0,
    fortify: 0,
    playedThisTurn: [],
    typesPlayedThisTurn: [],
    facilities: [],
    resources: {
      progress: 0,
      front: rules.frontTerritories,
      secrecy: rules.start.secrecy,
      budget: rules.start.budget,
      morale: rules.start.morale,
    },
    drawPile: rng.shuffle(deck),
    hand: [],
    discard: [],
    rewardKind: 'card',
    rewardOptions: [],
    lost: [],
    burnout: {},
    scientists: {},
    threatId: '',
    enemyDeck: [],
    threatCancelled: false,
    intelThisTurn: 0,
    nextUid: deck.length + 1,
    log: [],
  };
  if (rules.reward.startFacility) {
    // Turn 0: the opening Facility pick, before the first hand is dealt.
    s.rewardKind = 'facility';
    s.rewardOptions = pickFacilityOptions(s, content, rng);
  }
  if (s.rewardOptions.length > 0) s.phase = 'reward';
  else startNextTurn(s, content, rng);
  s.rngState = rng.state;
  return s;
}

/** Director rules plus every owned Facility's rules. */
export function activeRules(s: GameState, content: GameContent): RunRule[] {
  return [
    ...getDirector(content, s.directorId).rules,
    ...s.facilities.flatMap((id) => getFacility(content, id).rules),
  ];
}

/** How many upcoming enemy orders (after the current one) the player can see. */
export function intelOf(s: GameState, content: GameContent): number {
  return ruleTotal(s, content, 'intel') + s.intelThisTurn;
}

/** The visible upcoming enemy orders, soonest first. */
export function upcomingThreats(s: GameState, content: GameContent): string[] {
  const n = Math.min(intelOf(s, content), s.enemyDeck.length);
  return s.enemyDeck.slice(s.enemyDeck.length - n).reverse();
}

function ruleTotal(
  s: GameState,
  content: GameContent,
  type: 'effortBonus' | 'drawBonus' | 'burnoutLimit' | 'intel',
): number {
  let total = 0;
  for (const r of activeRules(s, content)) if (r.type === type) total += r.amount;
  return total;
}

/** Effort at the start of a turn: the base, plus rule bonuses, minus the low-Morale penalty. */
export function effortForTurn(s: GameState, content: GameContent): number {
  const { rules } = content;
  const low = s.resources.morale <= rules.morale.low ? rules.morale.lowEffortPenalty : 0;
  return Math.max(1, rules.effortPerTurn + ruleTotal(s, content, 'effortBonus') - low);
}

/** Cards drawn at the start of a turn: the hand size, plus the high-Morale bonus. */
export function handSizeForTurn(s: GameState, content: GameContent): number {
  const { rules } = content;
  return (
    rules.handSize +
    ruleTotal(s, content, 'drawBonus') +
    (s.resources.morale >= rules.morale.high ? rules.morale.highDrawBonus : 0)
  );
}

export function getCard(content: GameContent, cardId: string): CardDef {
  const card = content.cards.find((c) => c.id === cardId);
  if (!card) throw new Error(`Unknown card: ${cardId}`);
  return card;
}

export function getDirector(content: GameContent, directorId: string): DirectorDef {
  const d = content.directors.find((x) => x.id === directorId);
  if (!d) throw new Error(`Unknown director: ${directorId}`);
  return d;
}

export function getFacility(content: GameContent, facilityId: string): FacilityDef {
  const f = content.facilities.find((x) => x.id === facilityId);
  if (!f) throw new Error(`Unknown facility: ${facilityId}`);
  return f;
}

export function getTrait(content: GameContent, traitId: string): TraitDef {
  const t = content.traits.find((x) => x.id === traitId);
  if (!t) throw new Error(`Unknown trait: ${traitId}`);
  return t;
}

/** Traits a card instance has picked up (scientists only). */
export function traitsOf(state: GameState, content: GameContent, uid: number): TraitDef[] {
  return (state.scientists[uid]?.traits ?? []).map((id) => getTrait(content, id));
}

function traitRules(state: GameState, content: GameContent, uid: number | undefined): TraitRule[] {
  return uid === undefined ? [] : traitsOf(state, content, uid).flatMap((t) => t.rules);
}

/** A scientist's Burnout limit after Director, Facility and (if uid given) trait rules. */
export function burnoutLimitOf(
  state: GameState,
  content: GameContent,
  card: CardDef,
  uid?: number,
): number {
  if (!card.scientist) return Infinity;
  let limit = card.scientist.burnoutLimit + ruleTotal(state, content, 'burnoutLimit');
  for (const r of traitRules(state, content, uid)) if (r.type === 'burnoutLimit') limit += r.amount;
  return Math.max(1, limit);
}

/** Effort cost of a card instance after traits. */
export function costOf(state: GameState, content: GameContent, uid: number, card: CardDef): number {
  let cost = card.cost;
  for (const r of traitRules(state, content, uid)) if (r.type === 'costDelta') cost += r.amount;
  return Math.max(0, cost);
}

/** A card instance's effects, plus any trait onPlay effects. */
export function effectsOf(
  state: GameState,
  content: GameContent,
  uid: number,
  card: CardDef,
): CardEffect[] {
  const extra = traitRules(state, content, uid).flatMap((r) =>
    r.type === 'onPlay' ? r.effects : [],
  );
  return [...card.effects, ...extra];
}

export function getThreat(content: GameContent, threatId: string): ThreatDef {
  const threat = content.threats.find((t) => t.id === threatId);
  if (!threat) throw new Error(`Unknown threat: ${threatId}`);
  return threat;
}

export type CantPlayReason =
  'notPlaying' | 'notInHand' | 'effort' | 'unplayable' | 'budget' | 'morale' | 'secrecy';

/**
 * Why a card can't be played right now, or null if it can. A card needs to be in
 * hand, affordable in Effort, and must not spend Budget, Morale or Secrecy down
 * to 0 (cards can't make you lose by themselves).
 */
export function whyCantPlay(
  state: GameState,
  uid: number,
  content: GameContent,
): CantPlayReason | null {
  if (state.phase !== 'playing') return 'notPlaying';
  const inst = state.hand.find((c) => c.uid === uid);
  if (!inst) return 'notInHand';
  const card = getCard(content, inst.cardId);
  if (costOf(state, content, uid, card) > state.effort) return 'effort';
  if (card.type === 'status' && card.effects.length === 0 && !card.exhaust) return 'unplayable';
  let budget = 0;
  let morale = 0;
  let secrecy = 0;
  const firstOfType = state.typesPlayedThisTurn.includes(card.type)
    ? []
    : activeRules(state, content).flatMap((r) =>
        r.type === 'onFirstPlayOfType' && r.cardType === card.type ? r.effects : [],
      );
  for (const e of [...effectsOf(state, content, uid, card), ...firstOfType]) {
    if (e.type === 'gainBudget') budget += e.amount;
    if (e.type === 'gainMorale') morale += e.amount;
    if (e.type === 'protectSecrecy') secrecy += e.amount;
  }
  // Burning out a scientist costs Morale too.
  if (
    card.scientist &&
    (state.burnout[uid] ?? 0) + 1 >= burnoutLimitOf(state, content, card, uid)
  ) {
    morale -= content.rules.burnoutMoraleLoss;
  }
  const r = state.resources;
  if (budget < 0 && r.budget + budget <= 0) return 'budget';
  if (morale < 0 && r.morale + morale <= 0) return 'morale';
  if (secrecy < 0 && r.secrecy + secrecy <= 0) return 'secrecy';
  return null;
}

export function canPlay(state: GameState, uid: number, content: GameContent): boolean {
  return whyCantPlay(state, uid, content) === null;
}

function playCard(state: GameState, uid: number, content: GameContent): GameState {
  const s = cloneState(state);
  const rng = createRng(s.rngState);
  const idx = s.hand.findIndex((c) => c.uid === uid);
  const [inst] = s.hand.splice(idx, 1) as [CardInstance];
  const card = getCard(content, inst.cardId);
  s.effort -= costOf(state, content, uid, card);
  s.playedThisTurn.push(uid);
  for (const effect of effectsOf(state, content, uid, card))
    applyCardEffect(s, effect, content, rng, uid);
  if (!s.typesPlayedThisTurn.includes(card.type)) {
    for (const r of activeRules(s, content)) {
      if (r.type === 'onFirstPlayOfType' && r.cardType === card.type) {
        for (const effect of r.effects) applyCardEffect(s, effect, content, rng);
      }
    }
    s.typesPlayedThisTurn.push(card.type);
  }
  s.log.push(`T${s.turn}: played ${card.name}`);
  // Discard after effects, so a drawCards reshuffle can't pull the card straight back.
  if (card.scientist) {
    const b = (s.burnout[inst.uid] ?? 0) + 1;
    if (b >= burnoutLimitOf(s, content, card, inst.uid)) {
      s.lost.push(inst);
      delete s.burnout[inst.uid];
      s.resources.morale = Math.max(0, s.resources.morale - content.rules.burnoutMoraleLoss);
      s.log.push(`T${s.turn}: ${card.name} burned out and left the program`);
    } else {
      s.burnout[inst.uid] = b;
      s.discard.push(inst);
      gainTraits(s, content, inst.uid, card, b, rng);
    }
  } else if (card.exhaust) {
    s.lost.push(inst);
  } else {
    s.discard.push(inst);
  }
  checkWin(s, content);
  s.rngState = rng.state;
  return s;
}

function endTurn(state: GameState, content: GameContent): GameState {
  const s = cloneState(state);
  const rng = createRng(s.rngState);
  const { rules } = content;

  // 1. The telegraphed enemy action resolves.
  const threat = getThreat(content, s.threatId);
  if (s.threatCancelled) {
    s.log.push(`T${s.turn}: ${threat.name} was cancelled`);
  } else {
    for (const effect of threat.effects) applyThreatEffect(s, effect, content, rng);
    s.log.push(`T${s.turn}: enemy ${threat.name}`);
  }

  // 2. Quarterly enemy advance and war weariness.
  if (isQuarterEnd(s.turn, rules)) {
    const adv = advanceFor(yearOf(s.turn, rules), rules);
    loseFront(s, adv);
    s.resources.morale = Math.max(0, s.resources.morale - rules.quarterlyMoraleLoss);
    s.log.push(
      `T${s.turn}: quarterly advance ${adv}, war weariness -${rules.quarterlyMoraleLoss} Morale`,
    );
  }

  // 3. Curses still in hand (e.g. a Mole) take effect.
  for (const inst of s.hand) {
    const card = getCard(content, inst.cardId);
    if (!card.inHandAtEndOfTurn) continue;
    for (const effect of card.inHandAtEndOfTurn) applyThreatEffect(s, effect, content, rng);
    s.log.push(`T${s.turn}: ${card.name} in hand`);
  }

  // 4. Lose checks.
  const cause = lossCause(s);
  if (cause) {
    s.phase = 'lost';
    s.lossCause = cause;
    s.log.push(`T${s.turn}: lost (${cause})`);
    s.discard.push(...s.hand);
    s.hand = [];
    s.rngState = rng.state;
    return s;
  }

  // 5. You survived the quarter: Director and Facility quarter-end effects apply.
  if (isQuarterEnd(s.turn, rules)) {
    for (const r of activeRules(s, content)) {
      if (r.type === 'onQuarterEnd') applyRuleEffects(s, r.effects, content, rng);
    }
    if (checkWin(s, content)) {
      s.rngState = rng.state;
      return s;
    }
  }

  // 6. Fortify expires. Scientists in hand who were not played this turn rest, then discard.
  s.fortify = 0;
  for (const inst of s.hand) {
    const before = s.burnout[inst.uid];
    if (before === undefined || s.playedThisTurn.includes(inst.uid)) continue;
    rest(s, content, inst.uid, 1);
    if (s.burnout[inst.uid] === before) continue;
    s.log.push(
      `T${s.turn}: ${getCard(content, inst.cardId).name} rested (Burnout ${before} → ${before - 1})`,
    );
  }
  s.discard.push(...s.hand);
  s.hand = [];

  // 7. After a quarter, offer a card (or Facility) pick before the next turn starts.
  if (isQuarterEnd(s.turn, rules)) {
    const facilityPick = rules.reward.facilityQuarters.includes(runQuarterOf(s.turn, rules));
    s.rewardKind = facilityPick ? 'facility' : 'card';
    s.rewardOptions = facilityPick
      ? pickFacilityOptions(s, content, rng)
      : pickRewardOptions(content, rng);
    if (s.rewardOptions.length > 0) {
      s.phase = 'reward';
      s.rngState = rng.state;
      return s;
    }
  }
  startNextTurn(s, content, rng);
  s.rngState = rng.state;
  return s;
}

function startNextTurn(s: GameState, content: GameContent, rng: Rng): void {
  // Orders the player has already been shown (Intel) must still arrive in that order.
  const seen = s.turn > 0 ? intelOf(s, content) : 0;
  s.turn += 1;
  s.playedThisTurn = [];
  s.typesPlayedThisTurn = [];
  s.threatCancelled = false;
  s.intelThisTurn = 0;
  s.effort = s.maxEffort = effortForTurn(s, content);
  drawCards(s, handSizeForTurn(s, content), rng);
  // A new quarter slips newly unlocked orders into the enemy deck at random depths, below
  // anything already seen. The existing order is kept, so delayed orders stay delayed.
  // (If the deck is empty, the next draw reshuffles everything unlocked, new orders included.)
  const rules = content.rules;
  if ((s.turn - 1) % rules.turnsPerQuarter === 0 && s.enemyDeck.length > 0) {
    const q = runQuarterOf(s.turn, rules);
    const added = content.threats.filter((t) => t.fromQuarter === q).flatMap((t) => copiesOf(t));
    for (const id of added) {
      const maxIndex = Math.max(0, s.enemyDeck.length - seen);
      s.enemyDeck.splice(rng.int(maxIndex + 1), 0, id);
    }
  }
  s.threatId = drawThreat(s, content, rng);
  for (const r of activeRules(s, content)) {
    if (r.type === 'onTurnStart') applyRuleEffects(s, r.effects, content, rng);
  }
  checkWin(s, content);
}

/** Win the moment Progress reaches the goal. Returns true if the run is won. */
function checkWin(s: GameState, content: GameContent): boolean {
  if (s.phase === 'won') return true;
  if (s.resources.progress < content.rules.progressGoal) return false;
  s.phase = 'won';
  s.log.push(`T${s.turn}: Progress goal reached`);
  return true;
}

/**
 * Apply a Director or Facility rule's effects. Like cards, rules can't make you
 * lose by themselves: a cost never takes Budget, Morale or Secrecy below 1.
 */
function applyRuleEffects(
  s: GameState,
  effects: CardEffect[],
  content: GameContent,
  rng: Rng,
): void {
  const before = { ...s.resources };
  for (const e of effects) applyCardEffect(s, e, content, rng);
  for (const key of ['budget', 'morale', 'secrecy'] as const) {
    if (before[key] >= 1 && s.resources[key] < 1) s.resources[key] = 1;
  }
}

function copiesOf(t: ThreatDef): string[] {
  return Array.from({ length: t.copies }, () => t.id);
}

/** Every copy of every enemy action unlocked by this run quarter. */
function eligibleThreats(content: GameContent, runQuarter: number): string[] {
  return content.threats.filter((t) => t.fromQuarter <= runQuarter).flatMap(copiesOf);
}

/** Draw the next enemy action, reshuffling the full unlocked enemy deck when it runs out. */
function drawThreat(s: GameState, content: GameContent, rng: Rng): string {
  if (s.enemyDeck.length === 0) {
    s.enemyDeck = rng.shuffle(eligibleThreats(content, runQuarterOf(s.turn, content.rules)));
  }
  const next = s.enemyDeck.pop();
  if (next === undefined) throw new Error('No enemy actions available');
  return next;
}

function chooseReward(state: GameState, id: string | null, content: GameContent): GameState {
  if (id !== null && !state.rewardOptions.includes(id)) return state;
  const s = cloneState(state);
  const rng = createRng(s.rngState);
  if (id !== null && s.rewardKind === 'facility') {
    s.facilities.push(id);
    s.log.push(`T${s.turn}: requisitioned ${getFacility(content, id).name}`);
  } else if (id !== null) {
    s.discard.push({ uid: s.nextUid++, cardId: id });
    s.log.push(`T${s.turn}: recruited ${getCard(content, id).name}`);
  }
  s.rewardOptions = [];
  s.phase = 'playing';
  startNextTurn(s, content, rng);
  s.rngState = rng.state;
  return s;
}

/** Distinct Facilities you don't own yet, weighted by rarity. */
export function pickFacilityOptions(s: GameState, content: GameContent, rng: Rng): string[] {
  const { weights, facilityChoices } = content.rules.reward;
  let pool = content.facilities.filter((f) => !s.facilities.includes(f.id));
  const picks: string[] = [];
  while (picks.length < facilityChoices && pool.length > 0) {
    const f = rng.pickWeighted(pool, (x) => weights[x.rarity]);
    picks.push(f.id);
    pool = pool.filter((x) => x.id !== f.id);
  }
  return picks;
}

/** Distinct non-starter cards, weighted by rarity. */
export function pickRewardOptions(content: GameContent, rng: Rng): string[] {
  const { weights, choices } = content.rules.reward;
  let pool = content.cards.filter((c) => c.rarity !== 'starter' && c.rarity !== 'special');
  const picks: string[] = [];
  while (picks.length < choices && pool.length > 0) {
    const card = rng.pickWeighted(pool, (c) =>
      c.rarity === 'starter' || c.rarity === 'special' ? 0 : weights[c.rarity],
    );
    picks.push(card.id);
    pool = pool.filter((c) => c.id !== card.id);
  }
  return picks;
}

export function lossCause(s: GameState): LossCause | null {
  const r = s.resources;
  if (r.front <= 0) return 'front';
  if (r.secrecy <= 0) return 'secrecy';
  if (r.budget <= 0) return 'budget';
  if (r.morale <= 0) return 'morale';
  return null;
}

function applyCardEffect(
  s: GameState,
  e: CardEffect,
  content: GameContent,
  rng: Rng,
  /** The card being played, if any. It is not affected by its own restScientists. */
  sourceUid?: number,
): void {
  const r = s.resources;
  const { rules } = content;
  switch (e.type) {
    case 'addProgress':
      r.progress = Math.min(rules.progressGoal, r.progress + e.amount);
      return;
    case 'pushFront':
      r.front = clamp(r.front + e.amount, 0, rules.frontTerritories);
      return;
    case 'fortify':
      s.fortify += e.amount;
      return;
    case 'gainBudget':
      r.budget = Math.max(0, r.budget + e.amount);
      return;
    case 'protectSecrecy':
      r.secrecy = clamp(r.secrecy + e.amount, 0, rules.max.secrecy);
      return;
    case 'gainMorale':
      r.morale = clamp(r.morale + e.amount, 0, rules.max.morale);
      return;
    case 'drawCards':
      drawCards(s, e.amount, rng);
      return;
    case 'intel':
      s.intelThisTurn += e.amount;
      return;
    case 'delayThreat': {
      // Draw the next order first, so a delayed order can't come straight back.
      const delayed = s.threatId;
      if (s.enemyDeck.length === 0) {
        // Start the next cycle now, without the delayed order's own copy (it goes to the bottom).
        const fresh = eligibleThreats(content, runQuarterOf(s.turn, content.rules));
        const own = fresh.indexOf(delayed);
        if (own >= 0) fresh.splice(own, 1);
        if (fresh.length === 0) return; // nothing else to bring forward
        s.enemyDeck = rng.shuffle(fresh);
      }
      s.threatId = drawThreat(s, content, rng);
      s.enemyDeck.unshift(delayed);
      s.threatCancelled = false;
      return;
    }
    case 'cancelThreat':
      s.threatCancelled = true;
      return;
    case 'restScientists':
      for (const uid of Object.keys(s.burnout)) {
        if (Number(uid) !== sourceUid) rest(s, content, Number(uid), e.amount);
      }
      return;
  }
}

/** How much rules soften this kind of enemy hit. */
function threatReduction(s: GameState, content: GameContent, type: ThreatEffect['type']): number {
  let total = 0;
  for (const r of activeRules(s, content))
    if (r.type === 'reduceThreat' && r.effect === type) total += r.amount;
  return total;
}

function applyThreatEffect(s: GameState, raw: ThreatEffect, content: GameContent, rng: Rng): void {
  const r = s.resources;
  const e =
    raw.type === 'addCard'
      ? raw
      : { ...raw, amount: Math.max(0, raw.amount - threatReduction(s, content, raw.type)) };
  switch (e.type) {
    case 'loseProgress':
      r.progress = Math.max(0, r.progress - e.amount);
      return;
    case 'addCard': {
      getCard(content, e.cardId); // fail loudly on bad data
      for (let i = 0; i < e.amount; i++) s.discard.push({ uid: s.nextUid++, cardId: e.cardId });
      s.discard = rng.shuffle(s.discard);
      return;
    }
    case 'advanceFront':
      loseFront(s, e.amount);
      return;
    case 'loseSecrecy':
      r.secrecy = Math.max(0, r.secrecy - e.amount);
      return;
    case 'loseBudget':
      r.budget = Math.max(0, r.budget - e.amount);
      return;
    case 'loseMorale':
      r.morale = Math.max(0, r.morale - e.amount);
      return;
  }
}

/**
 * After a scientist survives a play: a merit after enough plays, and a strain
 * if they were worked while tired. At most one of each per scientist.
 */
function gainTraits(
  s: GameState,
  content: GameContent,
  uid: number,
  card: CardDef,
  burnout: number,
  rng: Rng,
): void {
  const rec = s.scientists[uid] ?? { plays: 0, traits: [] };
  const next = { plays: rec.plays + 1, traits: rec.traits.slice() };
  const has = (kind: TraitDef['kind']) =>
    next.traits.some((id) => getTrait(content, id).kind === kind);
  const gain = (kind: TraitDef['kind']) => {
    const pool = content.traits.filter((t) => t.kind === kind);
    if (pool.length === 0) return;
    const t = pool[rng.int(pool.length)] as TraitDef;
    next.traits.push(t.id);
    s.log.push(`T${s.turn}: ${card.name} is now ${t.name}`);
  };
  if (next.plays >= content.rules.traits.meritAfterPlays && !has('merit')) gain('merit');
  if (burnout >= content.rules.traits.strainAtBurnout && !has('strain')) gain('strain');
  s.scientists[uid] = next;
}

/** Lower a scientist's Burnout (no-op for other cards, and for scientists who never rest). */
function rest(s: GameState, content: GameContent, uid: number, amount: number): void {
  const b = s.burnout[uid];
  if (b === undefined) return;
  if (traitRules(s, content, uid).some((r) => r.type === 'noRest')) return;
  if (b - amount <= 0) delete s.burnout[uid];
  else s.burnout[uid] = b - amount;
}

/** Front loss, absorbed first by this turn's Fortify. */
function loseFront(s: GameState, amount: number): void {
  const blocked = Math.min(s.fortify, amount);
  s.fortify -= blocked;
  s.resources.front = Math.max(0, s.resources.front - (amount - blocked));
}

/** Draw n cards, reshuffling the discard pile into the draw pile when it runs out. */
function drawCards(s: GameState, n: number, rng: Rng): void {
  for (let i = 0; i < n; i++) {
    if (s.drawPile.length === 0) {
      if (s.discard.length === 0) return;
      s.drawPile = rng.shuffle(s.discard);
      s.discard = [];
    }
    s.hand.push(s.drawPile.pop() as CardInstance);
  }
}

/**
 * Copy a GameState for the reducer to modify. Card instances are never
 * mutated, only moved between piles, so copying the arrays is enough.
 */
export function cloneState(s: GameState): GameState {
  return {
    ...s,
    resources: { ...s.resources },
    drawPile: s.drawPile.slice(),
    hand: s.hand.slice(),
    discard: s.discard.slice(),
    rewardOptions: s.rewardOptions.slice(),
    playedThisTurn: s.playedThisTurn.slice(),
    typesPlayedThisTurn: s.typesPlayedThisTurn.slice(),
    facilities: s.facilities.slice(),
    enemyDeck: s.enemyDeck.slice(),
    lost: s.lost.slice(),
    burnout: { ...s.burnout },
    scientists: { ...s.scientists },
    log: s.log.slice(),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
