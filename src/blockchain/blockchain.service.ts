import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Horizon,
  Keypair,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
} from '@stellar/stellar-sdk';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly server: Horizon.Server;
  private readonly networkPassphrase: string;
  private readonly distributorSecret: string;

  constructor(private readonly config: ConfigService) {
    this.server = new Horizon.Server(config.get<string>('stellar.horizonUrl')!);
    this.networkPassphrase =
      config.get<string>('stellar.network') === 'mainnet'
        ? Networks.PUBLIC
        : Networks.TESTNET;
    this.distributorSecret = config.get<string>('stellar.distributorSecret') ?? '';
  }

  async distributeReward(destinationPublicKey: string, amount: number): Promise<string> {
    if (!this.distributorSecret) {
      throw new Error('STELLAR_DISTRIBUTOR_SECRET is not configured');
    }

    const keypair = Keypair.fromSecret(this.distributorSecret);
    const account = await this.server.loadAccount(keypair.publicKey());

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: destinationPublicKey,
          asset: Asset.native(),
          amount: amount.toFixed(7),
        }),
      )
      .setTimeout(30)
      .build();

    tx.sign(keypair);
    const result = await this.server.submitTransaction(tx);
    this.logger.log(`Reward tx submitted: ${result.hash}`);
    return result.hash;
  }
}
