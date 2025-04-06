import { auth } from "@auth"

export async function GET(request: Request) {
  if (request.headers.get("Authorization")) {
    return Response.json({ data: "Protected data" })
  }
  return Response.json({ message: "Not authenticated" }, { status: 401 })
}