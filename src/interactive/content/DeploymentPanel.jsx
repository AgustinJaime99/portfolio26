import { useEffect, useState } from 'react'
import { setFlightState, useFlightState } from '../core/flightStore'
import { releaseFromOrbit } from '../core/CaptureSequence'
import { enterPadHold, abortPadHold } from '../core/LaunchSequence'
import {
  deployment,
  beginDeployment,
  abortDeployment,
  failDeployment,
  returnToNavigation,
  subscribeDeployment,
} from '../core/deploymentMachine'
import { submitDeployment } from '../data/submitDeployment'

/**
 * DEPLOYMENT — the contact form as a launch.
 *
 * You are not sending a message; you are scheduling a departure. The sequence
 * itself lives in deploymentMachine + LaunchSequence — this component owns only
 * the form, the countdown overlay and the confirmation.
 *
 * ORDER OF OPERATIONS MATTERS: the submission is awaited BEFORE the sequence
 * commits. Nothing is confirmed until the backend has accepted it, and a
 * rejection restores the form with the user's text intact. A launch animation
 * that plays over a failed send is a lie told beautifully.
 */

/** Subscribe to the machine's discrete state for rendering. */
function useDeploymentState() {
  const [s, setS] = useState(deployment.state)
  useEffect(() => subscribeDeployment(setS), [])
  return s
}

/** Sample a continuous machine value at low frequency, for UI only. */
function useMachineValue(read, hz = 30) {
  const [v, setV] = useState(() => read(deployment))
  useEffect(() => {
    const id = setInterval(() => {
      const next = read(deployment)
      setV((prev) => (Object.is(prev, next) ? prev : next))
    }, 1000 / hz)
    return () => clearInterval(id)
  }, [hz, read])
  return v
}

const readCount = (d) => d.countNumber
const readCountProgress = (d) => Math.round(d.countProgress * 20) / 20
const readUiOpacity = (d) => Math.round(d.uiOpacity * 20) / 20

