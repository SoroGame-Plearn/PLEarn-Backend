import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProfileCompletionToUser1787562000000 implements MigrationInterface {
  name = 'AddProfileCompletionToUser1787562000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'bio',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'profilePictureUrl',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'profileCompletionScore',
        type: 'int',
        default: 0,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'profileCompletionAchievedAt',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'profileCompletionAchievedAt');
    await queryRunner.dropColumn('users', 'profileCompletionScore');
    await queryRunner.dropColumn('users', 'profilePictureUrl');
    await queryRunner.dropColumn('users', 'bio');
  }
}
