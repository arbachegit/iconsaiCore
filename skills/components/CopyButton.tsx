'use client'

import { useState, useCallback } from 'react'

interface CopyButtonProps {
  text: string
  className?: string
  children?: React.ReactNode | ((copied: boolean) => React.ReactNode)
  onCopy?: () => void
  title?: string
  copiedTitle?: string
}

export default function CopyButton({
  text,
  className,
  children,
  onCopy,
  title = 'Copiar',
  copiedTitle = 'Copiado!',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), 1500)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), 1500)
    }
  }, [text, onCopy])

  const content = typeof children === 'function' ? children(copied) : children

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className}
      title={copied ? copiedTitle : title}
      aria-label={copied ? copiedTitle : title}
    >
      {content ?? (
        copied ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )
      )}
    </button>
  )
}
