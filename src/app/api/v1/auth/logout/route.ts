import { jsonSuccess } from "@/lib/api-response";

export async function POST() {
  const response = jsonSuccess({ message: "Logged out successfully" });
  response.cookies.delete("trim_session_token");
  return response;
}

