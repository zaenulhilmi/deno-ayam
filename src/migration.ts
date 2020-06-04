import MigrationInterface from "./../interfaces/migration_interface.ts";
import MySqlSchema from "./mysql_schema.ts";
import SchemaInterface from "./../interfaces/schema_interface.ts";
import Configuration from "./../configuration.ts";
import MysqlSchemaRepository from "./mysql_schema_repository.ts";
import MigrationRepositoryInterface from "../interfaces/migration_repository_interface.ts";
import SchemaFactory from "../schema_factory.ts";

interface MigrationData {
  id?: number;
  file_name: string;
  step: number;
  created_at?: Date;
  updated_at?: Date;
}

class MysqlMigration implements MigrationInterface {
  data: Array<MigrationData> = [];
  migrationRepo: MigrationRepositoryInterface;
  dialect: string;

  constructor(migrationRepo: MigrationRepositoryInterface) {
    this.migrationRepo = migrationRepo;
    if (this.migrationRepo.constructor.name == "MysqlMigrationRepository") {
      this.dialect = "mysql";
    } else if (
      this.migrationRepo.constuctor.name == "PostgresMigrationRepository"
    ) {
      this.dialect = "postgres";
    } else {
      throw new Error(`migration repository doesn't exist`);
    }
  }

  async migrate(): Promise<void> {
    await this._createMigrationTableIfNotExist();
    let lastMigration = await this._getLastMigrationData();
    this.data = await this._getSortedUnexecutedMigrationData(lastMigration);
    await this._executeData();
  }

  async rollback(): Promise<void> {
    let lastStepMigration = await this._getLastStepMigrations();
    await this._executeLastStepData(lastStepMigration);
  }

  async _createMigrationTableIfNotExist(): Promise<void> {
    let schema: SchemaInterface = new MySqlSchema(new MysqlSchemaRepository());
    let dirExist = await schema.hasTable("migrations");
    if (dirExist) {
      return;
    }
    await this.migrationRepo.create().execute();
  }

  async _getLastMigrationData(): Promise<MigrationData> {
    let lastMigration = await this.migrationRepo.lastMigration().get();

    if (lastMigration.length > 0) {
      return lastMigration[0];
    }

    return {
      id: 0,
      file_name: "",
      step: 0,
    };
  }

  async _getSortedUnexecutedMigrationData(
    lastMigration: MigrationData,
  ): Promise<Array<MigrationData>> {
    let config = await Configuration.newInstance();
    let migrationDir = await config.get("migrationDirectory");

    let result: Array<string> = [];
    if (lastMigration.id == 0) {
      for await (let dir of await Deno.readDir(migrationDir)) {
        if (dir.name.startsWith("20") && dir.name.endsWith(".ts")) {
          result.push(dir.name);
        }
      }
    } else {
      for await (let dir of await Deno.readDir(migrationDir)) {
        if (
          dir.name.startsWith("20") && dir.name.endsWith(".ts") &&
          dir.name > lastMigration.file_name
        ) {
          result.push(dir.name);
        }
      }
    }

    result.sort();

    let objectResult: Array<MigrationData> = [];
    for await (let fileName of result) {
      let data = { file_name: fileName, step: lastMigration.step + 1 };
      objectResult.push(data);
    }
    return objectResult;
  }

  async _executeData() {
    let config = await Configuration.newInstance();
    let migrationDir = await config.get("migrationDirectory");
    let projectDir = await Deno.cwd();
    for await (let x of this.data) {
      let Class =
        (await import(`${projectDir}/${migrationDir}/${x.file_name}`)).default;
      let schema: SchemaInterface = new SchemaFactory(this.dialect).get()
      let object = new Class();
      await this.migrationRepo.insert(x.file_name, x.step).execute();
      await object.up(schema);
    }
  }

  async _getLastStepMigrations() {
    let lastMigration = await this.migrationRepo.lastStepMigrations().get();

    if (lastMigration.length > 0) {
      return lastMigration;
    }
    return {
      id: 0,
      file_name: "",
      step: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  async _executeLastStepData(lastStepMigrations: Array<MigrationData>) {
    let config = await Configuration.newInstance();
    let migrationDir = await config.get("migrationDirectory");
    let projectDir = await Deno.cwd();
    console.log(lastStepMigrations);
    for await (let x of lastStepMigrations) {
      let Class =
        (await import(`${projectDir}/${migrationDir}/${x.file_name}`)).default;
      let schema: SchemaInterface = new SchemaFactory(this.dialect).get
      let object = new Class();
      await object.down(schema);
    }
    await this.migrationRepo.removeAllLastStep().execute();
  }
}

export default MysqlMigration;