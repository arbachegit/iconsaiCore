import { NextRequest, NextResponse } from 'next/server'

import { SKILL_DOCS } from '@/data/skill-docs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const doc = SKILL_DOCS[id]

  if (!doc) {
    return NextResponse.json({ doc: null }, { status: 404 })
  }

  return NextResponse.json({ doc })
}
