export type FactStatus = 'unconfirmed' | 'confirmed' | 'rejected'
export type FactKind = 'explicit' | 'interpretation' | 'unknown'
export type FactCategory =
  | 'identity'
  | 'responsibility'
  | 'support'
  | 'logistics'
  | 'care'
  | 'challenge'
  | 'gap'
  | 'unknown'
  | 'goal'

export interface CareMapFact {
  id: string
  category: FactCategory
  content: string
  source: 'caregiver' | 'ai' | 'system'
  kind: FactKind
  status: FactStatus
  notes: string[]
}

export interface NextStep {
  id: string
  title: string
  detail: string
}

export interface CareMapState {
  facts: CareMapFact[]
  narrative: string
  priorities: string[]
  nextSteps: NextStep[]
  lastUpdate: string | null
  history: string[]
  selectedNextStep: string | null
}

export function createInitialMap(): CareMapState {
  const facts: CareMapFact[] = [
    {
      id: 'fact-01',
      category: 'identity',
      content: 'Elena is 42 years old.',
      source: 'caregiver',
      kind: 'explicit',
      status: 'confirmed',
      notes: ['Caregiver stated her own age.'],
    },
    {
      id: 'fact-02',
      category: 'identity',
      content: 'Elena helps her 78-year-old father, who lives at home.',
      source: 'caregiver',
      kind: 'explicit',
      status: 'confirmed',
      notes: ['Caregiver stated this directly.'],
    },
    {
      id: 'fact-03',
      category: 'responsibility',
      content: 'Elena works during the week.',
      source: 'caregiver',
      kind: 'explicit',
      status: 'confirmed',
      notes: ['Explicit work schedule described.'],
    },
    {
      id: 'fact-04',
      category: 'support',
      content: 'Her sister sometimes drives him to appointments.',
      source: 'caregiver',
      kind: 'explicit',
      status: 'confirmed',
      notes: ['This is the current transportation arrangement.'],
    },
    {
      id: 'fact-05',
      category: 'support',
      content: 'Her sister’s availability varies.',
      source: 'caregiver',
      kind: 'explicit',
      status: 'confirmed',
      notes: ['The caregiver said the support is not consistently available.'],
    },
    {
      id: 'fact-06',
      category: 'challenge',
      content: 'Elena finds coordination difficult.',
      source: 'caregiver',
      kind: 'explicit',
      status: 'confirmed',
      notes: ['Explicit coordination challenge reported.'],
    },
    {
      id: 'fact-07',
      category: 'goal',
      content: 'Elena wants to organise responsibilities and understand what to do when usual support is unavailable.',
      source: 'caregiver',
      kind: 'explicit',
      status: 'confirmed',
      notes: ['Primary priority stated by caregiver.'],
    },
    {
      id: 'fact-08',
      category: 'unknown',
      content: 'Who else could help is currently unknown.',
      source: 'system',
      kind: 'unknown',
      status: 'unconfirmed',
      notes: ['No other helper was identified.'],
    },
    {
      id: 'fact-09',
      category: 'gap',
      content:
        'It looks like you may need a backup option for transportation when your sister is unavailable. Is that correct?',
      source: 'ai',
      kind: 'interpretation',
      status: 'unconfirmed',
      notes: ['This is a suggested gap, not a confirmed fact.'],
    },
  ]

  return {
    facts,
    narrative:
      'Elena is 42 and works during the week. She helps her 78-year-old father, who lives at home. Her sister sometimes drives him to appointments, but her availability varies. Elena finds coordination difficult and does not know who else could help.',
    priorities: ['Organise responsibilities', 'Find backup support', 'Reduce coordination stress'],
    nextSteps: [
      {
        id: 'next-01',
        title: 'Map responsibilities',
        detail: 'Clarify which tasks and coordination needs are already covered and which are still unclear.',
      },
      {
        id: 'next-02',
        title: 'Plan transportation backup',
        detail: 'Identify how to manage appointments if her sister is unavailable.',
      },
      {
        id: 'next-03',
        title: 'Review support network',
        detail: 'Assess whether other trusted people could help in the future.',
      },
    ],
    lastUpdate: null,
    history: ['Initial Care Map created for Elena.'],
    selectedNextStep: null,
  }
}

export function addFact(map: CareMapState, fact: CareMapFact): CareMapState {
  if (map.facts.some((existing) => existing.id === fact.id)) {
    throw new Error(`Duplicate fact identifier: ${fact.id}`)
  }

  return {
    ...map,
    facts: [...map.facts, fact],
  }
}

export function updateFactStatus(
  map: CareMapState,
  factId: string,
  status: FactStatus,
): CareMapState {
  return {
    ...map,
    facts: map.facts.map((fact) =>
      fact.id === factId ? { ...fact, status } : fact,
    ),
  }
}

export function getStageFacts(map: CareMapState, stage: 'draft' | 'review' | 'views' | 'steps') {
  switch (stage) {
    case 'draft':
      return map.facts.filter((fact) => fact.kind !== 'unknown' || fact.category === 'unknown')
    case 'review':
      return map.facts
    case 'views':
      return map.facts.filter((fact) => fact.category !== 'unknown')
    case 'steps':
      return map.facts.filter((fact) => fact.status === 'confirmed' || fact.kind === 'interpretation')
    default:
      return map.facts
  }
}

export function getSupportViewItems(map: CareMapState) {
  return map.facts.filter((fact) =>
    ['support', 'responsibility', 'logistics', 'challenge', 'gap'].includes(fact.category),
  )
}

export function getPersonViewItems(map: CareMapState) {
  return map.facts.filter((fact) =>
    ['identity', 'care', 'support', 'responsibility', 'goal', 'gap'].includes(fact.category),
  )
}

export function confirmGap(map: CareMapState, factId: string, isConfirmed: boolean): CareMapState {
  return updateFactStatus(
    map,
    factId,
    isConfirmed ? 'confirmed' : 'rejected',
  )
}

export function applyThreeWeekUpdate(map: CareMapState): CareMapState {
  const temporaryChange: CareMapFact = {
    id: 'fact-10',
    category: 'support',
    content:
      'My sister will not be available to drive my father to appointments for the next month.',
    source: 'caregiver',
    kind: 'explicit',
    status: 'confirmed',
    notes: ['Temporary change reported by caregiver.'],
  }

  const gapReminder: CareMapFact = {
    id: 'fact-11',
    category: 'gap',
    content:
      'It looks like you may need a backup option for transportation while your sister is unavailable.',
    source: 'ai',
    kind: 'interpretation',
    status: 'unconfirmed',
    notes: ['Updated after the three-week availability change.'],
  }

  const updatedFacts = [...map.facts.filter((fact) => fact.id !== 'fact-10' && fact.id !== 'fact-11'), temporaryChange, gapReminder]
  const updatedHistory = [...map.history, 'Three-week update: the sister’s transportation support is temporarily unavailable for the next month.']

  return {
    ...map,
    facts: updatedFacts,
    nextSteps: [
      {
        id: 'next-transport',
        title: 'Explore transportation backup',
        detail: 'Ask whether Elena wants help identifying alternative transportation options for appointments.',
      },
      {
        id: 'next-support',
        title: 'Talk to other trusted people',
        detail: 'Check whether the wider care network can provide transport or practical support during the temporary gap.',
      },
    ],
    lastUpdate:
      'My sister will not be available to drive my father to appointments for the next month.',
    history: updatedHistory,
    selectedNextStep: null,
  }
}
