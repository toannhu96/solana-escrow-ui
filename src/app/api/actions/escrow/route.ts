/**
 * Solana Actions Example
 */

import {
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
} from "@solana/actions";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import AnchorEscrowProgram from "@/lib/anchor_escrow";

export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);

    const payload: ActionGetResponse = {
      title: "Escrow Order",
      icon: new URL("/solana.jpg", requestUrl.origin).toString(),
      description:
        "Escrow contract securely to connect buyers and sellers to exchange tokens in a trustless manner.",
      label: "Get Escrow Order",
    };

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err) {
    console.log(err);
    let message = "An unknown error occurred";
    if (typeof err == "string") message = err;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = GET;

export const POST = async (req: Request) => {
  try {
    const body: ActionPostRequest = await req.json();

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      return new Response('Invalid "account" provided', {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const connection = new Connection(
      process.env.SOLANA_RPC! || clusterApiUrl("devnet")
    );

    const program = new AnchorEscrowProgram(connection);
    const orders = await program.getOrders();
    if (orders.length === 0) {
      return new Response("No orders found", {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }
    const order = orders[0];

    const tx = await program.take(
      order.account.maker,
      account,
      order.account.mintA,
      order.account.mintB,
      order.account.seed
    );
    // set the end user as the fee payer
    tx.feePayer = account;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction: tx,
        message: "Successfully took escrow order",
      },
      // note: no additional signers are needed
      // signers: [],
    });

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err) {
    console.log(err);
    let message = "An unknown error occurred";
    if (typeof err == "string") message = err;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};
