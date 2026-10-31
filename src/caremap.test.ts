import { describe, expect, it } from 'vitest'
import {
  addFact,
  applyThreeWeekUpdate,
  confirmGap,
  createInitialMap,
  getPersonViewItems,
  getStageFacts,
  getSupportViewItems,
  updateFactStatus,
  type CareMapFact,
} from './caremap'
import { STAGES } from './workflow'

describe('CareMap workflow state', () => {
  it('exposes the exact nine-stage journey in order', () => {
    expect(STAGES).toHaveLength(9)
    expect(STAGES.map((stage) => stage.title)).toEqual([
      'Initial Input',
      'AI-Generated Draft',
      'Review & Clarification',
      'Two Views of One Map',
      'Gap Confirmation & Next Steps',
      'Time-Based Update',
      'Updated Care Map',
      'Suggested Next Steps After Update',
      'Final Result',
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
  })

  it('applies the three-week temporary unavailability update without resetting the earlier map', () => {
    const updated = applyThreeWeekUpdate(createInitialMap())

    expect(updated.facts.some((fact) => fact.content.includes('will not be available to drive'))).toBe(true)
    expect(updated.facts.some((fact) => fact.id === 'fact-04')).toBe(true)
    expect(updated.facts.some((fact) => fact.id === 'fact-09')).toBe(true)
    expect(updated.facts.some((fact) => fact.category === 'gap' && fact.status === 'unconfirmed')).toBe(true)
    expect(updated.nextSteps.some((step) => step.title.includes('transport'))).toBe(true)
    expect(updated.history.some((entry) => entry.includes('Three-week update'))).toBe(true)
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
