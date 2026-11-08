import { describe, expect, it } from 'vitest'
import {
  addFact,
  addRelationship,
  addSupportPerson,
  applyThreeWeekUpdate,
  confirmGap,
  createInitialMap,
  getPersonViewItems,
  getStageFacts,
  getSupportViewItems,
  loadCareMapState,
  saveClarificationAnswer,
  updateFactStatus,
  updateFactContent,
  updateRelationship,
  updateSuggestedNeed,
  type CareMapFact,
} from './caremap'
import { STAGES } from './workflow'

describe('CareMap workflow state', () => {
  it('exposes the exact nine-stage journey in order', () => {
    expect(STAGES).toHaveLength(9)
    expect(STAGES.map((stage) => stage.title)).toEqual([
      'Initial Input',
      'Follow-up Questions and Clarification',
      'Review and Confirmation',
      'Generated Care Maps',
      'Care Needs and Next Steps',
      'Care Situation Updates',
      'Updated Care Maps',
      'Updated Care Needs and Suggested Next Steps',
      'Final Care Overview',
    ])
  })

  it('creates a valid Elena scenario with explicit and unknown facts', () => {
    const map = createInitialMap()

    expect(map.facts.length).toBeGreaterThan(0)
    expect(map.facts.some((fact) => fact.category === 'identity' && fact.kind === 'explicit')).toBe(true)
    expect(map.facts.some((fact) => fact.category === 'unknown' && fact.kind === 'unknown')).toBe(true)
    expect(map.facts.some((fact) => fact.category === 'gap' && fact.kind === 'interpretation')).toBe(true)
  })

  it('tracks fact status transitions and prevents duplicate IDs', () => {
    const map = createInitialMap()
    const existing = map.facts[0]
    const updatedMap = addFact(map, {
      id: 'test-1',
      category: 'support',
      content: 'Sample support fact',
      source: 'caregiver',
      kind: 'explicit',
      status: 'unconfirmed',
      notes: [],
    })

    expect(updatedMap.facts.some((fact) => fact.id === 'test-1')).toBe(true)
    expect(() => addFact(map, { ...existing, id: existing.id })).toThrow(/duplicate/i)

    const updated = updateFactStatus(updatedMap, 'test-1', 'confirmed')
    expect(updated.facts.find((fact) => fact.id === 'test-1')?.status).toBe('confirmed')
    const confirmedScenario = updateFactStatus(createInitialMap(), 'fact-04', 'confirmed')
    expect(confirmedScenario.relationships.find((relationship) => relationship.id === 'sister-father')?.status).toBe('confirmed')
    const editedRelationshipFact = updateFactContent(confirmedScenario, 'fact-05', 'Her sister is sometimes unavailable.')
    expect(editedRelationshipFact.relationships.find((relationship) => relationship.id === 'sister-father')?.availability).toContain('Needs review')
    expect(editedRelationshipFact.relationships.find((relationship) => relationship.id === 'sister-father')?.status).toBe('unconfirmed')
  })

  it('applies the three-week temporary unavailability update without resetting the earlier map', () => {
    const updated = applyThreeWeekUpdate(createInitialMap())
    const updatedAgain = applyThreeWeekUpdate(updated)

    expect(updated.facts.some((fact) => fact.content.includes('will not be available to drive'))).toBe(true)
    expect(updated.facts.some((fact) => fact.id === 'fact-04')).toBe(true)
    expect(updated.facts.some((fact) => fact.id === 'fact-09')).toBe(true)
    expect(updated.facts.some((fact) => fact.category === 'gap' && fact.status === 'unconfirmed')).toBe(true)
    expect(updated.nextSteps.some((step) => step.title.includes('transport'))).toBe(true)
    expect(updated.history.some((entry) => entry.includes('Three-week update'))).toBe(true)
    const transport = updated.relationships.find((relationship) => relationship.id === 'sister-father')
    expect(transport?.availability).toBe('Unavailable for the next month')
    expect(transport?.history[0]?.availability).toBe('Varies')
    expect(updated.suggestedNeeds.some((need) => need.id === 'need-transport-update')).toBe(true)
    expect(updatedAgain.relationships.filter((relationship) => relationship.id === 'sister-transport-gap')).toHaveLength(1)
    expect(updatedAgain.relationships.find((relationship) => relationship.id === 'sister-father')?.history).toHaveLength(1)
    expect(updated.entities.find((entity) => entity.id === 'sister')?.detail).toContain('unavailable for the next month')
    expect(createInitialMap().facts.find((fact) => fact.id === 'fact-14')?.kind).toBe('unknown')
  })

  it('stores progressive answers and support people in the shared map', () => {
    const map = createInitialMap()
    const answered = saveClarificationAnswer(map, 'father-home', 'Where does your father live?', 'At home')
    const skipped = saveClarificationAnswer(answered, 'other-support', 'Who else helps?', '')
    const withFrequency = saveClarificationAnswer(skipped, 'transport-frequency', 'How often does your sister help?', 'Occasionally')
    const withPerson = addSupportPerson(withFrequency, 'Aunt May')
    const withNewRelationship = addRelationship(withPerson, {
      id: 'aunt-father',
      sourceId: 'person-aunt-may',
      targetId: 'father',
      label: 'Possible practical support for',
      category: 'support',
      frequency: 'unknown',
      availability: 'Not yet clarified',
      status: 'unconfirmed',
      evidenceFactId: null,
    })

    expect(withPerson.clarifications.find((answer) => answer.id === 'father-home')?.status).toBe('answered')
    expect(withPerson.clarifications.find((answer) => answer.id === 'other-support')?.status).toBe('skipped')
    expect(withPerson.facts.some((fact) => fact.content.includes('At home'))).toBe(true)
    expect(withPerson.relationships.some((relationship) => relationship.sourceId.startsWith('person-aunt-may'))).toBe(true)
    expect(withPerson.relationships.find((relationship) => relationship.id === 'sister-father')?.frequency).toBe('occasional')
    expect(withPerson.relationships.find((relationship) => relationship.id === 'sister-father')?.status).toBe('unconfirmed')
    expect(withNewRelationship.relationships.some((relationship) => relationship.id === 'aunt-father')).toBe(true)
  })

  it('records edits, confirms needs, and migrates older saved maps without losing prior details', () => {
    const initial = createInitialMap()
    const edited = updateRelationship(initial, 'sister-father', { availability: 'Usually varies' })
    const needsReviewed = updateSuggestedNeed(edited, 'need-transport', { status: 'confirmed', priority: 'high' })
    const legacy = { ...needsReviewed, schemaVersion: undefined, entities: undefined, relationships: undefined, suggestedNeeds: undefined, lastUpdate: 'My sister is unavailable for the next month.' }
    const migrated = loadCareMapState(JSON.stringify(legacy))

    expect(edited.relationships.find((relationship) => relationship.id === 'sister-father')?.history).toHaveLength(1)
    expect(migrated.relationships.find((relationship) => relationship.id === 'sister-father')?.availability).toBe('Unavailable for the next month')
    expect(migrated.facts.some((fact) => fact.id === 'fact-04')).toBe(true)
    expect(migrated.facts.find((fact) => fact.id === 'fact-01')?.status).toBe('unconfirmed')
    expect(migrated.facts.find((fact) => fact.id === 'fact-10')?.status).toBe('unconfirmed')
    expect(migrated.history.some((entry) => entry.includes('Three-week update'))).toBe(true)
  })

  it('builds stage-specific and view-specific fact sets from one underlying model', () => {
    const map = createInitialMap()
    const draftFacts = getStageFacts(map, 'draft')
    const supportFacts = getSupportViewItems(map)
    const personFacts = getPersonViewItems(map)

    expect(draftFacts.length).toBeGreaterThan(0)
    expect(supportFacts.length).toBeGreaterThan(0)
    expect(personFacts.length).toBeGreaterThan(0)
  })

  it('allows a caregiver to confirm or reject a suggested gap interpretation', () => {
    const map = createInitialMap()
    const gapFact = map.facts.find((fact) => fact.category === 'gap')

    expect(gapFact).toBeDefined()
    const confirmed = confirmGap(map, gapFact!.id, true)
    expect(confirmed.facts.find((fact) => fact.id === gapFact!.id)?.status).toBe('confirmed')

    const rejected = confirmGap(map, gapFact!.id, false)
    expect(rejected.facts.find((fact) => fact.id === gapFact!.id)?.status).toBe('rejected')
  })
})

const testFact: CareMapFact = {
  id: 'test-1',
  category: 'support',
  content: 'Temporary testing fact',
  source: 'caregiver',
  kind: 'explicit',
  status: 'unconfirmed',
  notes: [],
}

describe('helper data shape', () => {
  it('exposes a stable fact schema', () => {
    expect(testFact.status).toBe('unconfirmed')
    expect(testFact.kind).toBe('explicit')
  })
})
