/**
 * DEPLOYMENT SUBMISSION — the single integration point for the contact form.
 *
 * THIS IS THE ONLY FUNCTION YOU NEED TO CHANGE to wire up a real backend.
 * Everything downstream already handles both outcomes:
 *
 *   resolves  → the launch sequence runs
 *   rejects   → the sequence is aborted before ignition and the error is shown,
 *               with the form restored and the user's text intact
 *
 * The sequence deliberately waits for this promise before committing. Nothing
 * is confirmed to the user until the submission has actually been accepted —
 * a launch animation that plays on a failed send is a lie.
 */

/** Simulated latency so the ARMED state has something real to wait on. */
const MOCK_LATENCY = 620

/**
 * @param {{name: string, email: string, payload: string}} form
 * @returns {Promise<{ok: true}>}
 * @throws {Error} on rejection — message is shown to the user
 */
export async function submitDeployment(form) {
  /* ------------------------------------------------------------------
   * REPLACE THIS BLOCK with your real submission.
   *
   * Formspree:
   *   const res = await fetch(`https://formspree.io/f/${import.meta.env.VITE_FORMSPREE_ID}`, {
   *     method: 'POST',
   *     headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
   *     body: JSON.stringify(form),
   *   })
   *   if (!res.ok) throw new Error('Transmission failed — try again')
   *   return { ok: true }
   *
   * Anything else: same shape. Resolve on success, throw on failure.
   * ------------------------------------------------------------------ */

  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY))

  // Basic guard so an obviously empty payload never reports success.
  if (!form?.email || !form?.payload) {
    throw new Error('Incomplete payload')
  }

  return { ok: true }
}
