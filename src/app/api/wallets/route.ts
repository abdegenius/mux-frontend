import { NextResponse } from "next/server";
import { dummyWallets } from "@/mock-data/wallets";

const VALID_ACCESS_TOKEN = "mock-access-token";

export async function GET(request: Request) {
	const authorization = request.headers.get("authorization");
	if (!authorization?.startsWith("Bearer ")) {
		return NextResponse.json({ error: "missing_auth" }, { status: 401 });
	}

	const token = authorization.slice("Bearer ".length).trim();
	if (token !== VALID_ACCESS_TOKEN) {
		return NextResponse.json({ error: "invalid_token" }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const includeArchived = searchParams.get("includeArchived") === "true";

	const wallets = includeArchived
		? dummyWallets
		: dummyWallets.filter((wallet) => !wallet.archived);

	return NextResponse.json(wallets);
}
