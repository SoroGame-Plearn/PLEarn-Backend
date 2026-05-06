import { registerAs } from '@nestjs/config';

export default registerAs('stellar', () => ({
  network: process.env.STELLAR_NETWORK ?? 'testnet',
  horizonUrl: process.env.STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org',
  sorobanRpcUrl: process.env.STELLAR_SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org',
  rewardContractId: process.env.STELLAR_REWARD_CONTRACT_ID ?? '',
  distributorSecret: process.env.STELLAR_DISTRIBUTOR_SECRET ?? '',
}));