export default function DeploymentPanel() {
  const phase = useFlightState((s) => s.phase)
  const activeSection = useFlightState((s) => s.activeSection)
  // The cinematic is skipped only for prefers-reduced-motion — never merely
  // because the GPU is having a hard time.
  const prefersReducedMotion = useFlightState((s) => s.prefersReducedMotion)
  const dstate = useDeploymentState()

  const open = activeSection === 'launch' && phase === 'docked'

  const [form, setForm] = useState({ name: '', email: '', payload: '' })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const count = useMachineValue(readCount)
  const countProgress = useMachineValue(readCountProgress)
  const uiOpacity = useMachineValue(readUiOpacity)

  const valid =
    form.name.trim().length > 1 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email) &&
    form.payload.trim().length > 8

  const idle = dstate === 'idle'
  const showForm = open && idle
  const showConfirmation = dstate === 'confirmation'

  /* Move the vessel onto the pad as soon as the form is reachable. Filling in a
   * form while your ship drifts past the ring undercuts the whole metaphor. */
  useEffect(() => {
    if (open) enterPadHold()
    else if (idle) abortPadHold()
  }, [open, idle])

  // ESC aborts — but only before ignition. Past that the sequence is committed.
  useEffect(() => {
    if (idle || showConfirmation) return undefined
    function onKey(e) {
      if (e.code !== 'Escape') return
      e.stopPropagation()
      if (abortDeployment()) setSending(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [idle, showConfirmation])

  async function launch(e) {
    e.preventDefault()
    if (!valid || sending || !idle) return

    setSending(true)
    setError(null)

    try {
      // Await the backend BEFORE committing to the sequence.
      await submitDeployment(form)
      beginDeployment({ reduced: prefersReducedMotion })
    } catch (err) {
      // Failure never reaches ignition, so nothing is confirmed.
      failDeployment(err?.message)
      setError(err?.message || 'Transmission failed')
      setSending(false)
    }
  }

  function handleReturn() {
    returnToNavigation()
    setForm({ name: '', email: '', payload: '' })
    setSending(false)
    setError(null)
  }

  return (
    <>
      {/* ---- COUNTDOWN ------------------------------------------- */}
      {count !== null && (
        <div className="ix-countdown">
          <div
            className="ix-countdown__num ix-display"
            style={{
              // Each digit: arrives slightly large and soft, snaps to focus,
              // holds, then expands away. Driven by the machine's progress so
              // it can never drift from the camera move.
              transform: `scale(${1.28 - Math.min(1, countProgress * 5) * 0.28 + Math.max(0, countProgress - 0.72) * 0.9})`,
              filter: `blur(${Math.max(0, 1 - countProgress * 6) * 9}px)`,
              opacity: countProgress > 0.82 ? Math.max(0, 1 - (countProgress - 0.82) / 0.18) : 1,
            }}
          >
            {String(count).padStart(2, '0')}
          </div>
        </div>
      )}

      {/* ---- ARMED / IGNITION LABELS ------------------------------ */}
      {dstate === 'armed' && (
        <div className="ix-seqlabel">Deployment sequence armed</div>
      )}
      {dstate === 'ignition' && (
        <div className="ix-seqlabel ix-seqlabel--hot">Ignition</div>
      )}

      {/* ---- FORM ------------------------------------------------- */}
      <div
        className={`ix-panel${showForm ? ' ix-panel--open' : ''}`}
        aria-hidden={!showForm}
        style={{
          // The panel withdraws rather than disappearing: it slides out and
          // fades as the system takes over navigation.
          opacity: idle ? 1 : uiOpacity,
          transform: idle ? undefined : `translateX(${(1 - uiOpacity) * 42}px)`,
        }}
      >
        <button className="ix-close" onClick={releaseFromOrbit}>
          Abort
          <span className="ix-close__x">✕</span>
        </button>

        <div className="ix-panel__head">
          <div className="ix-panel__desig">Site 04 — ring armed</div>
          <h2 className="ix-panel__title">Start a new deployment</h2>
          <p className="ix-panel__sub">
            Describe what you want to build. If it fits, we schedule a launch.
          </p>
        </div>

        <div className="ix-panel__body">
          <form className="ix-deploy" onSubmit={launch}>
            <div className="ix-field">
              <label className="ix-label" htmlFor="dep-name">Operator</label>
              <input
                id="dep-name"
                tabIndex={showForm ? 0 : -1}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                autoComplete="name"
                disabled={sending}
              />
            </div>

            <div className="ix-field">
              <label className="ix-label" htmlFor="dep-email">Return channel</label>
              <input
                id="dep-email"
                type="email"
                tabIndex={showForm ? 0 : -1}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com"
                autoComplete="email"
                disabled={sending}
              />
            </div>

            <div className="ix-field">
              <label className="ix-label" htmlFor="dep-payload">Payload</label>
              <textarea
                id="dep-payload"
                rows={5}
                tabIndex={showForm ? 0 : -1}
                value={form.payload}
                onChange={(e) => setForm({ ...form, payload: e.target.value })}
                placeholder="What are we building?"
                disabled={sending}
              />
            </div>

            <button
              className="ix-deploy__btn"
              type="submit"
              disabled={!valid || sending}
              tabIndex={showForm ? 0 : -1}
            >
              {sending
                ? 'Transmitting…'
                : valid
                  ? 'Initiate deployment'
                  : 'Awaiting payload'}
            </button>

            {error && <div className="ix-deploy__error">{error}</div>}

            <div className="ix-label" style={{ opacity: 0.55, lineHeight: 1.6 }}>
              Submission is not wired to a backend yet — see submitDeployment.js
            </div>
          </form>
        </div>
      </div>

      {/* ---- CONFIRMATION ----------------------------------------- */}
      {showConfirmation && (
        <div className="ix-confirm">
          <div className="ix-confirm__inner">
            <div className="ix-confirm__tag">Transmission received</div>
            <h2 className="ix-confirm__title">
              Gracias por
              <br />
              comunicarte conmigo.
            </h2>
            <p className="ix-confirm__body">
              Recibí tu mensaje.
              <br />
              Te responderé lo antes posible.
            </p>
            <button className="ix-confirm__btn" onClick={handleReturn}>
              Return to navigation
            </button>
          </div>
        </div>
      )}
    </>
  )
}
