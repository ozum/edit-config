# edit-config



Read, edit, write configuration files.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Synopsis](#synopsis)
- [Details](#details)
- [API](#api)
- [edit-config](#edit-config)
  - [Type aliases](#type-aliases)
    - [FileFormat](#fileformat)
    - [PredicateFunction](#predicatefunction)
    - [ValueFunction](#valuefunction)
    - [WritableFileFormat](#writablefileformat)
- [Classes](#classes)
- [Class: DataFile](#class-datafile)
  - [Hierarchy](#hierarchy)
  - [Properties](#properties)
    - [data](#data)
  - [Accessors](#accessors)
    - [readOnly](#readonly)
  - [Methods](#methods)
    - [delete](#delete)
    - [get](#get)
    - [getModifiedKeys](#getmodifiedkeys)
    - [has](#has)
    - [merge](#merge)
    - [reload](#reload)
    - [save](#save)
    - [set](#set)
    - [sortKeys](#sortkeys)
    - [`Static` fromData](#static-fromdata)
    - [`Static` load](#static-load)
- [Class: Manager](#class-manager)
  - [Hierarchy](#hierarchy-1)
  - [Constructors](#constructors)
    - [constructor](#constructor)
  - [Methods](#methods-1)
    - [fromData](#fromdata)
    - [load](#load)
    - [loadAll](#loadall)
    - [saveAll](#saveall)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# Synopsis


**Load, Edit & Save Single Config**
```ts
import { DataFile, Manager } from "edit-config";
const packageJson = await DataFile.load("package.json");

packageJson
  .set("typings", "dist/index.d.ts",")
  .set("scripts.build", "tsc")
  .set("scripts.test", (value) => `${value} --coverage`)
  .merge("husky.hooks", { pre-commit: "eslint" })
  .merge("devDependencies", (value, key, data, path, dataFile) => ({ "@types/lodash": dataFile.get("dependencies.lodash") }) )
  .sortKeys("scripts", { start: ["build", "test", "lint"] });

await packageJson.save();
```

**Cosmiconfig: Load, Edit & Save**
```ts
// Loads from `package.json` or configuration file using cosmiconfig. Set true to use default cosmiconfig configuration.
const husky = await DataFile.load("husky", { cosmiconfig: true });
const eslint = await DataFile.load("eslint", { cosmiconfig: { options: cosmiconfigOptions, searchFrom: __dirname } });

husky.set("hooks.pre-commit", "lint-staged");

// Check if cosmiconfig data can be saved, because saving "js" files are not supported.
if (!husky.readOnly) await husky.save();
```

**Load, Edit & Save Multiple Config**
```ts
// Create manager and load files.
const manager = new Manager({ root: ".", logger: winstonLogger });
const [packageJson, tsconfig] = await manager.loadAll(["package.json", "tsconfig.json"]);
await manager.saveAll();
```

**Example Logger**
```ts
import { createLogger, format, transports } from "winston";
const logger = createLogger({
  level: "debug",
  format: format.combine(format.colorize(), format.splat(), format.simple()),
  transports: [new transports.Console()],
});

const packageJson = await DataFile.load("package.json", { logger });
```

**Disable Logger**
```ts
import { DataFile, noLogger } from "edit-config";
const packageJson = await DataFile.load("package.json", { logger: noLogger });
```

**Conditional Update**
```ts
const packageJson = await DataFile.load("package.json");
packageJson
  .set("keywords", ["my", "keywords"], { if: (value) => value === undefined })
  .merge("scripts", { build: "tsc", test: "jest" }, { if: (value, key, data, path, rootData) => rootData.has("typings") });
```

# Details

`DataFile` class reads `JSON`, `YAML` and `JS` configuration files and writes `JSON` and `YAML` files. `Manager` class is used to manage multiple `DataFile` classes.

**Tips**

* Don't forget to add `await` when chaining `async` methods: `await (await packageJson.reload()).save();`

**Highlights:**

* Provides `has`, `get`, `set`, `merge` methods based on [`lodash`](https://lodash.com/) functions. `delete` is based on `lodash.unset`.
* In addition to lodash functionality, manipulation methods accept value function and condition callback function for conditional manipulation.
* `load()` and `loadAll()` do not throw even files do not exist. Instead return default data (if provided), or empty object.
* Data manipulation operations do not write to disk until `save()` or `saveAll()` called if `autoSave` is `false`. (Default behaviour)
* `Manager.load()` and `Manager.loadAll()` methods cache loaded files and return cached results in consequencing calls. Use `DataFile.reload()` to reload from disk.
* Supports [`winston`](https://github.com/winstonjs/winston) logger.
<!-- usage -->

<!-- commands -->

# API


<a name="readmemd"></a>

# edit-config

## Type aliases

###  FileFormat

Ƭ **FileFormat**: *"" | "json" | "yaml" | "js"*

*Defined in [types.ts:19](https://github.com/ozum/edit-config/blob/49b9b67/src/types.ts#L19)*

Data file format.

___

###  PredicateFunction

Ƭ **PredicateFunction**: *function*

*Defined in [types.ts:36](https://github.com/ozum/edit-config/blob/49b9b67/src/types.ts#L36)*

#### Type declaration:

▸ (`value`: any, `key`: Key, `data`: object, `path`: Key[], `dataFile`: [DataFile](#classesdatafilemd)): *boolean*

Callback function to test whether operation should be performed. If result is false, operation is not performed.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`value` | any | is the value to be modified. |
`key` | Key | is the key of the changed value. |
`data` | object | is the object/array to get value from. |
`path` | Key[] | is the full data path of the value in root data. |
`dataFile` | [DataFile](#classesdatafilemd) | is the DataFile instance. |

___

###  ValueFunction

Ƭ **ValueFunction**: *function*

*Defined in [types.ts:49](https://github.com/ozum/edit-config/blob/49b9b67/src/types.ts#L49)*

#### Type declaration:

▸ (`value`: any, `key`: Key, `data`: object, `path`: Key[], `dataFile`: [DataFile](#classesdatafilemd)): *any*

If a function is provided instead of value, return value of the function is used as new value.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`value` | any | is the value to be modified. |
`key` | Key | is the key of the changed value. |
`data` | object | is the object/array to get value from. |
`path` | Key[] | is the full data path of the value in root data. |
`dataFile` | [DataFile](#classesdatafilemd) | is the DataFile instance. |

___

###  WritableFileFormat

Ƭ **WritableFileFormat**: *"json" | "yaml"*

*Defined in [types.ts:22](https://github.com/ozum/edit-config/blob/49b9b67/src/types.ts#L22)*

Writeable Data file format.

# Classes


<a name="classesdatafilemd"></a>

# Class: DataFile

Read, edit and write configuration files.

## Hierarchy

* **DataFile**

## Properties

###  data

• **data**: *object*

*Defined in [data-file.ts:44](https://github.com/ozum/edit-config/blob/49b9b67/src/data-file.ts#L44)*

Actual data

## Accessors

###  readOnly

• **get readOnly**(): *boolean*

*Defined in [data-file.ts:89](https://github.com/ozum/edit-config/blob/49b9b67/src/data-file.ts#L89)*

Whether file can be saved using this library.

**Returns:** *boolean*

## Methods

###  delete

▸ **delete**(`path`: DataPath, `options`: object): *this*

*Defined in [data-file.ts:158](https://github.com/ozum/edit-config/blob/49b9b67/src/data-file.ts#L158)*

Deletes the property at `path` of file data.

#### Example
```typescript
dataFile
  .delete("script.build")
  .delete(["scripts", "test"], { if: (value) => value !== "jest" });
```

**Parameters:**

▪ **path**: *DataPath*

is data path of the property to delete.

▪`Default value`  **options**: *object*= {}

are options

Name | Type | Description |
------ | ------ | ------ |
`if?` | [PredicateFunction](#predicatefunction) | is the function to test whether operation should be performed. If result is false, operation is not performed.  |

**Returns:** *this*

___

###  get

▸ **get**(`path`: DataPath, `defaultValue?`: any): *any*

*Defined in [data-file.ts:118](https://github.com/ozum/edit-config/blob/49b9b67/src/data-file.ts#L118)*

Gets the value at `path` of file data. If the resolved value is undefined, the `defaultValue` is returned in its place.

#### Example
```typescript
dataFile.get("script.build");
dataFile.get(["script", "build"]);
```

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`path` | DataPath | is data path of the property to get. |
`defaultValue?` | any | is value to get if path does not exists on data. |

**Returns:** *any*

data stored in given object path or default value.

___

###  getModifiedKeys

▸ **getModifiedKeys**(`__namedParameters`: object): *object*

*Defined in [data-file.ts:213](https://github.com/ozum/edit-config/blob/49b9b67/src/data-file.ts#L213)*

Returns deleted and modified keys (paths) in data file. Keys may be filtered by required condition.

#### Example
```typescript
dataFile.getModifiedKeys({ include: "scripts", exclude: ["scripts.validate", "scripts.docs"] });
```

**Parameters:**

▪`Default value`  **__namedParameters**: *object*= {}

Name | Type |
------ | ------ |
`filter` | undefined &#124; function |

**Returns:** *object*

modified keys

* **deleted**: *StringDataPath[]*

* **set**: *StringDataPath[]*

___

###  has

▸ **has**(`path`: DataPath): *boolean*

*Defined in [data-file.ts:103](https://github.com/ozum/edit-config/blob/49b9b67/src/data-file.ts#L103)*

Returns whether given `path` exists in file data.

#### Example
```typescript
dataFile.has("script.build");
dataFile.has(["script", "build"]);
```

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`path` | DataPath | is data path of the property to check. |

**Returns:** *boolean*

whether path exists.

___

###  merge

▸ **merge**(`path`: DataPath, ...`valuesAndOptions`: any[]): *this*

*Defined in [data-file.ts:184](https://github.com/ozum/edit-config/blob/49b9b67/src/data-file.ts#L184)*

This method is like assign except that it recursively merges own and inherited enumerable string keyed properties of source objects
into the destination object. Source properties that resolve to undefined are skipped if a destination value exists.
Array and plain object properties are merged recursively. Other objects and value types are overridden by assignment.
Source objects are applied from left to right. Subsequent sources overwrite property assignments of previous sources.

If you would like merge root object (`this.data`), use empty array `[]` as path, because `undefined`, '' and `null` are valid object keys.
#### Example
```typescript
dataFile.merge("scripts", { build: "tsc", test: "jest", }, { if: (scripts) => scripts.build !== "someCompiler" });
dataFile.merge([], { name: "my-module", version: "1.0.0" });
```

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`path` | DataPath | is data path of the property to delete. |
`...valuesAndOptions` | any[] | - |

**Returns:** *this*

___

###  reload

▸ **reload**(): *Promise‹this›*

*Defined in [data-file.ts:393](https://github.com/ozum/edit-config/blob/49b9b67/src/data-file.ts#L393)*

Reload data from disk. If file is not present resets data to default data.

**Returns:** *Promise‹this›*

___

###  save

▸ **save**(`__namedParameters`: object): *Promise‹void›*

*Defined in [data-file.ts:256](https://github.com/ozum/edit-config/blob/49b9b67/src/data-file.ts#L256)*

Saves file. If this is a partial data using `rootDataPath` option.

**Parameters:**

▪`Default value`  **__namedParameters**: *object*= {}

Name | Type | Default |
------ | ------ | ------ |
`throwOnReadOnly` | boolean | true |

**Returns:** *Promise‹void›*

___

###  set

▸ **set**(`path`: DataPath, `value`: any, `options`: object): *this*

*Defined in [data-file.ts:136](https://github.com/ozum/edit-config/blob/49b9b67/src/data-file.ts#L136)*

Sets the value at `path` of file data. If a portion of path doesn't exist, it's created.
Arrays are created for missing index properties while objects are created for all other missing properties.

#### Example
```typescript
dataFile
  .set("script.build", "tsc")
  .set(["scripts", "test"], "jest", { if: (value) => value !== "mocha" });
```

**Parameters:**

▪ **path**: *DataPath*

is data path of the property to set.

▪ **value**: *any*

is value to set or a function which returns value to be set.

▪`Default value`  **options**: *object*= {}

are options

Name | Type | Description |
------ | ------ | ------ |
`if?` | [PredicateFunction](#predicatefunction) | is the function to test whether operation should be performed. If result is false, operation is not performed.  |

**Returns:** *this*

___

###  sortKeys

▸ **sortKeys**(`path`: DataPath, `options?`: undefined | object): *this*

*Defined in [data-file.ts:243](https://github.com/ozum/edit-config/blob/49b9b67/src/data-file.ts#L243)*

When keys/values added which are previously does not exist, they are added to the end of the file during file write.
This method allows reordering of the keys in given path. Required keys may be put at the beginning and of the order.

#### Example
```typescript
dataFile.sortKeys("scripts", { start: ["build", "lint"], end: {"dependencies", "devDependencies"} });
```

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`path` | DataPath | is data path of the property to order keys of. |
`options?` | undefined &#124; object | - |

**Returns:** *this*

___

### `Static` fromData

▸ **fromData**(`path`: string, `data`: object, `__namedParameters`: object): *[DataFile](#classesdatafilemd)*

*Defined in [data-file.ts:304](https://github.com/ozum/edit-config/blob/49b9b67/src/data-file.ts#L304)*

Creates [DataFile](#classesdatafilemd) instance from given data to be saved for given file path.

**Parameters:**

▪ **path**: *string*

is path of the file.

▪ **data**: *object*

is the data to create [DataFile](#classesdatafilemd) from.

▪`Default value`  **__namedParameters**: *object*= {}

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`defaultFormat` | "json" &#124; "yaml" | "json" | Format to be used if file format cannot be determined from file name. |
`logger` | Logger | console | Winston compatible Logger to be used when logging. |
`prettierConfig` | undefined &#124; null &#124; object | - | Prettier configuration to be used. If not provided determined automatically. |
`readonly` | undefined &#124; false &#124; true | - | Whether to save() operation is allowed. |
`rootDataPath` | undefined &#124; null &#124; string &#124; number &#124; undefined &#124; null &#124; string &#124; number[] | - | If only some part of the data/config will be used, this is the data path to be used. For example if this is `scripts`, only `script` key of the data is loaded. |
`rootDir` | undefined &#124; string | - | Root directory for file. If provided, relative path is based on this root directory. |

**Returns:** *[DataFile](#classesdatafilemd)*

[DataFile](#classesdatafilemd) instance.

___

### `Static` load

▸ **load**(`path`: string, `__namedParameters`: object): *Promise‹[DataFile](#classesdatafilemd)›*

*Defined in [data-file.ts:342](https://github.com/ozum/edit-config/blob/49b9b67/src/data-file.ts#L342)*

Reads data from given file. If file is not present returns default data to be saved with  method.

**Parameters:**

▪ **path**: *string*

is path of the file.

▪`Default value`  **__namedParameters**: *object*= {}

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`cosmiconfig` | false &#124; true &#124; object | false | Whether to use {@link cosmiconfig https://www.npmjs.com/package/cosmiconfig} to load configuration. Set `true` for default cosmiconfig options or provide an object with `options` for cosmiconfig options and `searchFrom` to provide `cosmiconfig.search()` parameter. |
`defaultData` | undefined &#124; object | - | Default data to be used if file does not exist. |
`defaultFormat` | "json" &#124; "yaml" | "json" | Default format to be used if file format cannot be determined from file name and content. |
`logger` | Logger | console | Winston compatible Logger to be used when logging. |
`prettierConfig` | undefined &#124; null &#124; object | - | Prettier configuration to be used. If not provided determined automatically. |
`readonly` | undefined &#124; false &#124; true | - | Whether to save() operation is allowed. |
`rootDataPath` | undefined &#124; null &#124; string &#124; number &#124; undefined &#124; null &#124; string &#124; number[] | - | If only some part of the data/config will be used, this is the data path to be used. For example if this is `scripts`, only `script` key of the data is loaded. |
`rootDir` | undefined &#124; string | - | Root directory for file. If provided, relative path is based on this root directory. |

**Returns:** *Promise‹[DataFile](#classesdatafilemd)›*

[DataFile](#classesdatafilemd) instance.


<a name="classesmanagermd"></a>

# Class: Manager

Manage multiple configuration files using [DataFile](#classesdatafilemd).

## Hierarchy

* **Manager**

## Constructors

###  constructor

\+ **new Manager**(`__namedParameters`: object): *[Manager](#classesmanagermd)*

*Defined in [manager.ts:14](https://github.com/ozum/edit-config/blob/49b9b67/src/manager.ts#L14)*

Creates a manager to manage multiple data files.

**Parameters:**

▪`Default value`  **__namedParameters**: *object*= {}

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`logger` | Logger | console as Logger | Winston compatible Logger to be used when logging. |
`root` | string | "" | Root path to be used for all relative file paths |

**Returns:** *[Manager](#classesmanagermd)*

## Methods

###  fromData

▸ **fromData**(`path`: string, `data`: object, `options`: object): *Promise‹[DataFile](#classesdatafilemd)›*

*Defined in [manager.ts:76](https://github.com/ozum/edit-config/blob/49b9b67/src/manager.ts#L76)*

Creates [DataFile](#classesdatafilemd) instance from given data and returns it. Also caches the data.

**Parameters:**

▪ **path**: *string*

is the path of the file. Could be an absolute path or relative to root path option provided to [Manager](#classesmanagermd)

▪ **data**: *object*

is the data to create [DataFile](#classesdatafilemd) from.

▪ **options**: *object*

are options

Name | Type | Description |
------ | ------ | ------ |
`defaultFormat?` | [WritableFileFormat](#writablefileformat) | is the default format to be used if file format cannot be determined from file name. |
`readOnly` | boolean | is whether file can be saved using this library. |
`rootDataPath?` | DataPath | If only some part of the data/config will be used, this is the data path to be used. For example if this is `scripts`, only `script` key of the data is loaded. |

**Returns:** *Promise‹[DataFile](#classesdatafilemd)›*

[DataFile](#classesdatafilemd) instance.

___

###  load

▸ **load**(`path`: string, `options`: object): *Promise‹[DataFile](#classesdatafilemd)›*

*Defined in [manager.ts:45](https://github.com/ozum/edit-config/blob/49b9b67/src/manager.ts#L45)*

Reads data from given file and caches it. If file is not present, returns default data to be saved with [DataFile.save](#save) or [[save]} methods.
If same data file requested multiple times returns cached data file. Absolute path of the file is used as cache key.

#### Example
```typescript
manager.load("package.json");
manager.load("eslint", { defaultFormat: "json", cosmiconfig: { options: { packageProp: "eslint" }, searchForm: "some/path" } })
```

**Parameters:**

▪ **path**: *string*

is the path of the file. Could be an absolute path or relative to root path option provided to [Manager](#classesmanagermd).

▪`Default value`  **options**: *object*= {}

are options

Name | Type | Description |
------ | ------ | ------ |
`cosmiconfig?` | boolean &#124; object | is whether to use {@link cosmiconfig https://www.npmjs.com/package/cosmiconfig} to load configuration. Set `true` for default cosmiconfig options or provide an object with `options` for cosmiconfig options and `searchFrom` to provide `cosmiconfig.search()` parameter. |
`defaultData?` | any | is the default data to be used if file does not exist. |
`defaultFormat?` | [WritableFileFormat](#writablefileformat) | is the default format to be used if file format cannot be determined from file name and content. |
`readOnly?` | undefined &#124; false &#124; true | is whether file can be saved using this library. |
`rootDataPath?` | DataPath | If only some part of the data/config will be used, this is the data path to be used. For example if this is `scripts`, only `script` key of the data is loaded. |

**Returns:** *Promise‹[DataFile](#classesdatafilemd)›*

[DataFile](#classesdatafilemd) instance.

___

###  loadAll

▸ **loadAll**(`paths`: string[], `options`: object): *Promise‹[DataFile](#classesdatafilemd)[]›*

*Defined in [manager.ts:99](https://github.com/ozum/edit-config/blob/49b9b67/src/manager.ts#L99)*

Reads data from all given files and caches them. If same data file requested multiple times returns cached data file. Absolute path of the file is used as cache key.

**Parameters:**

▪ **paths**: *string[]*

are arry of paths of the files. Could be an absolute path or relative to root path option provided to [Manager](#classesmanagermd).

▪`Default value`  **options**: *object*= {}

are options.

Name | Type | Description |
------ | ------ | ------ |
`defaultData?` | any | is the default data to be used if file does not exist. |
`defaultFormat?` | [WritableFileFormat](#writablefileformat) | is the default format to be used if file format cannot be determined from file name and content. |
`readOnly?` | undefined &#124; false &#124; true | is whether file can be saved using this library.  |

**Returns:** *Promise‹[DataFile](#classesdatafilemd)[]›*

___

###  saveAll

▸ **saveAll**(): *Promise‹void›*

*Defined in [manager.ts:106](https://github.com/ozum/edit-config/blob/49b9b67/src/manager.ts#L106)*

**Returns:** *Promise‹void›*


