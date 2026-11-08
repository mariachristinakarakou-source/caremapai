import {
  type NeedPriority,
  type SuggestedNeed,
} from './caremap'

interface NeedsTableProps {
  needs: SuggestedNeed[]
  onChange: (needId: string, changes: Partial<SuggestedNeed>) => void
}

const PRIORITIES: NeedPriority[] = ['high', 'medium', 'low']

export function NeedsTable({ needs, onChange }: NeedsTableProps) {
  return (
    <div className="needs-table-wrap">
      <table className="needs-table">
        <thead>
          <tr>
            <th scope="col">Suggested need</th>
            <th scope="col">Suggested priority</th>
            <th scope="col">Confirmation</th>
          </tr>
        </thead>
        <tbody>
          {needs.map((need) => (
            <tr key={need.id}>
              <td>
                <input
                  aria-label={`Suggested need ${need.title}`}
                  value={need.title}
                  onChange={(event) => onChange(need.id, { title: event.target.value })}
                />
                <details className="need-explanation">
                  <summary>Why this was suggested</summary>
                  <p>{need.rationale}</p>
                  <p>{need.requirements}</p>
                  {need.needsMoreInfo && <p>Additional information is needed before this can be treated as an established need.</p>}
                </details>
              </td>
              <td>
                <select
                  aria-label={`Priority for ${need.title}`}
                  value={need.priority}
                  onChange={(event) => onChange(need.id, { priority: event.target.value as NeedPriority })}
                >
                  {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}
                </select>
              </td>
              <td>
                <div className="need-confirmation" role="group" aria-label={`Confirm ${need.title}`}>
                  <button type="button" className={need.status === 'confirmed' ? 'selected' : ''} aria-pressed={need.status === 'confirmed'} onClick={() => onChange(need.id, { status: 'confirmed' })}>Yes</button>
                  <button type="button" className={need.status === 'rejected' ? 'selected' : ''} aria-pressed={need.status === 'rejected'} onClick={() => onChange(need.id, { status: 'rejected' })}>No</button>
                  <button type="button" className={need.status === 'unresolved' ? 'selected' : ''} aria-pressed={need.status === 'unresolved'} onClick={() => onChange(need.id, { status: 'unresolved' })}>Unresolved</button>
                </div>
                <span className={`need-status ${need.status}`}>{need.status === 'suggested' ? 'Suggestion, not confirmed' : need.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {needs.length === 0 && <p className="empty-state">No suggested needs have been recorded.</p>}
    </div>
  )
}