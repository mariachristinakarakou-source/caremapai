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
  source: 'caregiver' | 'scenario' | 'ai' | 'system'
  kind: FactKind
  status: FactStatus
  notes: string[]
}

export interface NextStep {
  id: string
  title: string
  detail: string
  needId: string
  whyUseful: string
  requirements: string
  needsMoreInfo: boolean
}

export type EntityRole = 'caregiver' | 'recipient' | 'family' | 'responsibility' | 'challenge' | 'gap'

export interface CareMapEntity {
  id: string
  name: string
  role: EntityRole
  detail: string
  status: FactStatus
}

export type RelationshipCategory = 'care' | 'support' | 'responsibility' | 'challenge' | 'potential-gap'
export type SupportFrequency = 'frequent' | 'occasional' | 'rare' | 'unknown'

export interface RelationshipSnapshot {
  label: string
  frequency: SupportFrequency
  availability: string
  status: FactStatus
  changedAt: string
}

export interface CareMapRelationship {
  id: string
  sourceId: string
  targetId: string
  label: string
  category: RelationshipCategory
  frequency: SupportFrequency
  availability: string
  status: FactStatus
  evidenceFactId: string | null
  history: RelationshipSnapshot[]
}

export type NeedPriority = 'high' | 'medium' | 'low'
export type NeedStatus = 'suggested' | 'confirmed' | 'rejected' | 'unresolved'

export interface SuggestedNeed {
  id: string
  title: string
  priority: NeedPriority
  status: NeedStatus
  rationale: string
  requirements: string
  needsMoreInfo: boolean
}

export interface ClarificationAnswer {
  id: string
  prompt: string
  answer: string
  status: 'answered' | 'skipped'
}

