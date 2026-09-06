import { NextRequest, NextResponse } from "next/server";
import { marketDataProvider } from "@/providers/market-data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query.trim()) {
      return NextResponse.json([]);
    }

    const results = await marketDataProvider.search(query);
    return NextResponse.json(results);
  } catch (error: any) {
    console.error("GET /api/search error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}

