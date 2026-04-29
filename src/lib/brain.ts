const BRAIN_URL = import.meta.env.VITE_BRAIN_URL as string
const BRAIN_KEY = import.meta.env.VITE_BRAIN_KEY as string

export async function logToBrain(content: string, tags: string[] = []) {
  if (!BRAIN_URL || !BRAIN_KEY) return { ok: false, error: 'Brain not configured' }
  try {
    const res = await fetch(`${BRAIN_URL}/memory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-brain-key': BRAIN_KEY,
      },
      body: JSON.stringify({
        content,
        agent: 'telehealth_command_center',
        tags: ['telehealth', ...tags],
      }),
    })
    return { ok: res.ok, status: res.status }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export async function pingBrain(): Promise<boolean> {
  if (!BRAIN_URL) return false
  try {
    const res = await fetch(`${BRAIN_URL}/health`, {
      method: 'GET',
      headers: { 'x-brain-key': BRAIN_KEY },
    })
    return res.ok
  } catch {
    return false
  }
}
