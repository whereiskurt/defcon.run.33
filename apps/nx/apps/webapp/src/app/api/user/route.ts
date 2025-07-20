import { auth } from '@auth';
import { getUser } from '@db/user';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const session = await auth()
    if (!session || !session.user.email) {
        return NextResponse.json({ message: "401 Unauthorized" }, { status: 401, })
    }
    const user = await getUser(session.user.email)
    return NextResponse.json({ message: "User Fetched.", user }, { status: 200, })
}