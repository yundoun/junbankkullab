import { NextResponse } from 'next/server'
import { analyzeTitle } from '@/lib/analyzer'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      )
    }

    const analysis = analyzeTitle(title)

    return NextResponse.json({
      success: true,
      title,
      analysis,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
