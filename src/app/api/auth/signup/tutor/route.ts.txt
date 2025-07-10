import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    return new NextResponse(
        JSON.stringify({ 
            error: "Tutor accounts can only be created by administrators. Please contact support for more information."
        }),
        { 
            status: 403,
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );
} 