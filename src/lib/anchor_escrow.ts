import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { AnchorEscrow, IDL } from "@/types/anchor_escrow";
import { Cluster, Connection, PublicKey } from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { randomBytes } from "crypto";

export default class AnchorEscrowProgram {
  program: Program<AnchorEscrow>;

  constructor(connection: Connection, cluster: Cluster = "devnet") {
    this.program = new Program(IDL, { connection });
  }

  async make(
    maker: PublicKey,
    mintA: PublicKey,
    mintB: PublicKey,
    deposit: string,
    receive: string
  ) {
    const seed = new BN(randomBytes(8));

    const [makerAtaA, makerAtaB] = [maker]
      .map((a) =>
        [mintA, mintB].map((m) =>
          getAssociatedTokenAddressSync(m, a, false, TOKEN_2022_PROGRAM_ID)
        )
      )
      .flat();

    const escrow = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.toBuffer(),
        seed.toArrayLike(Buffer, "le", 8),
      ],
      this.program.programId
    )[0];

    const vault = getAssociatedTokenAddressSync(
      mintA,
      escrow,
      true,
      TOKEN_2022_PROGRAM_ID
    );

    // Accounts
    const accounts = {
      maker: maker,
      mintA: mintA,
      mintB: mintB,
      makerAtaA,
      makerAtaB,
      escrow,
      vault,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    };

    const tx = this.program.methods
      .make(seed, new BN(deposit), new BN(receive))
      .accounts({ ...accounts });

    console.log("transaction: ", tx);

    return tx.transaction();
  }

  async refund(maker: PublicKey, mintA: PublicKey, seed: BN) {
    const [makerAtaA] = [maker]
      .map((a) =>
        [mintA].map((m) =>
          getAssociatedTokenAddressSync(m, a, false, TOKEN_2022_PROGRAM_ID)
        )
      )
      .flat();

    const escrow = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.toBuffer(),
        seed.toArrayLike(Buffer, "le", 8),
      ],
      this.program.programId
    )[0];

    const vault = getAssociatedTokenAddressSync(
      mintA,
      escrow,
      true,
      TOKEN_2022_PROGRAM_ID
    );

    // Accounts
    const accounts = {
      maker: maker,
      mintA: mintA,
      makerAtaA,
      escrow,
      vault,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    };

    const tx = this.program.methods.refund().accounts({ ...accounts });

    console.log("transaction: ", tx);

    return tx.transaction();
  }

  async take(
    maker: PublicKey,
    taker: PublicKey,
    mintA: PublicKey,
    mintB: PublicKey,
    seed: BN
  ) {
    const [makerAtaA, makerAtaB, takerAtaA, takerAtaB] = [maker, taker]
      .map((a) =>
        [mintA, mintB].map((m) =>
          getAssociatedTokenAddressSync(m, a, false, TOKEN_2022_PROGRAM_ID)
        )
      )
      .flat();

    const escrow = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.toBuffer(),
        seed.toArrayLike(Buffer, "le", 8),
      ],
      this.program.programId
    )[0];

    const vault = getAssociatedTokenAddressSync(
      mintA,
      escrow,
      true,
      TOKEN_2022_PROGRAM_ID
    );

    // Accounts
    const accounts = {
      maker: maker,
      taker: taker,
      mintA: mintA,
      mintB: mintB,
      makerAtaA,
      makerAtaB,
      takerAtaA,
      takerAtaB,
      escrow,
      vault,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    };

    const tx = this.program.methods.take().accounts({ ...accounts });

    console.log("transaction: ", tx);

    return tx.transaction();
  }

  async getOrders() {
    return await this.program.account.escrow.all();
  }
}
