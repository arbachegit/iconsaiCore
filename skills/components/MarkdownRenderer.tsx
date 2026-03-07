'use client'

function renderMarkdown(md: string): string {
  if (!md) return '<p style="color:var(--t3);">Documentacao nao disponivel.</p>'

  const html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

    // Code blocks (fenced)
    .replace(/```(\w*)?\n([\s\S]*?)```/g, (_, _lang, code) => {
      return '<pre class="md-code-block"><code>' + code.trim() + '</code></pre>'
    })

    // Inline code
    .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')

    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')

    // Headers
    .replace(/^#### (.+)$/gm, '<h6 class="md-h4">$1</h6>')
    .replace(/^### (.+)$/gm, '<h5 class="md-h3">$1</h5>')
    .replace(/^## (.+)$/gm, '<h4 class="md-h2">$1</h4>')
    .replace(/^# (.+)$/gm, '<h3 class="md-h1">$1</h3>')

    // Horizontal rule
    .replace(/^---$/gm, '<hr class="md-hr">')

    // Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter((c) => c.trim())
      if (cells.every((c) => /^[\s-:]+$/.test(c))) return '<!-- table-sep -->'
      const row = cells.map((c) => '<td>' + c.trim() + '</td>').join('')
      return '<tr>' + row + '</tr>'
    })

    // Unordered lists
    .replace(/^[\s]*[-*] (.+)$/gm, '<li>$1</li>')

    // Ordered lists
    .replace(/^[\s]*\d+\. (.+)$/gm, '<li>$1</li>')

    // Paragraphs
    .replace(/^(?!<[a-z/!]|<!--)(.+)$/gm, '<p>$1</p>')

    // Clean up
    .replace(/<p><\/p>/g, '')

    // Wrap <li> in <ul>
    .replace(/(<li>.*?<\/li>\n?)+/g, (match) => '<ul class="md-list">' + match + '</ul>')

    // Wrap <tr> in <table>
    .replace(/(<tr>.*?<\/tr>\n?)+/g, (match) => {
      const cleaned = match.replace(/<!-- table-sep -->/g, '')
      return '<div class="md-table-wrap"><table class="md-table">' + cleaned + '</table></div>'
    })

    .replace(/<!-- table-sep -->/g, '')

  return html
}

interface MarkdownRendererProps {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  )
}