export interface CareMapState {
  schemaVersion: 2
  facts: CareMapFact[]
  entities: CareMapEntity[]
  relationships: CareMapRelationship[]
  clarifications: ClarificationAnswer[]
  suggestedNeeds: SuggestedNeed[]
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
      source: 'scenario',
      kind: 'explicit',
      status: 'unconfirmed',
      notes: ['Caregiver stated her own age.'],
    },
    {
      id: 'fact-02',
      category: 'identity',
      content: 'Elena helps her 78-year-old father, who lives at home.',
      source: 'scenario',
      kind: 'explicit',
      status: 'unconfirmed',
      notes: ['Caregiver stated this directly.'],
    },
    {
      id: 'fact-03',
      category: 'responsibility',
      content: 'Elena works during the week.',
      source: 'scenario',
      kind: 'explicit',
      status: 'unconfirmed',
      notes: ['Explicit work schedule described.'],
    },
    {
      id: 'fact-04',
      category: 'support',
      content: 'Her sister occasionally drives him to appointments.',
      source: 'scenario',
      kind: 'explicit',
      status: 'unconfirmed',
      notes: ['This is the current transportation arrangement.'],
    },
    {
      id: 'fact-05',
      category: 'support',
      content: 'Her sister’s availability varies.',
      source: 'scenario',
      kind: 'explicit',
      status: 'unconfirmed',
      notes: ['The caregiver said the support is not consistently available.'],
    },
    {
      id: 'fact-06',
      category: 'challenge',
      content: 'Elena finds coordination difficult.',
      source: 'scenario',
      kind: 'explicit',
      status: 'unconfirmed',
      notes: ['Explicit coordination challenge reported.'],
    },
    {
      id: 'fact-07',
      category: 'goal',
      content: 'Elena wants to organise the support available to her father and understand alternatives when her sister cannot help.',
      source: 'scenario',
      kind: 'explicit',
      status: 'unconfirmed',
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
    {
      id: 'fact-12',
      category: 'unknown',
      content: 'Whether Elena lives with her father or separately is unknown.',
      source: 'system',
      kind: 'unknown',
      status: 'unconfirmed',
      notes: ['Living arrangement has not been provided.'],
    },
    {
      id: 'fact-13',
      category: 'unknown',
      content: 'Whether Elena’s father lives alone or with someone is unknown.',
      source: 'system',
      kind: 'unknown',
      status: 'unconfirmed',
      notes: ['Household details have not been provided.'],
    },
    {
      id: 'fact-14',
      category: 'unknown',
      content: 'It is unknown who schedules or coordinates appointment times.',
      source: 'system',
      kind: 'unknown',
      status: 'unconfirmed',
      notes: ['Scheduling responsibility has not been provided.'],
    },
  ]

  return {
    schemaVersion: 2,
    facts,
    entities: [
      { id: 'elena', name: 'Elena', role: 'caregiver', detail: 'Age 42; works during the week.', status: 'unconfirmed' },
      { id: 'father', name: 'Father', role: 'recipient', detail: 'Age 78; lives at home. Household details are unknown.', status: 'unconfirmed' },
      { id: 'sister', name: 'Sister', role: 'family', detail: 'Occasionally drives her father to appointments; availability varies.', status: 'unconfirmed' },
      { id: 'transport', name: 'Appointment transport', role: 'responsibility', detail: 'Current arrangement described; other transport arrangements are unknown.', status: 'unconfirmed' },
      { id: 'scheduling', name: 'Appointment scheduling', role: 'responsibility', detail: 'Who schedules appointments is unknown.', status: 'unconfirmed' },
      { id: 'coordination', name: 'Coordination', role: 'challenge', detail: 'Elena reports that coordinating responsibilities is difficult.', status: 'unconfirmed' },
      { id: 'transport-gap', name: 'Backup transport', role: 'gap', detail: 'Potential need only; not yet confirmed.', status: 'unconfirmed' },
    ],
    relationships: [
      { id: 'elena-father', sourceId: 'elena', targetId: 'father', label: 'Provides care to', category: 'care', frequency: 'unknown', availability: 'Details not yet clarified', status: 'unconfirmed', evidenceFactId: 'fact-02', history: [] },
      { id: 'sister-father', sourceId: 'sister', targetId: 'father', label: 'Provides transportation for', category: 'support', frequency: 'occasional', availability: 'Varies', status: 'unconfirmed', evidenceFactId: 'fact-04', history: [] },
      { id: 'elena-coordination', sourceId: 'elena', targetId: 'coordination', label: 'Experiences challenge', category: 'challenge', frequency: 'unknown', availability: 'Reported by Elena', status: 'unconfirmed', evidenceFactId: 'fact-06', history: [] },
      { id: 'sister-transport-gap', sourceId: 'sister', targetId: 'transport-gap', label: 'May leave unsupported', category: 'potential-gap', frequency: 'unknown', availability: 'If no alternative is available', status: 'unconfirmed', evidenceFactId: 'fact-09', history: [] },
    ],
    clarifications: [],
    suggestedNeeds: [
      { id: 'need-transport', title: 'Transportation backup', priority: 'high', status: 'suggested', rationale: 'Her sister sometimes provides appointment transportation and availability varies.', requirements: 'No specific service or provider has been verified.', needsMoreInfo: true },
      { id: 'need-coordination', title: 'Coordinate care responsibilities', priority: 'medium', status: 'suggested', rationale: 'Elena reports that coordinating responsibilities is difficult.', requirements: 'The responsibilities Elena personally manages are not yet specified.', needsMoreInfo: true },
    ],
    narrative:
      'Elena is 42 and works during the week. She helps her 78-year-old father, who lives at home. Her sister occasionally drives him to appointments, but her availability varies. Elena finds coordinating responsibilities difficult and wants to organise the support available to her father and understand what alternatives exist when her sister cannot help.',
    priorities: ['Organise responsibilities', 'Find backup support', 'Reduce coordination stress'],
    nextSteps: [
      {
        id: 'next-01',
        title: 'Map responsibilities',
        detail: 'Clarify which tasks and coordination needs are already covered and which are still unclear.',
        needId: 'need-coordination',
        whyUseful: 'May make current responsibilities and open questions easier to see.',
        requirements: 'Elena would need to describe which tasks she manages.',
        needsMoreInfo: true,
      },
      {
        id: 'next-02',
        title: 'Plan transportation backup',
        detail: 'Identify how to manage appointments if her sister is unavailable.',
        needId: 'need-transport',
        whyUseful: 'May help explore options during periods when her sister cannot drive.',
        requirements: 'No provider or transport option is verified; appointment details are unknown.',
        needsMoreInfo: true,
      },
      {
        id: 'next-03',
        title: 'Review support network',
        detail: 'Assess whether other trusted people could help in the future.',
        needId: 'need-coordination',
        whyUseful: 'Could identify whether additional support exists, if Elena confirms it.',
        requirements: 'Other supporters are currently unknown.',
        needsMoreInfo: true,
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
  const changedAt = new Date().toISOString()
  return {
    ...map,
    facts: map.facts.map((fact) =>
      fact.id === factId ? { ...fact, status } : fact,
    ),
    relationships: map.relationships.map((relationship) => {
      if (relationship.evidenceFactId !== factId || relationship.status === status) return relationship
      return {
        ...relationship,
        status,
        history: [...relationship.history, {
          label: relationship.label,
          frequency: relationship.frequency,
          availability: relationship.availability,
          status: relationship.status,
          changedAt,
        }],
      }
    }),
    entities: map.entities.map((entity) => {
      const factEntity = factId === 'fact-01' || factId === 'fact-03' ? 'elena'
        : factId === 'fact-02' ? 'father'
          : factId === 'fact-04' || factId === 'fact-05' ? 'sister'
            : factId === 'fact-06' ? 'coordination'
              : factId === 'fact-09' || factId === 'fact-11' ? 'transport-gap'
                : factId === 'clarification-father-household' ? 'father'
                  : factId === 'clarification-elena-household' ? 'elena'
                : null
      return entity.id === factEntity ? { ...entity, status } : entity
    }),
  }
}

export function updateFactContent(map: CareMapState, factId: string, content: string): CareMapState {
  const fact = map.facts.find((item) => item.id === factId)
  if (!fact) return map
  const updatedFact = { ...fact, content, status: 'unconfirmed' as const }
  const answerStart = content.indexOf('?')
  const answerText = answerStart >= 0 ? content.slice(answerStart + 1).trim() : content
  const clarificationId = factId.startsWith('clarification-') ? factId.slice('clarification-'.length) : null
  const clarifications = clarificationId
    ? map.clarifications.map((answer) => answer.id === clarificationId ? { ...answer, answer: answerText, status: answerText ? 'answered' as const : 'skipped' as const } : answer)
    : map.clarifications
  const entityDetails: Record<string, string> = {
    'fact-01': content,
    'fact-02': content,
    'fact-03': content,
    'fact-04': content,
    'fact-06': content,
    'fact-14': content,
    'clarification-father-household': `Age 78; lives at home. Household details: ${answerText || 'unknown'}${answerText ? ' (needs review)' : ''}.`,
    'clarification-elena-household': `Age 42; works during the week. Living arrangement: ${answerText || 'unknown'}${answerText ? ' (needs review)' : ''}.`,
  }
  const entityByFact: Record<string, string> = {
    'fact-01': 'elena', 'fact-03': 'elena', 'fact-02': 'father', 'fact-04': 'sister',
    'fact-05': 'sister', 'fact-06': 'coordination', 'fact-09': 'transport-gap',
    'fact-11': 'transport-gap', 'fact-14': 'scheduling',
    'clarification-father-household': 'father', 'clarification-elena-household': 'elena',
  }
  const entityId = entityByFact[factId]
  const changedAt = new Date().toISOString()
  const relationships = map.relationships.map((relationship) => {
    const related = relationship.evidenceFactId === factId || factId === 'fact-05' && relationship.id === 'sister-father'
    if (!related) return relationship
    let frequency = relationship.frequency
    let availability = relationship.availability
    if (factId === 'fact-05') availability = `Needs review: ${content}`
    if (factId === 'clarification-transport-frequency') {
      frequency = /often|frequent|daily|weekly/i.test(answerText) ? 'frequent'
        : /occasional|sometimes/i.test(answerText) ? 'occasional'
          : /rare|seldom/i.test(answerText) ? 'rare'
            : 'unknown'
    }
    return {
      ...relationship,
      frequency,
      availability,
      evidenceFactId: factId,
      status: 'unconfirmed' as const,
      history: [...relationship.history, {
        label: relationship.label,
        frequency: relationship.frequency,
        availability: relationship.availability,
        status: relationship.status,
        changedAt,
      }],
    }
  })
  return {
    ...map,
    facts: map.facts.map((item) => item.id === factId ? updatedFact : item),
    clarifications,
    entities: entityId
      ? map.entities.map((entity) => entity.id === entityId ? { ...entity, detail: entityDetails[factId] ?? entity.detail, status: 'unconfirmed' } : entity)
      : map.entities,
    relationships,
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

export function updateRelationship(
  map: CareMapState,
  relationshipId: string,
  changes: Partial<Pick<CareMapRelationship, 'sourceId' | 'targetId' | 'label' | 'category' | 'frequency' | 'availability' | 'status'>>,
): CareMapState {
  return {
    ...map,
    relationships: map.relationships.map((relationship) =>
      relationship.id === relationshipId
        ? {
            ...relationship,
            ...changes,
            history: Object.keys(changes).some((key) => key !== 'history')
              ? [...relationship.history, {
                  label: relationship.label,
                  frequency: relationship.frequency,
                  availability: relationship.availability,
                  status: relationship.status,
                  changedAt: new Date().toISOString(),
                }]
              : relationship.history,
          }
        : relationship,
    ),
  }
}

export function updateSuggestedNeed(map: CareMapState, needId: string, changes: Partial<SuggestedNeed>): CareMapState {
  return {
    ...map,
    suggestedNeeds: map.suggestedNeeds.map((need) => need.id === needId ? { ...need, ...changes } : need),
  }
}

export function saveClarificationAnswer(map: CareMapState, id: string, prompt: string, answer: string): CareMapState {
  const trimmedAnswer = answer.trim()
  const clarification: ClarificationAnswer = {
    id,
    prompt,
    answer: trimmedAnswer,
    status: trimmedAnswer ? 'answered' : 'skipped',
  }
  const clarifications = [...map.clarifications.filter((item) => item.id !== id), clarification]
  if (!trimmedAnswer) {
    return { ...map, clarifications }
  }

  const factId = `clarification-${id}`
  const category: FactCategory = id === 'father-household' || id === 'elena-household'
    ? 'identity'
    : id === 'elena-responsibilities' ? 'responsibility'
      : id === 'elena-wellbeing' ? 'challenge'
        : 'support'
  const fact: CareMapFact = {
    id: factId,
    category,
    content: `${prompt} ${trimmedAnswer}`,
    source: 'caregiver',
    kind: 'explicit',
    status: 'unconfirmed',
    notes: ['Answer provided during progressive clarification; awaiting review.'],
  }
  const knownFrequency = id === 'transport-frequency'
    ? /often|frequent|daily|weekly/i.test(trimmedAnswer) ? 'frequent'
      : /occasional|sometimes/i.test(trimmedAnswer) ? 'occasional'
        : /rare|seldom/i.test(trimmedAnswer) ? 'rare'
          : null
    : null
  return {
    ...map,
    clarifications,
    facts: [...map.facts.filter((item) => item.id !== factId), fact],
    relationships: map.relationships.map((relationship) => relationship.id === 'sister-father' && knownFrequency
      ? {
          ...relationship,
          frequency: knownFrequency,
          status: 'unconfirmed',
          evidenceFactId: factId,
          history: [...relationship.history, {
            label: relationship.label,
            frequency: relationship.frequency,
            availability: relationship.availability,
            status: relationship.status,
            changedAt: new Date().toISOString(),
          }],
        }
      : relationship),
  }
}

export function addSupportPerson(map: CareMapState, name: string): CareMapState {
  const trimmedName = name.trim()
  if (!trimmedName) return map
  const id = `person-${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  if (map.entities.some((entity) => entity.id === id)) return map
  return {
    ...map,
    entities: [...map.entities, {
      id,
      name: trimmedName,
      role: 'family',
      detail: 'Added to the map; support type and availability have not been confirmed.',
      status: 'unconfirmed',
    }],
    relationships: [...map.relationships, {
      id: `${id}-elena-support`,
      sourceId: id,
      targetId: 'elena',
      label: 'Possible support for Elena',
      category: 'support',
      frequency: 'unknown',
      availability: 'Not yet clarified',
      status: 'unconfirmed',
      evidenceFactId: null,
      history: [],
    }],
  }
}

export function addRelationship(map: CareMapState, relationship: Omit<CareMapRelationship, 'history'>): CareMapState {
  if (relationship.sourceId === relationship.targetId || map.relationships.some((item) => item.id === relationship.id)) return map
  if (!map.entities.some((entity) => entity.id === relationship.sourceId) || !map.entities.some((entity) => entity.id === relationship.targetId)) return map
  return { ...map, relationships: [...map.relationships, { ...relationship, history: [] }] }
}

export function loadCareMapState(serialized: string | null): CareMapState {
  const initial = createInitialMap()
  if (!serialized) return initial
  try {
    const saved = JSON.parse(serialized) as Partial<CareMapState>
    const hasStructuredReview = saved.schemaVersion === 2
    const savedFacts = Array.isArray(saved.facts) ? saved.facts : []
    const migrateLegacyFact = (fact: CareMapFact) => !hasStructuredReview && fact.source === 'caregiver'
      ? { ...fact, status: 'unconfirmed' as const }
      : fact
    const facts = initial.facts.map((fact) => {
      const savedFact = savedFacts.find((item) => item.id === fact.id)
      return savedFact ? migrateLegacyFact(savedFact) : fact
    })
    facts.push(...savedFacts.filter((fact) => !initial.facts.some((item) => item.id === fact.id)).map(migrateLegacyFact))
    const savedHistory = Array.isArray(saved.history) ? saved.history : initial.history
    const nextSteps = Array.isArray(saved.nextSteps)
      ? saved.nextSteps.map((step) => ({
          ...initial.nextSteps.find((item) => item.id === step.id),
          ...step,
          needId: step.needId ?? 'need-coordination',
          whyUseful: step.whyUseful ?? step.detail,
          requirements: step.requirements ?? 'Details have not been verified.',
          needsMoreInfo: step.needsMoreInfo ?? true,
        }))
      : initial.nextSteps
    const legacyStarterNarratives = [
      'Elena is 42 years old and works during the week while helping her 78-year-old father at home. She wants to organise responsibilities and find backup support when her sister is unavailable.',
      'Elena is 42 and works during the week. She helps her 78-year-old father, who lives at home. Her sister sometimes drives him to appointments, but her availability varies. Elena finds coordination difficult and does not know who else could help.',
    ]
    const savedNarrative = typeof saved.narrative === 'string' ? saved.narrative : initial.narrative
    const state: CareMapState = {
      ...initial,
      ...saved,
      schemaVersion: 2,
      facts,
      entities: Array.isArray(saved.entities) ? saved.entities : initial.entities,
      relationships: Array.isArray(saved.relationships) ? saved.relationships : initial.relationships,
      clarifications: Array.isArray(saved.clarifications) ? saved.clarifications : [],
      suggestedNeeds: Array.isArray(saved.suggestedNeeds) ? saved.suggestedNeeds : initial.suggestedNeeds,
      narrative: !hasStructuredReview && legacyStarterNarratives.includes(savedNarrative) ? initial.narrative : savedNarrative,
      priorities: Array.isArray(saved.priorities) ? saved.priorities : initial.priorities,
      nextSteps,
      lastUpdate: typeof saved.lastUpdate === 'string' ? saved.lastUpdate : null,
      history: savedHistory,
      selectedNextStep: typeof saved.selectedNextStep === 'string' ? saved.selectedNextStep : null,
    }
    const transportRelation = state.relationships.find((item) => item.id === 'sister-father')
    const migratedUpdate = state.lastUpdate && transportRelation?.availability !== 'Unavailable for the next month'
      ? applyThreeWeekUpdate(state, state.lastUpdate)
      : state
    return !hasStructuredReview && migratedUpdate.lastUpdate
      ? {
          ...migratedUpdate,
          facts: migratedUpdate.facts.map((fact) => fact.id === 'fact-10' ? { ...fact, status: 'unconfirmed' } : fact),
          relationships: migratedUpdate.relationships.map((relationship) => relationship.id === 'sister-father' ? { ...relationship, status: 'unconfirmed' } : relationship),
        }
      : migratedUpdate
  } catch {
    return initial
  }
}

export function applyThreeWeekUpdate(map: CareMapState, updateText = 'My sister will not be available to drive my father to appointments for the next month.'): CareMapState {
  const updatedFact: CareMapFact = {
    id: 'fact-10',
    category: 'support',
    content: updateText,
    source: 'caregiver',
    kind: 'explicit',
    status: 'confirmed',
    notes: ['Three-week update provided in the fictional scenario.'],
  }

  const updatedGap: CareMapFact = {
    id: 'fact-11',
    category: 'gap',
    content: 'Alternative transportation during the next month has not been identified.',
    source: 'ai',
    kind: 'interpretation',
    status: 'unconfirmed',
    notes: ['Potential consequence only; Elena has not confirmed that no alternative exists.'],
  }

  const relationship = map.relationships.find((item) => item.id === 'sister-father')
  const previousSnapshot: RelationshipSnapshot | null = relationship ? {
    label: relationship.label,
    frequency: relationship.frequency,
    availability: relationship.availability,
    status: relationship.status,
    changedAt: 'Before three-week update',
  } : null
  const relationships = map.relationships.map((item) => item.id === 'sister-father'
    ? {
        ...item,
        availability: 'Unavailable for the next month',
        status: 'confirmed' as const,
        evidenceFactId: updatedFact.id,
        history: item.availability !== 'Unavailable for the next month' && previousSnapshot ? [...item.history, previousSnapshot] : item.history,
      }
    : item)
  const gapRelationship: CareMapRelationship = {
    id: 'sister-transport-gap',
    sourceId: 'sister',
    targetId: 'transport-gap',
    label: 'May leave unsupported during this period',
    category: 'potential-gap',
    frequency: 'unknown',
    availability: 'No backup arrangement has been confirmed',
    status: 'unconfirmed',
    evidenceFactId: updatedGap.id,
    history: [],
  }
  const previousGap = relationships.find((item) => item.id === gapRelationship.id) ?? relationships.find((item) => item.id === 'transport-gap-update')
  const gapHistory = previousGap && previousGap.label !== gapRelationship.label
    ? [...previousGap.history, {
        label: previousGap.label,
        frequency: previousGap.frequency,
        availability: previousGap.availability,
        status: previousGap.status,
        changedAt: 'Three weeks later',
      }]
    : previousGap?.history ?? []
  const facts = map.facts.filter((fact) => fact.id !== updatedFact.id && fact.id !== updatedGap.id)

  return {
    ...map,
    facts: [...facts, updatedFact, updatedGap],
    entities: map.entities.map((entity) => entity.id === 'transport'
      ? { ...entity, detail: 'Sister’s appointment transportation is unavailable for the next month; a backup remains unknown.', status: 'confirmed' }
      : entity.id === 'sister'
        ? { ...entity, detail: 'Occasionally drives her father to appointments; unavailable for the next month.', status: 'confirmed' }
        : entity),
    relationships: [
      ...relationships.filter((item) => item.id !== gapRelationship.id && item.id !== 'transport-gap-update'),
      { ...gapRelationship, history: gapHistory },
    ],
    suggestedNeeds: map.suggestedNeeds.some((need) => need.id === 'need-transport-update')
      ? map.suggestedNeeds
      : [...map.suggestedNeeds, {
          id: 'need-transport-update',
          title: 'Transportation during temporary unavailability',
          priority: 'high',
          status: 'suggested',
          rationale: 'The sister is unavailable for the next month; an alternative has not been confirmed.',
          requirements: 'Elena has not yet described available alternatives or appointment details.',
          needsMoreInfo: true,
        }],
    nextSteps: [
      {
        id: 'next-transport',
        title: 'Explore alternative transportation arrangements',
        detail: 'Consider what options Elena would like to explore for appointments during the next month.',
        needId: 'need-transport-update',
        whyUseful: 'Addresses the time-limited change in her sister’s availability.',
        requirements: 'No local provider, service availability, cost, or suitability has been verified.',
        needsMoreInfo: true,
      },
      {
        id: 'next-support',
        title: 'Clarify the support network',
        detail: 'Ask whether any other trusted person may be available, without assuming that one exists.',
        needId: 'need-transport-update',
        whyUseful: 'Could establish whether another support option is available.',
        requirements: 'Other supporters are currently unknown.',
        needsMoreInfo: true,
      },
    ],
    lastUpdate: updateText,
    history: map.history.some((entry) => entry.includes('Three-week update'))
      ? map.history
      : [...map.history, 'Three-week update: the sister’s transportation support is unavailable for the next month.'],
    selectedNextStep: null,
  }
}
