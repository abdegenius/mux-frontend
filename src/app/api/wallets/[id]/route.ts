import { NextResponse } from "next/server";
import { dummyWallets } from "@/mock-data/wallets";

type RouteContext = {
	params: {
		id: string;
	} | Promise<{
		id: string;
	}>;
};

const WALLET_NOT_FOUND = "WALLET_NOT_FOUND";

function correlationId(request: Request): string {
	const header = request.headers.get("x-correlation-id")?.trim();
	if (header) {
		return header;
	}
	return crypto.randomUUID();
}

export async function GET(request: Request, { params }: RouteContext) {
	const { id } = await params;
	const walletId = id.trim();
	const correlationIdValue = correlationId(request);
	const wallet = dummyWallets.find((candidate) => candidate.id === walletId);

	if (!wallet) {
		// Deny-by-default: unknown or missing wallet ids never resolve to data.
		// Log only the opaque id and correlation id; no secrets or key material.
		console.warn(
			`[wallets] ${WALLET_NOT_FOUND} id=${walletId || "<empty>"} correlationId=${correlationIdValue}`,
		);

		return NextResponse.json(
			{
				error: {
					code: WALLET_NOT_FOUND,
					message: "Wallet not found.",
					correlationId: correlationIdValue,
				},
			},
			{
				status: 404,
				headers: { "x-correlation-id": correlationIdValue },
			},
		);
	}

	return NextResponse.json(wallet, {
		headers: { "x-correlation-id": correlationIdValue },
	});
}
