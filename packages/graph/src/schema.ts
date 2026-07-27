import kuzu from 'kuzu';
import type { Connection as KuzuConnection } from 'kuzu';

let _db: InstanceType<typeof kuzu.Database> | null = null;
let _conn: KuzuConnection | null = null;

export function getGraphDb(path: string = ':memory:') {
  if (!_db) {
    if (path === ':memory:') {
      _db = new kuzu.Database(':memory:');
    } else {
      _db = new kuzu.Database(path);
    }
    _conn = new kuzu.Connection(_db);
  }
  return _conn!;
}

export function resetGraph() {
  _conn?.close();
  _db?.close();
  _db = null;
  _conn = null;
}

export function createSchema(conn: KuzuConnection) {
  const queries = [
    `CREATE NODE TABLE Provider (
      id STRING,
      name STRING,
      stateCode STRING,
      teachingHospital BOOL,
      bedCount INT64,
      PRIMARY KEY (id)
    )`,
    `CREATE NODE TABLE Beneficiary (
      id STRING,
      stateCode STRING,
      sex STRING,
      PRIMARY KEY (id)
    )`,
    `CREATE NODE TABLE InpatientClaim (
      id STRING,
      drgCode INT64,
      paymentAmount DOUBLE,
      utilizationDayCount INT64,
      admissionDate STRING,
      dischargeDate STRING,
      PRIMARY KEY (id)
    )`,
    `CREATE NODE TABLE OutpatientClaim (
      id STRING,
      paymentAmount DOUBLE,
      PRIMARY KEY (id)
    )`,
    `CREATE NODE TABLE DRG (
      code INT64,
      baseDrg INT64,
      mdc STRING,
      medicalSurgical STRING,
      severityTier STRING,
      description STRING,
      weight DOUBLE,
      PRIMARY KEY (code)
    )`,
    `CREATE NODE TABLE Region (
      name STRING,
      PRIMARY KEY (name)
    )`,
    `CREATE NODE TABLE Metric (
      id STRING,
      name STRING,
      PRIMARY KEY (id)
    )`,
    `CREATE REL TABLE SUBMITTED_BY (
      FROM InpatientClaim TO Provider,
      FROM OutpatientClaim TO Provider
    )`,
    `CREATE REL TABLE TREATED (
      FROM InpatientClaim TO Beneficiary,
      FROM OutpatientClaim TO Beneficiary
    )`,
    `CREATE REL TABLE CLASSIFIED_AS (
      FROM InpatientClaim TO DRG
    )`,
    `CREATE REL TABLE LOCATED_IN (
      FROM Provider TO Region
    )`,
    `CREATE REL TABLE INFLUENCES (
      FROM Metric TO Metric,
      weight DOUBLE
    )`,
    `CREATE REL TABLE HYPOTHESIZES (
      FROM Metric TO Metric,
      pattern STRING,
      question STRING,
      cypherQuery STRING
    )`,
  ];

  for (const q of queries) {
    const stmt = conn.prepareSync(q);
    conn.executeSync(stmt);
  }
}
