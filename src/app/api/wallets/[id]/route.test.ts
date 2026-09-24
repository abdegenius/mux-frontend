import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("/api/wallets/[id]", () => {
	it("returns a wallet when the id exists", async () => {
		const response = await GET(new Request("http://localhost/api/wallets/wallet-001"), {
			params: {
				id: "wallet-001",
			},
		});

		expect(response.status).toBe(200);

		const body = await response.json();
		expect(body).toMatchObject({
			id: "wallet-001",
			address: expect.any(String),
			network: expect.any(String),
			status: expect.any(String),
		});
	});

	it("returns 404 with a stable error code and correlation id when the wallet is missing", async () => {
		const response = await GET(new Request("http://localhost/api/wallets/missing"), {
			params: {
				id: "missing",
			},
		});

		expect(response.status).toBe(404);

		const body = await response.json();
		expect(body).toMatchObject({
			error: "not_found",
			code: "WALLET_NOT_FOUND",
			correlationId: expect.any(String),
		});
		expect(body.correlationId.length).toBeGreaterThan(0);
	});

	it("does not leak secrets or raw key material in the not-found response", async () => {
		const response = await GET(new Request("http://localhost/api/wallets/missing"), {
			params: {
				id: "missing",
			},
		});

		const body = await response.json();
		const serialized = JSON.stringify(body).toLowerCase();

		expect(serialized).not.toContain("secret");
		expect(serialized).not.toContain("privatekey");
		expect(serialized).not.toContain("private_key");
		expect(serialized).not.toContain("jwt");
		expect(serialized).not.toContain("authorization");
	});
});
