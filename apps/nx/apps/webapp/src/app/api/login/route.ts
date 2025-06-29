import { signIn } from "@auth";
import { AuthError } from "next-auth";
import { verifyCsrfToken } from "../util";
import { NextRequest, NextResponse } from "next/server";

const inviteCodes = process.env.AUTH_INVITE_CODES?.split(",")

export async function POST(req: NextRequest) {
    const data = await req.json()

    const { email, csrfToken, inviteCode } = data

    // Validate CSRF token here (optional if NextAuth.js already handles it)
    if (!verifyCsrfToken(csrfToken)) {
        return NextResponse.json({ message: "Invalid CSRF submission." }, { status: 403, })
    }

    if (inviteCodes?.length! > 0 && !inviteCodes?.includes(inviteCode)) {
        return NextResponse.json({ error: `Invalid invite code: '${inviteCode}'` }, { status: 403, })
    }

    try {
        await signIn("nodemailer", { email: encodeURI(email), csrfToken, redirect: false })
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: "Not authorized to login." }, { status: 401, })
        }
        return NextResponse.json({ error: JSON.stringify(error) }, { status: 400, })
    }
    return NextResponse.json({ message: "Success. Check your email." }, { status: 200, })
}