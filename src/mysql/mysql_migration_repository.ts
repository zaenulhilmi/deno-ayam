import MigrationRepositoryInterface from "./../interfaces/migration_repository_interface.ts";
import mysql from "./../driver/mysql.ts";

class MysqlMigrationRepository implements MigrationRepositoryInterface {
  tableName: string = "migrations";
  query: string = "";

  constructor() {
  }

  create(): MigrationRepositoryInterface {
    this.query =
      `create table migrations (id bigint primary key auto_increment, file_name varchar(255) not null, step int not null, created_at timestamp default current_timestamp, updated_at timestamp default current_timestamp);`;
    return this;
  }

  insert(fileName: string, step: number): MigrationRepositoryInterface {
    this.query =
      `insert into ${this.tableName} (file_name, step) values ('${fileName}', '${step}')`;
    return this;
  }

  lastMigration(): MigrationRepositoryInterface {
    this.query = `select * from migrations order by id desc limit 1;`;
    return this;
  }

  lastStepMigrations(): MigrationRepositoryInterface {
    this.query =
      `select * from migrations where step = (select max(step) from migrations);`;
    return this;
  }

  removeAllLastStep(): MigrationRepositoryInterface {
    this.query =
      `delete t.* from migrations t inner join (select max(step) max_step FROM migrations) tmax ON t.step = tmax.max_step;`;
    return this;
  }

  async execute(): Promise<void> {
    let client = await mysql.getInstance();
    await client.execute(this.query);
  }

  async get(): Promise<any> {
    let client = await mysql.getInstance();
    return client.query(this.query);
  }

  toSql(): string {
    return this.query;
  }
}

export default MysqlMigrationRepository;
