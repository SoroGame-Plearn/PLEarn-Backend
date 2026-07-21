import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class AddPasswordResetTokens1721556678290 implements MigrationInterface {
  name = 'AddPasswordResetTokens1721556678290';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create password_reset_tokens table
    await queryRunner.createTable(
      new Table({
        name: 'password_reset_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'token',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'used',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'password_reset_tokens',
      new ForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Add indexes for performance
    await queryRunner.createIndex(
      'password_reset_tokens',
      new Index({
        name: 'IDX_password_reset_tokens_token',
        columnNames: ['token'],
      }),
    );

    await queryRunner.createIndex(
      'password_reset_tokens',
      new Index({
        name: 'IDX_password_reset_tokens_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'password_reset_tokens',
      new Index({
        name: 'IDX_password_reset_tokens_expiresAt',
        columnNames: ['expiresAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('password_reset_tokens', 'IDX_password_reset_tokens_expiresAt');
    await queryRunner.dropIndex('password_reset_tokens', 'IDX_password_reset_tokens_userId');
    await queryRunner.dropIndex('password_reset_tokens', 'IDX_password_reset_tokens_token');

    // Drop foreign key
    const table = await queryRunner.getTable('password_reset_tokens');
    const foreignKey = table!.foreignKeys.find(fk => fk.columnNames.indexOf('userId') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('password_reset_tokens', foreignKey);
    }

    // Drop table
    await queryRunner.dropTable('password_reset_tokens');
  }
}
