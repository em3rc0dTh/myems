
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.6.0
 * Query Engine version: f676762280b54cd07c770017ed3711ddde35f37a
 */
Prisma.prismaVersion = {
  client: "6.6.0",
  engine: "f676762280b54cd07c770017ed3711ddde35f37a"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.CountryScalarFieldEnum = {
  id: 'id',
  name: 'name'
};

exports.Prisma.RegionScalarFieldEnum = {
  id: 'id',
  name: 'name',
  countryId: 'countryId'
};

exports.Prisma.ProvinceScalarFieldEnum = {
  id: 'id',
  name: 'name',
  regionId: 'regionId'
};

exports.Prisma.TownScalarFieldEnum = {
  id: 'id',
  name: 'name',
  provinceId: 'provinceId'
};

exports.Prisma.DistrictScalarFieldEnum = {
  id: 'id',
  name: 'name',
  townId: 'townId'
};

exports.Prisma.SiteScalarFieldEnum = {
  id: 'id',
  name: 'name',
  districtId: 'districtId',
  address: 'address',
  geoCoords: 'geoCoords',
  perimeter: 'perimeter',
  spatialMetadata: 'spatialMetadata',
  width: 'width',
  length: 'length',
  isLogical: 'isLogical'
};

exports.Prisma.StructureScalarFieldEnum = {
  id: 'id',
  name: 'name',
  siteId: 'siteId',
  perimeter: 'perimeter',
  spatialMetadata: 'spatialMetadata'
};

exports.Prisma.LevelScalarFieldEnum = {
  id: 'id',
  name: 'name',
  structureId: 'structureId',
  spatialMetadata: 'spatialMetadata'
};

exports.Prisma.SubstructureScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  levelId: 'levelId',
  area: 'area',
  width: 'width',
  depth: 'depth',
  length: 'length',
  measurementUnit: 'measurementUnit',
  gridRows: 'gridRows',
  gridCols: 'gridCols',
  perimeter: 'perimeter',
  referencePoints: 'referencePoints',
  spatialMetadata: 'spatialMetadata'
};

exports.Prisma.RowScalarFieldEnum = {
  id: 'id',
  name: 'name',
  substructureId: 'substructureId',
  spatialMetadata: 'spatialMetadata'
};

exports.Prisma.ContainerScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  substructureId: 'substructureId',
  parentContainerId: 'parentContainerId',
  row: 'row',
  rowId: 'rowId',
  position: 'position',
  spatialMetadata: 'spatialMetadata',
  width: 'width',
  depth: 'depth',
  height: 'height',
  footprintArea: 'footprintArea',
  measurementUnit: 'measurementUnit',
  mountingWidth: 'mountingWidth',
  mountingDepth: 'mountingDepth',
  mountingHeight: 'mountingHeight',
  assignSpace: 'assignSpace'
};

exports.Prisma.CASScalarFieldEnum = {
  id: 'id',
  label: 'label',
  containerId: 'containerId',
  neId: 'neId'
};

exports.Prisma.PositionScalarFieldEnum = {
  id: 'id',
  substructureId: 'substructureId',
  row: 'row',
  rowId: 'rowId',
  col: 'col',
  widthUnits: 'widthUnits',
  depthUnits: 'depthUnits',
  physWidthCm: 'physWidthCm',
  physDepthCm: 'physDepthCm',
  physOffsetX: 'physOffsetX',
  physOffsetY: 'physOffsetY',
  status: 'status',
  label: 'label',
  deviceId: 'deviceId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DeviceScalarFieldEnum = {
  id: 'id',
  name: 'name',
  category: 'category',
  siteId: 'siteId',
  containerId: 'containerId',
  uPosition: 'uPosition',
  uHeight: 'uHeight'
};

exports.Prisma.EquipmentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  sn: 'sn',
  category: 'category',
  slotLabel: 'slotLabel',
  unitPosition: 'unitPosition',
  unitHeight: 'unitHeight',
  logicalPrefix: 'logicalPrefix',
  deviceId: 'deviceId',
  parentEquipmentId: 'parentEquipmentId'
};

exports.Prisma.PortScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  sensorTopic: 'sensorTopic',
  equipmentId: 'equipmentId',
  deviceId: 'deviceId'
};

exports.Prisma.NEScalarFieldEnum = {
  id: 'id',
  name: 'name',
  deviceId: 'deviceId'
};

exports.Prisma.ConnectionScalarFieldEnum = {
  id: 'id',
  label: 'label',
  sourcePortId: 'sourcePortId',
  targetPortId: 'targetPortId'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};


exports.Prisma.ModelName = {
  Country: 'Country',
  Region: 'Region',
  Province: 'Province',
  Town: 'Town',
  District: 'District',
  Site: 'Site',
  Structure: 'Structure',
  Level: 'Level',
  Substructure: 'Substructure',
  Row: 'Row',
  Container: 'Container',
  CAS: 'CAS',
  Position: 'Position',
  Device: 'Device',
  Equipment: 'Equipment',
  Port: 'Port',
  NE: 'NE',
  Connection: 'Connection'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }

        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
