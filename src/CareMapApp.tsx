import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import {
  addRelationship,
  addSupportPerson,
  applyThreeWeekUpdate,
  createInitialMap,
  loadCareMapState,
  saveClarificationAnswer,
  updateFactContent,
  updateFactStatus,
  updateRelationship,
  updateSuggestedNeed,
  type CareMapFact,
  type CareMapState,
  type SuggestedNeed,
} from './caremap'
import { CareDiagram } from './CareDiagram'
import { NeedsTable } from './NeedsTable'
import { STAGES } from './workflow'

const STORAGE_KEY = 'caremap-ai-state-v1'

const QUESTIONS = [
  { id: 'father-household', prompt: 'Does your father live alone or with someone?' },
  { id: 'elena-household', prompt: 'Do you live with your father or separately?' },
  { id: 'other-support', prompt: 'Who else is involved in supporting your father?' },
  { id: 'elena-responsibilities', prompt: 'What responsibilities do you personally manage?' },
  { id: 'transport-frequency', prompt: 'How often does your sister provide transportation?' },
  { id: 'elena-wellbeing', prompt: 'What support would help you most with your own wellbeing?' },
]

type SpeechResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  onresult: ((event: SpeechResultEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function factGroup(fact: CareMapFact) {
  if (fact.id === 'clarification-father-household') return 'Person receiving care'
  if (fact.id === 'clarification-elena-household' || fact.id === 'clarification-elena-wellbeing') return 'Caregiver'
  if (fact.id === 'clarification-other-support' || fact.id === 'clarification-transport-frequency') return 'Family and support network'
  if (fact.id === 'fact-14' || fact.id === 'clarification-elena-responsibilities') return 'Care responsibilities'
  if (fact.id === 'fact-01' || fact.id === 'fact-03') return 'Caregiver'
  if (fact.id === 'fact-02' || fact.category === 'care') return 'Person receiving care'
  if (fact.id === 'fact-04' || fact.id === 'fact-05' || fact.category === 'support') return 'Family and support network'
  if (fact.category === 'responsibility') return 'Care responsibilities'
  if (fact.category === 'challenge' || fact.category === 'gap' || fact.category === 'unknown') return 'Challenges and potential gaps'
  if (fact.category === 'goal') return 'Caregiver priorities'
  return 'Other details'
}

function statusLabel(status: CareMapFact['status']) {
  if (status === 'confirmed') return 'Caregiver confirmed'
  if (status === 'rejected') return 'Rejected'
  return 'Unresolved'
}

function sourceLabel(fact: CareMapFact) {
  if (fact.source === 'scenario') return 'Fictional scenario detail'
  if (fact.source === 'ai') return 'System interpretation'
  if (fact.source === 'system') return 'Unknown'
  return 'Caregiver statement'
}

function StageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <header className="stage-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {description && <p className="intro-text">{description}</p>}
    </header>
  )
}

