interface BrandWordmarkProps {
  className?: string
}

export default function BrandWordmark({ className = 'logo-iconsai' }: BrandWordmarkProps) {
  return (
    <a
      className={className}
      href="https://iconsai.ai"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir IconsAI"
    >
      <span className="logo-i">i</span>
      <span className="logo-cons">cons</span>
      <span className="logo-ai">.ai</span>
    </a>
  )
}
