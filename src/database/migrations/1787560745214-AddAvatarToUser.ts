import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAvatarToUser1787560745214 implements MigrationInterface {
  name = 'AddAvatarToUser1787560745214';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'avatarUrl',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'avatarKey',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'avatarKey');
    await queryRunner.dropColumn('users', 'avatarUrl');
  }
}
