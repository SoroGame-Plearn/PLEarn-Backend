import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddUserPreferences1787674853335 implements MigrationInterface {
  name = 'AddUserPreferences1787674853335';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_preferences',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'emailNotificationsEnabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'theme',
            type: 'enum',
            enum: ['light', 'dark', 'system'],
            enumName: 'user_preferences_theme_enum',
            default: `'system'`,
          },
          {
            name: 'language',
            type: 'varchar',
            default: `'en'`,
          },
          {
            name: 'profileVisibility',
            type: 'enum',
            enum: ['public', 'private', 'friends_only'],
            enumName: 'user_preferences_visibility_enum',
            default: `'public'`,
          },
          {
            name: 'activityVisibility',
            type: 'enum',
            enum: ['public', 'private', 'friends_only'],
            enumName: 'user_preferences_visibility_enum',
            default: `'public'`,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'user_preferences',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_preferences', true, true, true);
  }
}
