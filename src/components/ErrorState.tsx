import { AlertTriangle, RefreshCw } from 'lucide-react'

export function ErrorState({ message = 'Connection lost', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/40 flex items-center justify-center text-danger mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div className="font-heading uppercase tracking-wider text-danger">Error</div>
      <div className="text-sm text-white/50 mt-1 max-w-md">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="hud-button mt-4 inline-flex items-center gap-2">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      )}
    </div>
  )
}
