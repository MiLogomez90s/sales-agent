import { NextResponse } from 'next/server';
import { TOOL_TEMPLATES, TEMPLATE_CATEGORIES } from '@/lib/tools/templates';

export async function GET() {
  return NextResponse.json({
    templates: TOOL_TEMPLATES,
    categories: TEMPLATE_CATEGORIES,
  });
}
