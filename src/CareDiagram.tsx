import { useId, useState, type FormEvent } from 'react'
import {
  type CareMapRelationship,
  type CareMapState,
  type RelationshipCategory,
  type SupportFrequency,
} from './caremap'

interface CareDiagramProps {
  map: CareMapState
  view: 'caregiver' | 'recipient'
  onRelationshipChange: (relationshipId: string, changes: Partial<CareMapRelationship>) => void
  onAddRelationship: (relationship: Omit<CareMapRelationship, 'history'>) => void
  onAddSupportPerson: (name: string) => void
}

interface Position {
  x: number
  y: number
}

const NODE_WIDTH = 174
const NODE_HEIGHT = 96
const CANVAS_WIDTH = 740

export function CareDiagram({ map, view, onRelationshipChange, onAddRelationship, onAddSupportPerson }: CareDiagramProps) {
  const markerId = `arrow-${useId().replaceAll(':', '')}`
  const [selectedId, setSelectedId] = useState(map.relationships[0]?.id ?? '')
  const [personName, setPersonName] = useState('')
  const [draft, setDraft] = useState<Partial<CareMapRelationship>>({})
  const [newSource, setNewSource] = useState('elena')
  const [newTarget, setNewTarget] = useState('father')
  const [newLabel, setNewLabel] = useState('')
  const [newCategory, setNewCategory] = useState<RelationshipCategory>('support')
  const visibleEntities = view === 'recipient'
    ? map.entities.filter((entity) => entity.role !== 'challenge' || entity.id === 'coordination')
    : map.entities.filter((entity) => entity.role === 'caregiver' || entity.role === 'challenge' || map.relationships.some((relationship) => relationship.targetId === 'elena' && relationship.sourceId === entity.id))
  const visibleIds = new Set(visibleEntities.map((entity) => entity.id))
  const visibleRelationships = map.relationships.filter((relationship) => visibleIds.has(relationship.sourceId) && visibleIds.has(relationship.targetId))
  const selected = visibleRelationships.find((relationship) => relationship.id === selectedId) ?? visibleRelationships[0]
  const addedPeople = visibleEntities.filter((entity) => entity.role === 'family' && entity.id !== 'sister')
  const canvasHeight = view === 'recipient' ? 470 + Math.ceil(addedPeople.length / 3) * 125 : Math.max(280, 280 + Math.max(0, addedPeople.length - 1) * 120)
  const visibleSource = visibleIds.has(newSource) ? newSource : visibleEntities[0]?.id ?? ''
  const visibleTarget = visibleIds.has(newTarget) ? newTarget : visibleEntities[1]?.id ?? ''

  const positions = new Map<string, Position>()
  if (view === 'recipient') {
    const fixed: Record<string, Position> = {
      elena: { x: 24, y: 34 },
      father: { x: 280, y: 34 },
      sister: { x: 536, y: 34 },
      transport: { x: 280, y: 204 },
      coordination: { x: 24, y: 204 },
      'transport-gap': { x: 536, y: 204 },
      scheduling: { x: 280, y: 354 },
    }
    visibleEntities.forEach((entity, index) => {
      positions.set(entity.id, fixed[entity.id] ?? { x: 24 + ((index % 3) * 256), y: 354 + Math.floor(index / 3) * 125 })
    })
  } else {
    positions.set('elena', { x: 24, y: 48 })
    positions.set('coordination', { x: 350, y: 48 })
    addedPeople.forEach((entity, index) => positions.set(entity.id, { x: 350, y: 184 + index * 120 }))
  }

  const entityById = new Map(visibleEntities.map((entity) => [entity.id, entity]))
  const pointFor = (id: string) => {
    const position = positions.get(id)
    return position ? { x: position.x + NODE_WIDTH / 2, y: position.y + NODE_HEIGHT / 2 } : null
  }

  const handleEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    onRelationshipChange(selected.id, draft)
    setDraft({})
  }

  return (
    <section className="diagram-section" aria-label={view === 'caregiver' ? 'Support for Elena care diagram' : 'Support for father care diagram'}>
      <div className="diagram-legend" aria-label="Diagram legend">
        <span><i className="legend-line confirmed" /> Confirmed</span>
        <span><i className="legend-line pending" /> Needs review</span>
        <span><i className="legend-line potential" /> Potential gap</span>
      </div>
      <div className="diagram-scroll" tabIndex={0} aria-label="Scrollable Care Diagram">
        <div className="diagram-canvas" style={{ width: CANVAS_WIDTH, height: canvasHeight }}>
          <svg className="diagram-edges" viewBox={`0 0 ${CANVAS_WIDTH} ${canvasHeight}`} aria-hidden="true">
            <defs>
              <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>
            {visibleRelationships.map((relationship) => {
              const from = pointFor(relationship.sourceId)
              const to = pointFor(relationship.targetId)
              if (!from || !to) return null
              const distance = Math.hypot(to.x - from.x, to.y - from.y) || 1
              const offsetX = ((to.x - from.x) / distance) * 88
              const offsetY = ((to.y - from.y) / distance) * 50
              const strokeWidth = relationship.frequency === 'frequent' ? 4 : relationship.frequency === 'rare' ? 1 : 2
              return (
                <g key={relationship.id} className={`diagram-edge ${relationship.category} ${relationship.status}`}>
                  <line
                    x1={from.x + offsetX}
                    y1={from.y + offsetY}
                    x2={to.x - offsetX}
                    y2={to.y - offsetY}
                    strokeWidth={strokeWidth}
                    markerEnd={`url(#${markerId})`}
                  />
                  <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 7} textAnchor="middle">
                    {relationship.label}
                  </text>
                  {relationship.frequency !== 'unknown' && (
                    <text className="edge-frequency" x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 + 10} textAnchor="middle">
                      {relationship.frequency}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
          {visibleEntities.map((entity) => {
            const position = positions.get(entity.id)
            if (!position) return null
            return (
              <article
                key={entity.id}
                className={`diagram-node ${entity.role} ${entity.status}`}
                style={{ left: position.x, top: position.y }}
              >
                <span className="node-role">{entity.role}</span>
                <strong>{entity.name}</strong>
                <span className="node-detail">{entity.detail}</span>
                <span className={`node-status ${entity.status}`}>{entity.status === 'confirmed' ? 'Confirmed' : 'Needs review'}</span>
              </article>
            )
          })}
        </div>
      </div>

      {view === 'caregiver' && !visibleRelationships.some((relationship) => relationship.targetId === 'elena' && relationship.category === 'support') && (
        <p className="diagram-empty-note">No personal supporters for Elena have been identified yet. Add a person only if she confirms they are part of her support network.</p>
      )}

      <details className="relationship-editor">
        <summary>Edit relationships</summary>
        {visibleRelationships.length > 0 && (
          <form onSubmit={handleEdit}>
            <label>
              Relationship
              <select value={selected.id} onChange={(event) => { setSelectedId(event.target.value); setDraft({}) }}>
                {visibleRelationships.map((relationship) => (
                  <option key={relationship.id} value={relationship.id}>
                    {entityById.get(relationship.sourceId)?.name} → {entityById.get(relationship.targetId)?.name}
                  </option>
                ))}
              </select>
            </label>
            {selected && (
              <>
                <label>
                  Label
                  <input value={draft.label ?? selected.label} onChange={(event) => setDraft((previous) => ({ ...previous, label: event.target.value }))} />
                </label>
                <label>
                  Frequency
                  <select value={draft.frequency ?? selected.frequency} onChange={(event) => setDraft((previous) => ({ ...previous, frequency: event.target.value as SupportFrequency }))}>
                    <option value="unknown">Unknown</option>
                    <option value="frequent">Frequent</option>
                    <option value="occasional">Occasional</option>
                    <option value="rare">Rare</option>
                  </select>
                </label>
                <label>
                  Availability
                  <input value={draft.availability ?? selected.availability} onChange={(event) => setDraft((previous) => ({ ...previous, availability: event.target.value }))} />
                </label>
                <label>
                  Review status
                  <select value={draft.status ?? selected.status} onChange={(event) => setDraft((previous) => ({ ...previous, status: event.target.value as CareMapRelationship['status'] }))}>
                    <option value="unconfirmed">Needs review</option>
                    <option value="confirmed">Caregiver confirmed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>
                <button className="secondary-button" type="submit">Save relationship</button>
              </>
            )}
          </form>
        )}
        <form className="add-person-form" onSubmit={(event) => { event.preventDefault(); onAddSupportPerson(personName); setPersonName('') }}>
          <label>
            Add a support person
            <input value={personName} onChange={(event) => setPersonName(event.target.value)} placeholder="Name" />
          </label>
          <button className="secondary-button" type="submit" disabled={!personName.trim()}>Add person</button>
        </form>
        <form className="add-relationship-form" onSubmit={(event) => {
          event.preventDefault()
          if (!newLabel.trim() || visibleSource === visibleTarget) return
          onAddRelationship({
            id: `relationship-${Date.now()}`,
            sourceId: visibleSource,
            targetId: visibleTarget,
            label: newLabel.trim(),
            category: newCategory,
            frequency: 'unknown',
            availability: 'Not yet clarified',
            status: 'unconfirmed',
            evidenceFactId: null,
          })
          setNewLabel('')
        }}>
          <label>
            Add relationship · from
            <select value={visibleSource} onChange={(event) => setNewSource(event.target.value)}>
              {visibleEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
            </select>
          </label>
          <label>
            To
            <select value={visibleTarget} onChange={(event) => setNewTarget(event.target.value)}>
              {visibleEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
            </select>
          </label>
          <label>
            Relationship label
            <input value={newLabel} onChange={(event) => setNewLabel(event.target.value)} placeholder="e.g. Provides practical support to" />
          </label>
          <label>
            Category
            <select value={newCategory} onChange={(event) => setNewCategory(event.target.value as RelationshipCategory)}>
              <option value="care">Care</option>
              <option value="support">Support</option>
              <option value="responsibility">Responsibility</option>
              <option value="challenge">Challenge</option>
              <option value="potential-gap">Potential gap</option>
            </select>
          </label>
          <button className="secondary-button" type="submit" disabled={!newLabel.trim() || visibleSource === visibleTarget}>Add relationship</button>
        </form>
      </details>
    </section>
  )
}