function App() {
  const [careMap, setCareMap] = useState<CareMapState>(() => loadCareMapState(localStorage.getItem(STORAGE_KEY)))
  const [currentStage, setCurrentStage] = useState(0)
  const [clarificationIndex, setClarificationIndex] = useState(0)
  const [answerDraft, setAnswerDraft] = useState('')
  const [answerDraftId, setAnswerDraftId] = useState('')
  const [voiceMessage, setVoiceMessage] = useState('')
  const [updateChoice, setUpdateChoice] = useState<'yes' | 'no' | null>(null)
  const [updateDraft, setUpdateDraft] = useState('My sister will not be available to drive my father to appointments for the next month.')
  const [selectedNextStep, setSelectedNextStep] = useState(careMap.selectedNextStep)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(careMap))
    } catch {
      // Local storage is a prototype convenience feature, not a secure clinical database.
    }
  }, [careMap])

  const currentStepLabel = `Step ${currentStage + 1} of ${STAGES.length}`
  const confirmedCount = careMap.facts.filter((fact) => fact.status === 'confirmed').length
  const pendingReviewCount = careMap.facts.filter((fact) => fact.status === 'unconfirmed' && fact.kind !== 'unknown').length
  const unknownCount = careMap.facts.filter((fact) => fact.kind === 'unknown').length
  const confirmedNeeds = careMap.suggestedNeeds.filter((need) => need.status === 'confirmed').length
  const currentQuestion = QUESTIONS[clarificationIndex]
  const savedAnswer = currentQuestion ? careMap.clarifications.find((answer) => answer.id === currentQuestion.id) : undefined
  const currentAnswer = currentQuestion && answerDraftId === currentQuestion.id ? answerDraft : savedAnswer?.answer ?? ''
  const supportRelationship = careMap.relationships.find((relationship) => relationship.id === 'sister-father')
  const currentPriority = careMap.priorities[0] ?? 'Not yet specified'

  const goNext = () => setCurrentStage((stage) => Math.min(stage + 1, STAGES.length - 1))
  const goBack = () => setCurrentStage((stage) => Math.max(stage - 1, 0))

  const handleAnswerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentQuestion) return
    setCareMap((previous) => saveClarificationAnswer(previous, currentQuestion.id, currentQuestion.prompt, currentAnswer))
    setAnswerDraftId('')
    setAnswerDraft('')
    setClarificationIndex((index) => Math.min(index + 1, QUESTIONS.length))
  }

  const handleAnswerSkip = () => {
    if (!currentQuestion) return
    setCareMap((previous) => saveClarificationAnswer(previous, currentQuestion.id, currentQuestion.prompt, ''))
    setAnswerDraftId('')
    setAnswerDraft('')
    setClarificationIndex((index) => Math.min(index + 1, QUESTIONS.length))
  }

  const handleVoiceInput = () => {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }
    const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceMessage('Voice input is not supported in this browser. You can continue by typing or editing the text.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim()
      if (!transcript) return
      setCareMap((previous) => ({ ...previous, narrative: `${previous.narrative.trim()} ${transcript}`.trim() }))
      setVoiceMessage('Transcription added. You can edit it in the text field.')
    }
    recognition.onerror = () => setVoiceMessage('Voice input could not start. Text entry is still available.')
    recognition.onend = () => setVoiceMessage((message) => message || 'Voice input finished. Review and edit the transcription.')
    setVoiceMessage('Listening…')
    recognition.start()
  }

  const updateNeed = (needId: string, changes: Partial<SuggestedNeed>) => {
    setCareMap((previous) => updateSuggestedNeed(previous, needId, changes))
  }

  const handleUpdateApply = () => {
    setCareMap((previous) => applyThreeWeekUpdate(previous, updateDraft.trim() || 'My sister will not be available to drive my father to appointments for the next month.'))
    setUpdateChoice('yes')
  }

  const handleAddSupportPerson = (name: string) => {
    setCareMap((previous) => addSupportPerson(previous, name))
  }

  const restart = () => {
    const initial = createInitialMap()
    setCareMap(initial)
    setCurrentStage(0)
    setClarificationIndex(0)
    setAnswerDraft('')
    setAnswerDraftId('')
    setUpdateChoice(null)
    setSelectedNextStep(null)
  }

  const factGroups = ['Caregiver', 'Person receiving care', 'Family and support network', 'Care responsibilities', 'Challenges and potential gaps', 'Caregiver priorities']

  return (
    <div className="caremap-shell">
      <aside className="sidebar">
        <div className="brand-wrap">
          <div className="brand-icon" aria-hidden="true">✦</div>
          <div>
            <div className="brand-name">CareMap AI</div>
            <div className="tagline">Care map. Two views. Better support.</div>
          </div>
        </div>
        <nav className="stage-nav" aria-label="Care Map workflow">
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
        <div className="privacy-note">Research prototype · local browser storage</div>
      </aside>

      <main className="main-panel">
        <div className="progress-header">
          <div className="progress-pill">{currentStepLabel}</div>
          <div className="progress-bar" aria-hidden="true">
            {STAGES.map((stage, index) => <span key={stage.id} className={`progress-step ${index <= currentStage ? 'filled' : ''}`} />)}
          </div>
        </div>

        {currentStage === 0 && (
          <section className="stage-panel">
            <StageHeading
              eyebrow="Welcome to CareMap"
              title="Let's understand your caregiving situation"
              description="I'm here to help you understand the support around you and explore where additional support may be needed. To begin, tell me about your caregiving situation."
            />
            <div className="scenario-note"><strong>Fictional research scenario</strong><span>This demo saves your edits but does not automatically extract new facts from free text. Nothing is sent to an AI service.</span></div>
            <label className="field-label" htmlFor="narrative">Caregiving situation</label>
            <textarea
              id="narrative"
              className="narrative-input"
              value={careMap.narrative}
              onChange={(event) => setCareMap((previous) => ({ ...previous, narrative: event.target.value }))}
              rows={7}
              aria-describedby="narrative-help"
            />
            <div className="input-actions">
              <button type="button" className="secondary-button" onClick={handleVoiceInput}>Start voice input</button>
              <span id="narrative-help" className="field-hint">Voice transcription is editable before you continue.</span>
            </div>
            {voiceMessage && <p className="voice-message" role="status">{voiceMessage}</p>}
            <div className="info-callout">You can skip follow-up questions. Unknown details remain unknown unless you provide and confirm them.</div>
            <div className="button-row"><button type="button" className="primary-button" onClick={goNext}>Continue</button></div>
          </section>
        )}

        {currentStage === 1 && (
          <section className="stage-panel">
            <StageHeading
              eyebrow="Stage 2 · Follow-up"
              title="A few questions to clarify the map"
              description="I’ll ask one question at a time, starting with details that change who is available and what support may be needed. Answers can be edited or skipped."
            />
            {currentQuestion ? (
              <form className="question-flow" onSubmit={handleAnswerSubmit}>
                <div className="question-progress">Question {clarificationIndex + 1} of {QUESTIONS.length}</div>
                <label className="question-prompt" htmlFor="clarification-answer">{currentQuestion.prompt}</label>
                <textarea
                  id="clarification-answer"
                  value={currentAnswer}
                  onChange={(event) => { setAnswerDraftId(currentQuestion.id); setAnswerDraft(event.target.value) }}
                  rows={3}
                  placeholder="Share what you know, or leave this blank."
                />
                <div className="button-row">
                  <button type="button" className="secondary-button" onClick={handleAnswerSkip}>Skip / leave unknown</button>
                  <button type="submit" className="primary-button">Save and continue</button>
                </div>
              </form>
            ) : (
              <div className="info-callout">You have reached the end of the follow-up questions. Your answers are ready for review.</div>
            )}
            <div className="previous-answers">
              <h2>Previous answers</h2>
              {careMap.clarifications.length === 0 && <p>No answers saved yet.</p>}
              {careMap.clarifications.map((answer) => (
                <article key={answer.id} className="answer-row">
                  <div><strong>{answer.prompt}</strong><p>{answer.status === 'skipped' ? 'Left unknown' : answer.answer}</p></div>
                  <button type="button" className="text-button" onClick={() => {
                    const index = QUESTIONS.findIndex((question) => question.id === answer.id)
                    if (index >= 0) {
                      setClarificationIndex(index)
                      setAnswerDraftId(answer.id)
                      setAnswerDraft(answer.answer)
                    }
                  }}>Edit</button>
                </article>
              ))}
            </div>
            <div className="button-row"><button type="button" className="secondary-button" onClick={goBack}>Back</button><button type="button" className="primary-button" onClick={goNext}>Continue to review</button></div>
          </section>
        )}

        {currentStage === 2 && (
          <section className="stage-panel">
            <StageHeading
              eyebrow="Stage 3 · Review"
              title="Review what we have heard"
              description="Scenario details are shown separately from interpretation. Confirm only details Elena accepts; confirmation records her review, not independent verification."
            />
            <div className="review-groups">
              {factGroups.map((group) => {
                const facts = careMap.facts.filter((fact) => factGroup(fact) === group)
                if (!facts.length) return null
                return (
                  <section key={group} className="review-group">
                    <h2>{group}</h2>
                    {facts.map((fact) => (
                      <article key={fact.id} className={`review-item ${fact.kind}`} data-fact-id={fact.id}>
                        <div className="review-fact">
                          <label className="field-label" htmlFor={`fact-${fact.id}`}>{sourceLabel(fact)}</label>
                          <textarea
                            id={`fact-${fact.id}`}
                            value={fact.content}
                            disabled={fact.kind === 'unknown'}
                            onChange={(event) => setCareMap((previous) => updateFactContent(previous, fact.id, event.target.value))}
                            rows={2}
                          />
                          <p className="fact-notes">{fact.kind === 'interpretation' ? 'Potential interpretation, not an established fact.' : fact.kind === 'unknown' ? 'This information has not been provided.' : 'Directly stated scenario detail; awaiting Elena’s review.'}</p>
                        </div>
                        <div className="review-controls">
                          <span className={`status-badge ${fact.status}`}>{statusLabel(fact.status)}</span>
                          <button type="button" disabled={fact.kind === 'unknown'} aria-pressed={fact.status === 'confirmed'} onClick={() => setCareMap((previous) => updateFactStatus(previous, fact.id, 'confirmed'))}>Confirm</button>
                          <button type="button" disabled={fact.kind === 'unknown'} aria-pressed={fact.status === 'rejected'} onClick={() => setCareMap((previous) => updateFactStatus(previous, fact.id, 'rejected'))}>Reject</button>
                          <button type="button" aria-pressed={fact.status === 'unconfirmed'} onClick={() => setCareMap((previous) => updateFactStatus(previous, fact.id, 'unconfirmed'))}>Unresolved</button>
                        </div>
                      </article>
                    ))}
                  </section>
                )
              })}
            </div>
            <div className="button-row"><button type="button" className="secondary-button" onClick={goBack}>Back</button><button type="button" className="primary-button" onClick={goNext}>Continue to Care Maps</button></div>
          </section>
        )}

        {currentStage === 3 && (
          <section className="stage-panel">
            <StageHeading
              eyebrow="Stage 4 · Shared Care Map"
              title="Two views of one care network"
              description="Both diagrams use the same people and relationship records. Select Edit relationships to update a connection; the change is shared across both views. Dashed red lines mark a potential gap, not a confirmed need."
            />
            <div className="map-view-grid">
              <section className="map-view-panel">
                <div className="map-view-title"><span className="view-index">A</span><div><h2>Support for me</h2><p>Elena's personal support and reported challenges</p></div></div>
                <CareDiagram map={careMap} view="caregiver" onRelationshipChange={(id, changes) => setCareMap((previous) => updateRelationship(previous, id, changes))} onAddRelationship={(relationship) => setCareMap((previous) => addRelationship(previous, relationship))} onAddSupportPerson={handleAddSupportPerson} />
              </section>
              <section className="map-view-panel">
                <div className="map-view-title"><span className="view-index">B</span><div><h2>Support for the person I care for</h2><p>Father's care network and transportation</p></div></div>
                <CareDiagram map={careMap} view="recipient" onRelationshipChange={(id, changes) => setCareMap((previous) => updateRelationship(previous, id, changes))} onAddRelationship={(relationship) => setCareMap((previous) => addRelationship(previous, relationship))} onAddSupportPerson={handleAddSupportPerson} />
              </section>
            </div>
            <div className="button-row"><button type="button" className="secondary-button" onClick={goBack}>Back</button><button type="button" className="primary-button" onClick={goNext}>Review care needs</button></div>
          </section>
        )}

        {currentStage === 4 && (
          <section className="stage-panel">
            <StageHeading
              eyebrow="Stage 5 · Needs and next steps"
              title="Care Needs and Next Steps"
              description="Based on the information you provided, the system has identified some potential care needs. Please review the suggestions below and confirm whether they accurately reflect your situation. You can edit both the needs and their suggested priorities."
            />
            <NeedsTable needs={careMap.suggestedNeeds} onChange={updateNeed} />
            <section className="next-steps-section">
              <h2>Possible Next Steps</h2>
              <p className="section-intro">These are general options to consider, not verified providers or services.</p>
              <div className="suggestion-list">
                {careMap.nextSteps.map((step) => (
                  <article className="suggestion-card" key={step.id}>
                    <h3>{step.title}</h3>
                    <dl>
                      <div><dt>Need addressed</dt><dd>{careMap.suggestedNeeds.find((need) => need.id === step.needId)?.title ?? 'Need not recorded'}</dd></div>
                      <div><dt>Why it may help</dt><dd>{step.whyUseful}</dd></div>
                      <div><dt>Requirements and limits</dt><dd>{step.requirements}</dd></div>
                    </dl>
                    {step.needsMoreInfo && <span className="inline-status">More information needed</span>}
                  </article>
                ))}
              </div>
            </section>
            <div className="button-row"><button type="button" className="secondary-button" onClick={goBack}>Back</button><button type="button" className="primary-button" onClick={goNext}>Continue to updates</button></div>
          </section>
        )}

        {currentStage === 5 && (
          <section className="stage-panel">
            <StageHeading
              eyebrow="Stage 6 · Care Situation Updates"
              title="Have there been any changes in your care situation?"
              description="Updates are added to the existing Care Map. Earlier relationships and their history are retained."
            />
            {careMap.lastUpdate ? (
              <div className="update-applied">
                <span className="status-badge confirmed">Update added to this map</span>
                <p>{careMap.lastUpdate}</p>
                <button type="button" className="primary-button" onClick={goNext}>Continue to updated maps</button>
              </div>
            ) : updateChoice === 'no' ? (
              <div className="update-applied">
                <p>No change recorded. The current Care Map has not been altered.</p>
                <button type="button" className="primary-button" onClick={goNext}>Continue to updated maps</button>
              </div>
            ) : updateChoice === 'yes' ? (
              <div className="update-flow">
                <label className="field-label" htmlFor="update-description">Please describe what has changed</label>
                <textarea id="update-description" value={updateDraft} onChange={(event) => setUpdateDraft(event.target.value)} rows={4} />
                <div className="impact-preview">
                  <span className="fact-label">Possible map impact · review before applying</span>
                  <p>Sister → Father: appointment transportation availability changes to unavailable for the next month.</p>
                  <p>Sister’s unavailability → transportation backup: potential gap remains unconfirmed until Elena reviews it.</p>
                  <p className="fact-notes">The existing occasional transportation relationship and its prior availability will remain in the history.</p>
                </div>
                <div className="button-row">
                  <button type="button" className="secondary-button" onClick={() => setUpdateChoice(null)}>Back</button>
                  <button type="button" className="primary-button" disabled={!updateDraft.trim()} onClick={handleUpdateApply}>Confirm interpretation and apply update</button>
                </div>
              </div>
            ) : (
              <div className="update-choice">
                <button type="button" className="choice-button" onClick={() => setUpdateChoice('yes')}><strong>Yes</strong><span>There has been a change to record.</span></button>
                <button type="button" className="choice-button" onClick={() => { setUpdateChoice('no'); setCareMap((previous) => previous.history.some((entry) => entry.includes('No change reported')) ? previous : ({ ...previous, history: [...previous.history, 'No change reported at this update.'] })) }}><strong>No</strong><span>My care situation has not changed.</span></button>
                <p className="scenario-note"><strong>Fictional three-week update</strong><span>“My sister will not be available to drive my father to appointments for the next month.”</span></p>
              </div>
            )}
            {updateChoice !== 'yes' && !careMap.lastUpdate && <div className="button-row"><button type="button" className="secondary-button" onClick={goBack}>Back</button></div>}
          </section>
        )}

        {currentStage === 6 && (
          <section className="stage-panel">
            <StageHeading
              eyebrow="Stage 7 · Updated maps"
              title="Updated Care Maps"
              description="Based on your new information, the system has generated updated Care Maps. Earlier details remain in the shared map and the relationship history."
            />
            <div className="change-summary">
              <h2>What changed</h2>
              {careMap.lastUpdate ? <p>{careMap.lastUpdate}</p> : <p>No new situation change has been recorded.</p>}
              {supportRelationship?.history.map((snapshot, index) => <p className="history-line" key={`${snapshot.changedAt}-${index}`}>Previous relationship: “{snapshot.label}”; availability {snapshot.availability}; frequency {snapshot.frequency}; status {statusLabel(snapshot.status)}.</p>)}
              <p>Backup transportation remains a potential gap unless Elena confirms an alternative is unavailable.</p>
            </div>
            <div className="map-view-grid">
              <section className="map-view-panel"><div className="map-view-title"><span className="view-index">A</span><div><h2>Support for me</h2><p>Elena's personal support and reported challenges</p></div></div><CareDiagram map={careMap} view="caregiver" onRelationshipChange={(id, changes) => setCareMap((previous) => updateRelationship(previous, id, changes))} onAddRelationship={(relationship) => setCareMap((previous) => addRelationship(previous, relationship))} onAddSupportPerson={handleAddSupportPerson} /></section>
              <section className="map-view-panel"><div className="map-view-title"><span className="view-index">B</span><div><h2>Support for the person I care for</h2><p>Father's care network and transportation</p></div></div><CareDiagram map={careMap} view="recipient" onRelationshipChange={(id, changes) => setCareMap((previous) => updateRelationship(previous, id, changes))} onAddRelationship={(relationship) => setCareMap((previous) => addRelationship(previous, relationship))} onAddSupportPerson={handleAddSupportPerson} /></section>
            </div>
            <div className="button-row"><button type="button" className="secondary-button" onClick={goBack}>Back</button><button type="button" className="primary-button" onClick={goNext}>Review updated needs</button></div>
          </section>
        )}

        {currentStage === 7 && (
          <section className="stage-panel">
            <StageHeading
              eyebrow="Stage 8 · Needs and next steps"
              title="Updated Care Needs and Suggested Next Steps"
              description="Review the same needs after the time-based update. Suggested needs stay separate from confirmed needs; priorities and confirmation status can be changed here."
            />
            <div className="needs-summary-strip">
              <span>{careMap.suggestedNeeds.filter((need) => need.status === 'confirmed').length} confirmed</span>
              <span>{careMap.suggestedNeeds.filter((need) => need.status === 'suggested' || need.status === 'unresolved').length} unresolved or suggested</span>
              <span>{careMap.suggestedNeeds.filter((need) => need.status === 'rejected').length} rejected</span>
            </div>
            <NeedsTable needs={careMap.suggestedNeeds} onChange={updateNeed} />
            <section className="next-steps-section">
              <h2>Suggested Next Steps</h2>
              <div className="suggestion-list">
                {careMap.nextSteps.map((step) => (
                  <article className={`suggestion-card selectable ${selectedNextStep === step.id ? 'selected' : ''}`} key={step.id}>
                    <label className="next-step-select"><input type="radio" name="next-step" checked={selectedNextStep === step.id} onChange={() => { setSelectedNextStep(step.id); setCareMap((previous) => ({ ...previous, selectedNextStep: step.id })) }} /> Select this action</label>
                    <h3>{step.title}</h3>
                    <p>{step.detail}</p>
                    <dl><div><dt>Why it may help</dt><dd>{step.whyUseful}</dd></div><div><dt>Requirements and limits</dt><dd>{step.requirements}</dd></div></dl>
                  </article>
                ))}
              </div>
            </section>
            <div className="button-row"><button type="button" className="secondary-button" onClick={goBack}>Back</button><button type="button" className="primary-button" onClick={goNext}>View final overview</button></div>
          </section>
        )}

        {currentStage === 8 && (
          <section className="stage-panel">
            <StageHeading eyebrow="Stage 9 · Final overview" title="Final Care Overview" description="A current summary of the information reviewed so far. Unresolved details and potential gaps remain clearly marked." />
            <div className="overview-section">
              <h2>People and situation</h2>
              <div className="overview-grid">
                {careMap.entities.filter((entity) => entity.role === 'caregiver' || entity.role === 'recipient' || entity.role === 'family').map((entity) => <article className="overview-card" key={entity.id}><span className="node-role">{entity.role}</span><h3>{entity.name}</h3><p>{entity.detail}</p><span className={`status-badge ${entity.status}`}>{statusLabel(entity.status)}</span></article>)}
              </div>
            </div>
            <div className="overview-section">
              <h2>Current support and relationships</h2>
              <ul className="relationship-summary">
                {careMap.relationships.map((relationship) => {
                  const source = careMap.entities.find((entity) => entity.id === relationship.sourceId)?.name ?? relationship.sourceId
                  const target = careMap.entities.find((entity) => entity.id === relationship.targetId)?.name ?? relationship.targetId
                  return <li key={relationship.id}><strong>{source} → {target}</strong><span>{relationship.label}; {relationship.frequency === 'unknown' ? 'frequency unknown' : relationship.frequency}; {relationship.availability}.</span><span className={`status-badge ${relationship.status}`}>{statusLabel(relationship.status)}</span></li>
                })}
              </ul>
            </div>
            <div className="overview-section">
              <h2>Both Care Map views</h2>
              <div className="map-view-grid">
                <section className="map-view-panel"><h3>Support for me</h3><CareDiagram map={careMap} view="caregiver" onRelationshipChange={(id, changes) => setCareMap((previous) => updateRelationship(previous, id, changes))} onAddRelationship={(relationship) => setCareMap((previous) => addRelationship(previous, relationship))} onAddSupportPerson={handleAddSupportPerson} /></section>
                <section className="map-view-panel"><h3>Support for the person I care for</h3><CareDiagram map={careMap} view="recipient" onRelationshipChange={(id, changes) => setCareMap((previous) => updateRelationship(previous, id, changes))} onAddRelationship={(relationship) => setCareMap((previous) => addRelationship(previous, relationship))} onAddSupportPerson={handleAddSupportPerson} /></section>
              </div>
            </div>
            <div className="overview-section">
              <h2>Care needs</h2>
              <ul className="overview-list">{careMap.suggestedNeeds.map((need) => <li key={need.id}><strong>{need.title}</strong><span>{need.priority} priority · {need.status}</span></li>)}</ul>
              <h3>Unresolved information</h3>
              <ul className="overview-list">
                {careMap.facts.filter((fact) => fact.kind === 'unknown' || fact.status === 'unconfirmed').map((fact) => <li key={fact.id}>{fact.content}</li>)}
                {careMap.clarifications.filter((answer) => answer.status === 'skipped').map((answer) => <li key={`skipped-${answer.id}`}>{answer.prompt} Left unknown.</li>)}
              </ul>
            </div>
            <div className="overview-section">
              <h2>Changes over time</h2>
              <ol className="history-list">{careMap.history.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol>
              <h3>Suggested next steps</h3>
              <ul className="overview-list">{careMap.nextSteps.map((step) => <li key={step.id}><strong>{step.title}</strong><span>{step.detail}</span></li>)}</ul>
              <p className="research-note">Research proof-of-concept only. Suggestions are not clinical advice and local services have not been verified.</p>
            </div>
            <div className="button-row"><button type="button" className="secondary-button" onClick={goBack}>Back</button><button type="button" className="primary-button" onClick={restart}>Start over</button></div>
          </section>
        )}
      </main>

      <aside className="info-panel">
        <h2>Your Care Map</h2>
        <p className="context-description">{currentStage < 2 ? 'A working map of the people and support described in Elena’s scenario.' : currentStage < 4 ? 'Review status and unknown details are reflected in the same shared map.' : careMap.lastUpdate ? 'The map includes the new time-limited transportation change and prior history.' : 'The map remains unchanged until a situation update is confirmed.'}</p>
        <div className="context-counts"><div><strong>{confirmedCount}</strong><span>confirmed</span></div><div><strong>{pendingReviewCount}</strong><span>awaiting review</span></div><div><strong>{unknownCount}</strong><span>unknown</span></div></div>
        <div className="context-focus"><span className="fact-label">Current priority</span><p>{currentPriority}</p></div>
        <div className="context-focus"><span className="fact-label">Needs confirmed</span><p>{confirmedNeeds} of {careMap.suggestedNeeds.length}</p></div>
        <div className="context-facts">
          <h3>People in the map</h3>
          {careMap.entities.filter((entity) => entity.role === 'caregiver' || entity.role === 'recipient' || entity.role === 'family').map((entity) => <div className="context-fact" key={entity.id}><span className={`context-dot ${entity.status}`} /><p><strong>{entity.name}</strong><br />{entity.detail}</p></div>)}
        </div>
        <div className="context-facts">
          <h3>Open questions</h3>
          {careMap.facts.filter((fact) => fact.kind === 'unknown' || fact.category === 'gap' || fact.id === 'fact-11').map((fact) => <div className="context-fact" key={fact.id}><span className="context-dot" /><p>{fact.content}</p></div>)}
        </div>
        <div className="privacy-note context-privacy">Stored in this browser only. Not a clinical record.</div>
      </aside>
    </div>
  )
}

export default App