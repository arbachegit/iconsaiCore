'use client'

export default function FloatingLogo() {
  return (
    <a
      className="floating-logo"
      href="#"
      onClick={(event) => {
        event.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/skills/favicon-float.png" alt="IconsAI" />
    </a>
  )
}
