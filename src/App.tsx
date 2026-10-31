import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  applyThreeWeekUpdate,
  confirmGap,
  createInitialMap,
  getPersonViewItems,
  getStageFacts,
  getSupportViewItems,
  updateFactStatus,
  type CareMapFact,
  type CareMapState,
} from './caremap'
import { STAGES } from './workflow'

const STORAGE_KEY = 'caremap-ai-state-v1'

function getStatusLabel(status: CareMapFact['status']) {
  switch (status) {
    case 'confirmed':
      return 'Confirmed by caregiver'
    case 'rejected':
      return 'Rejected by caregiver'
    default:
      return 'Unconfirmed'
  }
}

function App() {
  const [careMap, setCareMap] = useState<CareMapState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<CareMapState>
        const initial = createInitialMap()
        const savedFacts = Array.isArray(parsed.facts) ? parsed.facts : []
        const mergedFacts = initial.facts.map((fact) => savedFacts.find((savedFact) => savedFact.id === fact.id) ?? fact)
        mergedFacts.push(...savedFacts.filter((fact) => !initial.facts.some((initialFact) => initialFact.id === fact.id)))
        const savedHistory = Array.isArray(parsed.history) ? parsed.history : []
        return {
          ...initial,
          ...parsed,
          facts: mergedFacts,
          narrative: typeof parsed.narrative === 'string' ? parsed.narrative : initial.narrative,
          priorities: Array.isArray(parsed.priorities) ? parsed.priorities : initial.priorities,
          nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : initial.nextSteps,
          lastUpdate: typeof parsed.lastUpdate === 'string' ? parsed.lastUpdate : null,
          history: typeof parsed.lastUpdate === 'string'
            ? savedHistory.some((entry) => entry.includes('Three-week update'))
              ? savedHistory
              : [...(savedHistory.length > 0 ? savedHistory : initial.history), 'Three-week update: the sister’s transportation support is temporarily unavailable for the next month.']
            : savedHistory.length > 0 ? savedHistory : initial.history,
          selectedNextStep: typeof parsed.selectedNextStep === 'string' ? parsed.selectedNextStep : null,
        }
      }
    } catch {
      // Local prototype storage is intentionally limited and not a secure clinical database.
    }
    return createInitialMap()
  })
  const [currentStage, setCurrentStage] = useState(0)
  const [narrative, setNarrative] = useState(careMap.narrative)
  const [priority, setPriority] = useState(careMap.priorities[0] ?? 'Organise responsibilities')
  const [gapDecision, setGapDecision] = useState<'confirm' | 'reject' | 'skip' | null>(null)
  const [transportHelpDecision, setTransportHelpDecision] = useState<'yes' | 'no' | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(careMap))
    } catch {
      // Local storage is intentionally prototype-only.
    }
  }, [careMap])

  const stageFacts = useMemo(() => getStageFacts(careMap, 'draft'), [careMap])
  const supportFacts = useMemo(() => getSupportViewItems(careMap), [careMap])
  const personFacts = useMemo(() => getPersonViewItems(careMap), [careMap])
  const currentStepLabel = `Step ${currentStage + 1} of ${STAGES.length}`
  const confirmedCount = careMap.facts.filter((fact) => fact.status === 'confirmed').length
  const unresolvedCount = careMap.facts.filter((fact) => fact.status === 'unconfirmed' || fact.kind === 'unknown').length
  const contextCopy = currentStage < 2
    ? 'A working map of the people, responsibilities, and support described so far.'
    : currentStage < 5
      ? 'Review what is known, what remains uncertain, and the gap Elena can confirm.'
      : careMap.lastUpdate
        ? 'The map now includes the temporary change to appointment transportation.'
        : 'The existing map stays in place until Elena reports a change.'
  const contextFacts = currentStage >= 5
    ? [...careMap.facts.slice(0, 3), ...careMap.facts.slice(-2)]
    : careMap.facts.slice(0, 4)

  const goNext = () => setCurrentStage((stage) => Math.min(stage + 1, STAGES.length - 1))
  const goBack = () => setCurrentStage((stage) => Math.max(stage - 1, 0))

  const handleFactEdit = (factId: string, newText: string) => {
    setCareMap((previous) => ({
      ...previous,
      facts: previous.facts.map((fact) => (fact.id === factId ? { ...fact, content: newText } : fact)),
    }))
  }

  const handleFactStatus = (factId: string, nextStatus: CareMapFact['status']) => {
    setCareMap((previous) => updateFactStatus(previous, factId, nextStatus))
  }

  const handleGapResponse = (choice: 'confirm' | 'reject' | 'skip') => {
    setGapDecision(choice)
    const gapFact = careMap.facts.find((fact) => fact.category === 'gap' && fact.kind === 'interpretation')
    if (!gapFact) {
      return
    }

    if (choice === 'skip') {
      setCareMap((previous) => updateFactStatus(previous, gapFact.id, 'unconfirmed'))
      return
    }

    setCareMap((previous) => {
      const next = confirmGap(previous, gapFact.id, choice === 'confirm')
      return {
        ...next,
        history: [...next.history, `Gap review: ${choice === 'confirm' ? 'confirmed' : 'rejected'} the transportation backup interpretation.`],
      }
    })
  }

  const handleThreeWeekUpdate = () => {
    setCareMap((previous) => applyThreeWeekUpdate(previous))
    setTransportHelpDecision(null)
  }

  const handleTransportHelpResponse = (choice: 'yes' | 'no') => {
    setTransportHelpDecision(choice)
    setCareMap((previous) => ({
      ...previous,
      nextSteps: previous.nextSteps.map((step) =>
        step.id === 'next-transport'
          ? {
              ...step,
              detail:
                choice === 'yes'
                  ? 'Elena wants help identifying alternative transportation options for appointments.'
                  : 'Elena is not requesting transportation alternatives at this stage, but the gap remains noted.',
            }
          : step,
      ),
    }))
  }

  const handleSelectedNextStep = (id: string) => {
    setCareMap((previous) => ({ ...previous, selectedNextStep: id }))
  }

  const currentPriority = priority || careMap.priorities[0] || 'Organise responsibilities'

  return (
    <div className="caremap-shell">
      <aside className="sidebar">
        <div className="brand-wrap">
          <div className="brand-icon">✦</div>
          <div>
            <div className="brand-name">CareMap AI</div>
            <div className="tagline">Care map. Two views. Better support.</div>
          </div>
        </div>

        <nav className="stage-nav" aria-label="Workflow stages">
          {STAGES.map((stage, index) => (
            <button
              key={stage.id}
              type="button"
              className={`stage-item ${currentStage === index ? 'active' : ''} ${currentStage > index ? 'completed' : ''}`}
              onClick={() => setCurrentStage(index)}
              aria-current={currentStage === index ? 'step' : undefined}
            >
              <span className="stage-number">{index + 1}</span>
              <span className="stage-copy">
                <span className="stage-title">{stage.title}</span>
                <span className="stage-subtitle">{stage.subtitle}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="privacy-note">Privacy note: local prototype only.</div>
      </aside>

      <main className="main-panel">
        <div className="progress-header">
          <div className="progress-pill">{currentStepLabel}</div>
          <div className="progress-bar" aria-hidden="true">
            {STAGES.map((stage, index) => (
              <span
                key={stage.id}
                className={`progress-step ${index <= currentStage ? 'filled' : ''}`}
                aria-label={`Stage ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {currentStage === 0 && (
          <section className="stage-panel">
            <p className="eyebrow">Stage 1</p>
            <h1>Tell us about your caregiving situation</h1>
            <p className="intro-text">
              Elena is 42 and works during the week. She helps her 78-year-old father, who lives at home. Her sister sometimes drives him to appointments, but her availability varies. Elena finds coordination difficult and does not know who else could help.
            </p>

            <label className="field-label" htmlFor="narrative">Describe her caregiving situation</label>
            <textarea
              id="narrative"
              value={narrative}
              onChange={(event) => {
                setNarrative(event.target.value)
                setCareMap((previous) => ({ ...previous, narrative: event.target.value }))
              }}
              rows={6}
            />

            <div className="field-block">
              <label className="field-label" htmlFor="priority">What would you most like help with?</label>
              <select
                id="priority"
                value={currentPriority}
                onChange={(event) => {
                  const nextPriority = event.target.value
                  setPriority(nextPriority)
                  setCareMap((previous) => ({
                    ...previous,
                    priorities: [nextPriority, ...previous.priorities.filter((item) => item !== nextPriority)],
                  }))
                }}
              >
                <option>Organise responsibilities</option>
                <option>Find backup support</option>
                <option>Reduce coordination stress</option>
                <option>Plan practical next steps</option>
              </select>
            </div>

            <div className="info-callout">
              Questions can be skipped and unknown information can remain unknown.
            </div>

            <div className="button-row">
              <button type="button" className="primary-button" onClick={goNext}>Continue</button>
            </div>
          </section>
        )}

        {currentStage === 1 && (
          <section className="stage-panel">
            <p className="eyebrow">Stage 2</p>
            <h1>Your first Care Map draft</h1>
            <p className="intro-text">
              This demonstration uses a deterministic extraction from Elena’s account. It is not a live LLM response.
            </p>

            <div className="draft-grid">
              {stageFacts.map((fact) => (
                <article key={fact.id} className={`fact-card ${fact.kind}`}>
                  <div className="fact-meta">
                    <span>{fact.category}</span>
                    <span>{fact.kind}</span>
                    <span>{fact.source}</span>
                  </div>
                  <p>{fact.content}</p>
                  <div className="fact-footer">
                    <strong>Status:</strong> {getStatusLabel(fact.status)}
                  </div>
                </article>
              ))}
            </div>

            <div className="button-row">
              <button type="button" className="secondary-button" onClick={goBack}>Back</button>
              <button type="button" className="primary-button" onClick={goNext}>Continue</button>
            </div>
          </section>
        )}

        {currentStage === 2 && (
          <section className="stage-panel">
            <p className="eyebrow">Stage 3</p>
            <h1>Review your Care Map</h1>
            <p className="intro-text">
              Review extracted facts, edit inaccuracies, confirm the information Elena accepts, and leave unknown details unresolved.
            </p>

            <div className="review-list">
              {careMap.facts.map((fact) => (
                <article key={fact.id} className="review-item">
                  <div className="fact-editor">
                      <textarea
                        value={fact.content}
                        onChange={(event) => handleFactEdit(fact.id, event.target.value)}
                        disabled={fact.kind === 'unknown'}
                        aria-label={`Edit fact: ${fact.content}`}
                      />
                  </div>
                  <div className="review-actions">
                    <span className="status-badge">{fact.status}</span>
                    <button type="button" disabled={fact.kind === 'unknown'} onClick={() => handleFactStatus(fact.id, 'confirmed')}>Confirm</button>
                    <button type="button" disabled={fact.kind === 'unknown'} onClick={() => handleFactStatus(fact.id, 'rejected')}>Reject</button>
                    <button type="button" onClick={() => handleFactStatus(fact.id, 'unconfirmed')}>Unclear</button>
                  </div>
                </article>
              ))}
            </div>

            <div className="button-row">
              <button type="button" className="secondary-button" onClick={goBack}>Back</button>
              <button type="button" className="primary-button" onClick={goNext}>Continue</button>
            </div>
          </section>
        )}

        {currentStage === 3 && (
          <section className="stage-panel">
            <p className="eyebrow">Stage 4</p>
            <h1>Your Care Map, two perspectives</h1>
            <p className="intro-text">
              These two views are derived from one underlying Care Map and stay in sync with the same records.
            </p>

            <div className="view-grid">
              <div className="view-panel">
                <h2>Support for me</h2>
                <ul>
                  {supportFacts.map((fact) => (
                    <li key={fact.id}>{fact.content}</li>
                  ))}
                </ul>
              </div>

              <div className="view-panel">
                <h2>Support for the person I care for</h2>
                <ul>
                  {personFacts.map((fact) => (
                    <li key={fact.id}>{fact.content}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="button-row">
              <button type="button" className="secondary-button" onClick={goBack}>Back</button>
              <button type="button" className="primary-button" onClick={goNext}>Continue</button>
            </div>
          </section>
        )}

        {currentStage === 4 && (
          <section className="stage-panel">
            <p className="eyebrow">Stage 5</p>
            <h1>Check potential gaps</h1>
            <div className="gap-callout large">
              <p>It looks like you may need a backup option for transportation when your sister is unavailable. Is that correct?</p>
              <div className="gap-actions">
                <button type="button" onClick={() => handleGapResponse('confirm')}>Confirm</button>
                <button type="button" onClick={() => handleGapResponse('reject')}>Reject</button>
                <button type="button" onClick={() => handleGapResponse('skip')}>Leave unresolved</button>
              </div>
              {gapDecision && <p className="decision-note">Current response: {gapDecision}</p>}
            </div>

            <section className="gap-next-steps" aria-labelledby="gap-next-steps-title">
              <h2 id="gap-next-steps-title">Possible next steps</h2>
              <div className="next-step-list">
                {careMap.nextSteps.slice(0, 2).map((step) => (
                  <article key={step.id} className="next-step-item">
                    <h3>{step.title}</h3>
                    <p>{step.detail}</p>
                  </article>
                ))}
              </div>
              <p className="suggestion-note">These are general suggestions, not verified services or resources.</p>
            </section>

            <div className="button-row">
              <button type="button" className="secondary-button" onClick={goBack}>Back</button>
              <button type="button" className="primary-button" onClick={goNext}>Continue</button>
            </div>
          </section>
        )}

        {currentStage === 5 && (
          <section className="stage-panel">
            <p className="eyebrow">Stage 6</p>
            <h1>Update your situation</h1>
            <p className="intro-text">
              Three weeks later, Elena reports: “My sister will not be available to drive my father to appointments for the next month.”
            </p>
            <div className="three-week-update">
              {careMap.lastUpdate ? (
                <>
                  <p className="update-status">Update added to the shared Care Map</p>
                  <p>{careMap.lastUpdate}</p>
                  <button type="button" className="primary-button" onClick={goNext}>Review updated map</button>
                </>
              ) : (
                <>
                  <h3>Three-week update</h3>
                  <p>This reported change will be added alongside the original support information.</p>
                  <button type="button" className="primary-button" onClick={handleThreeWeekUpdate}>Apply update</button>
                </>
              )}
            </div>

            <div className="button-row">
              <button type="button" className="secondary-button" onClick={goBack}>Back</button>
            </div>
          </section>
        )}

        {currentStage === 6 && (
          <section className="stage-panel">
            <p className="eyebrow">Stage 7</p>
            <h1>Your updated Care Map</h1>
            <p className="intro-text">
              Updated information is displayed without discarding the earlier Care Map history.
            </p>

            <div className="change-summary">
              <h3>Change summary</h3>
              <ul>
                {careMap.history.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </div>

            <div className="update-facts">
              <article className="fact-card previous-fact">
                <span className="fact-label">Previously reported</span>
                <p>{careMap.facts.find((fact) => fact.id === 'fact-04')?.content ?? 'No previous transportation arrangement recorded.'}</p>
              </article>
              <article className="fact-card new-fact">
                <span className="fact-label">New update</span>
                <p>{careMap.facts.find((fact) => fact.id === 'fact-10')?.content ?? 'No time-based update has been recorded.'}</p>
              </article>
              <article className="fact-card interpretation">
                <span className="fact-label">Unresolved interpretation</span>
                <p>{careMap.facts.find((fact) => fact.id === 'fact-11')?.content ?? 'No new interpretation has been added.'}</p>
              </article>
            </div>

            <div className="view-grid">
              <div className="view-panel">
                <h2>Support for me</h2>
                <ul>
                  {supportFacts.map((fact) => (
                    <li key={fact.id}>{fact.content}</li>
                  ))}
                </ul>
              </div>

              <div className="view-panel">
                <h2>Support for the person I care for</h2>
                <ul>
                  {personFacts.map((fact) => (
                    <li key={fact.id}>{fact.content}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="button-row">
              <button type="button" className="secondary-button" onClick={goBack}>Back</button>
              <button type="button" className="primary-button" onClick={goNext}>Continue</button>
            </div>
          </section>
        )}

        {currentStage === 7 && (
          <section className="stage-panel">
            <p className="eyebrow">Stage 8</p>
            <h1>Explore your next steps</h1>
            <p className="intro-text">
              These are suggestions, not verified local resources. Review which action feels useful before proceeding.
            </p>

            <div className="next-step-list">
              {careMap.nextSteps.map((step) => (
                <button
                  type="button"
                  key={step.id}
                  className={`next-step-item ${careMap.selectedNextStep === step.id ? 'selected' : ''}`}
                  onClick={() => handleSelectedNextStep(step.id)}
                >
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </button>
              ))}
            </div>

            {careMap.lastUpdate && (
              <div className="gap-callout">
                <p>Would you like help identifying alternative transportation options for appointments?</p>
                <div className="gap-actions">
                  <button type="button" onClick={() => handleTransportHelpResponse('yes')}>Yes, please</button>
                  <button type="button" onClick={() => handleTransportHelpResponse('no')}>Not right now</button>
                </div>
                {transportHelpDecision && (
                  <p className="decision-note">
                    Current response: {transportHelpDecision === 'yes' ? 'Yes, I want help identifying options' : 'Not right now'}
                  </p>
                )}
              </div>
            )}

            <div className="button-row">
              <button type="button" className="secondary-button" onClick={goBack}>Back</button>
              <button type="button" className="primary-button" onClick={goNext}>Continue</button>
            </div>
          </section>
        )}

        {currentStage === 8 && (
          <section className="stage-panel">
            <p className="eyebrow">Stage 9</p>
            <h1>Your updated CareMap summary</h1>
            <div className="summary-grid">
              <div className="summary-card">
                <h3>Caregiver priority</h3>
                <p>{currentPriority}</p>
              </div>
              <div className="summary-card">
                <h3>People and responsibilities</h3>
                <ul>
                  {careMap.facts.filter((fact) => fact.category === 'responsibility' || fact.category === 'identity').map((fact) => (
                    <li key={fact.id}>{fact.content}</li>
                  ))}
                </ul>
              </div>
              <div className="summary-card">
                <h3>Current transportation</h3>
                <p>{careMap.facts.find((fact) => fact.id === 'fact-10')?.content ?? careMap.facts.find((fact) => fact.id === 'fact-04')?.content ?? 'No transportation arrangement currently confirmed.'}</p>
              </div>
              <div className="summary-card">
                <h3>Confirmed or rejected interpretations</h3>
                <ul>
                  {careMap.facts.filter((fact) => fact.kind === 'interpretation').map((fact) => (
                    <li key={fact.id}>{fact.content} — {fact.status}</li>
                  ))}
                </ul>
              </div>
              <div className="summary-card">
                <h3>Changes introduced</h3>
                <ul>
                  {careMap.history.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </div>
              <div className="summary-card">
                <h3>Unresolved information</h3>
                <ul>
                  {careMap.facts.filter((fact) => fact.kind === 'unknown' || fact.status === 'unconfirmed').map((fact) => (
                    <li key={fact.id}>{fact.content}</li>
                  ))}
                </ul>
              </div>
              <div className="summary-card">
                <h3>Selected next step</h3>
                <p>{careMap.selectedNextStep ? careMap.nextSteps.find((step) => step.id === careMap.selectedNextStep)?.title ?? 'No selection yet' : 'No selection yet'}</p>
              </div>
            </div>

            <div className="button-row">
              <button type="button" className="secondary-button" onClick={goBack}>Back</button>
              <button type="button" className="primary-button" onClick={() => setCurrentStage(0)}>Restart</button>
            </div>
          </section>
        )}
      </main>

      <aside className="info-panel">
        <h2>Your Care Map</h2>
        <p>{contextCopy}</p>
        <div className="context-counts" aria-label="Care Map fact status counts">
          <div><strong>{confirmedCount}</strong><span>confirmed</span></div>
          <div><strong>{unresolvedCount}</strong><span>unresolved</span></div>
        </div>
        <div className="context-focus">
          <span className="fact-label">Current priority</span>
          <p>{currentPriority}</p>
        </div>
        <div className="context-facts">
          <h3>In this map</h3>
          {contextFacts.map((fact) => (
            <div key={fact.id} className="context-fact">
              <span className={`context-dot ${fact.status}`} aria-hidden="true" />
              <p>{fact.content}</p>
            </div>
          ))}
        </div>
        <div className="privacy-note context-privacy">Local prototype data is stored in this browser.</div>
      </aside>
    </div>
  )
}

export default App
