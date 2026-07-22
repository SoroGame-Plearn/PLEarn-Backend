import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRefreshTokenToUser1721660400000 implements MigrationInterface {
  name = 'AddRefreshTokenToUser1721660400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'refreshToken',
        type: 'varchar',
        isNullable: true,
        isUnique: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'refreshTokenExpiresAt',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'isRefreshTokenRevoked',
        type: 'boolean',
        default: false,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'isRefreshTokenRevoked');
    await queryRunner.dropColumn('users', 'refreshTokenExpiresAt');
    await queryRunner.dropColumn('users', 'refreshToken');
  }
}
