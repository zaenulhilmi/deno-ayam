import SchemaInterface from "./interfaces/schema_interface.ts";
import MySqlSchema from "./mysql/mysql_schema.ts";
import MysqlSchemaRepository from "./mysql/mysql_schema_repository.ts";
import PostgresSchema from "./postgres/postgres_schema.ts";
import PostgresSchemaRepository from "./postgres/postgres_schema_repository.ts";
import SqliteSchemaRepository from "./sqlite/sqlite_schema_repository.ts";
import SqliteSchema from "./sqlite/sqlite_schema.ts";

class SchemaFactory {
  dialect: string;

  constructor(dialect: string) {
    this.dialect = dialect;
  }

  get(): SchemaInterface {
    if (this.dialect == "mysql") {
      return new MySqlSchema(new MysqlSchemaRepository());
    } else if (this.dialect == "postgres") {
      return new PostgresSchema(new PostgresSchemaRepository());
    } else if (this.dialect == "sqlite") {
      return new SqliteSchema(new SqliteSchemaRepository());
    } else {
      throw new Error("dialect is not supported");
    }
  }
}

export default SchemaFactory;
