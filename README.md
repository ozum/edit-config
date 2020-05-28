# edit-config



Read, edit, write configuration files.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Synopsis](#synopsis)
- [Details](#details)
- [API](#api)
- [edit-config](#edit-config)
  - [Type aliases](#type-aliases)
    - [PredicateFunction](#predicatefunction)
    - [ValueFunction](#valuefunction)
- [Classes](#classes)
- [Class: DataFile](#class-datafile)
  - [Hierarchy](#hierarchy)
  - [Properties](#properties)
    - [data](#data)
  - [Accessors](#accessors)
    - [canSave](#cansave)
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
- [Enums](#enums)
- [Enumeration: FileFormat](#enumeration-fileformat)
  - [Enumeration members](#enumeration-members)
    - [Js](#js)
    - [Json](#json)
    - [Unknown](#unknown)
    - [Yaml](#yaml)

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
if (husky.canSaved) await husky.save();
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

###  PredicateFunction

Ƭ **PredicateFunction**: *function*

*Defined in [types.ts:41](https://github.com/ozum/edit-config/blob/926f0c9/src/types.ts#L41)*

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

*Defined in [types.ts:54](https://github.com/ozum/edit-config/blob/926f0c9/src/types.ts#L54)*

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

# Classes


<a name="classesdatafilemd"></a>

# Class: DataFile

Read, edit and write configuration files.

## Hierarchy

* **DataFile**

## Properties

###  data

• **data**: *object*

*Defined in [data-file.ts:34](https://github.com/ozum/edit-config/blob/926f0c9/src/data-file.ts#L34)*

Actual data

## Accessors

###  canSave

• **get canSave**(): *boolean*

*Defined in [data-file.ts:76](https://github.com/ozum/edit-config/blob/926f0c9/src/data-file.ts#L76)*

Whether file can be saved using this library.

**Returns:** *boolean*

## Methods

###  delete

▸ **delete**(`path`: DataPath, `options`: object): *this*

*Defined in [data-file.ts:145](https://github.com/ozum/edit-config/blob/926f0c9/src/data-file.ts#L145)*

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

*Defined in [data-file.ts:105](https://github.com/ozum/edit-config/blob/926f0c9/src/data-file.ts#L105)*

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

*Defined in [data-file.ts:200](https://github.com/ozum/edit-config/blob/926f0c9/src/data-file.ts#L200)*

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

*Defined in [data-file.ts:90](https://github.com/ozum/edit-config/blob/926f0c9/src/data-file.ts#L90)*

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

*Defined in [data-file.ts:171](https://github.com/ozum/edit-config/blob/926f0c9/src/data-file.ts#L171)*

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

*Defined in [data-file.ts:372](https://github.com/ozum/edit-config/blob/926f0c9/src/data-file.ts#L372)*

Reload data from disk. If file is not present resets data to default data.

**Returns:** *Promise‹this›*

___

###  save

▸ **save**(`__namedParameters`: object): *Promise‹void›*

*Defined in [data-file.ts:243](https://github.com/ozum/edit-config/blob/926f0c9/src/data-file.ts#L243)*

Saves file. If this is a partial data using `rootDataPath` option.

**Parameters:**

▪`Default value`  **__namedParameters**: *object*= {}

Name | Type | Default |
------ | ------ | ------ |
`jsLogLevel` | LogLevel | LogLevel.Error |
`throwOnJs` | boolean | true |

**Returns:** *Promise‹void›*

___

###  set

▸ **set**(`path`: DataPath, `value`: any, `options`: object): *this*

*Defined in [data-file.ts:123](https://github.com/ozum/edit-config/blob/926f0c9/src/data-file.ts#L123)*

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

*Defined in [data-file.ts:230](https://github.com/ozum/edit-config/blob/926f0c9/src/data-file.ts#L230)*

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

*Defined in [data-file.ts:290](https://github.com/ozum/edit-config/blob/926f0c9/src/data-file.ts#L290)*

Creates [DataFile](#classesdatafilemd) instance from given data to be saved for given file path.

**Parameters:**

▪ **path**: *string*

is path of the file.

▪ **data**: *object*

is the data to create [DataFile](#classesdatafilemd) from.

▪`Default value`  **__namedParameters**: *object*= {} as any

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`defaultFormat` | [FileFormat](#enumsfileformatmd) | FileFormat.Json | Format to be used if file format cannot be determined from file name. |
`logger` | Logger | console | Winston compatible Logger to be used when logging. |
`prettierConfig` | undefined &#124; null &#124; object | - | Prettier configuration to be used. If not provided determined automatically. |
`rootDataPath` | undefined &#124; null &#124; string &#124; number &#124; undefined &#124; null &#124; string &#124; number[] | - | If only some part of the data/config will be used, this is the data path to be used. For example if this is `scripts`, only `script` key of the data is loaded. |
`rootDir` | undefined &#124; string | - | Root directory for file. If provided, relative path is based on this root directory. |

**Returns:** *[DataFile](#classesdatafilemd)*

[DataFile](#classesdatafilemd) instance.

___

### `Static` load

▸ **load**(`path`: string, `__namedParameters`: object): *Promise‹[DataFile](#classesdatafilemd)›*

*Defined in [data-file.ts:325](https://github.com/ozum/edit-config/blob/926f0c9/src/data-file.ts#L325)*

Reads data from given file. If file is not present returns default data to be saved with  method.

**Parameters:**

▪ **path**: *string*

is path of the file.

▪`Default value`  **__namedParameters**: *object*= {} as any

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`cosmiconfig` | false &#124; true &#124; object | false | Whether to use {@link cosmiconfig https://www.npmjs.com/package/cosmiconfig} to load configuration. Set `true` for default cosmiconfig options or provide an object with `options` for cosmiconfig options and `searchFrom` to provide `cosmiconfig.search()` parameter. |
`defaultData` | undefined &#124; object | - | Default data to be used if file does not exist. |
`defaultFormat` | [FileFormat](#enumsfileformatmd) | FileFormat.Json | Default format to be used if file format cannot be determined from file name and content. |
`logger` | Logger | console | Winston compatible Logger to be used when logging. |
`prettierConfig` | undefined &#124; null &#124; object | - | Prettier configuration to be used. If not provided determined automatically. |
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

*Defined in [manager.ts:14](https://github.com/ozum/edit-config/blob/926f0c9/src/manager.ts#L14)*

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

*Defined in [manager.ts:73](https://github.com/ozum/edit-config/blob/926f0c9/src/manager.ts#L73)*

Creates [DataFile](#classesdatafilemd) instance from given data and caches it.

**Parameters:**

▪ **path**: *string*

is the path of the file. Could be an absolute path or relative to root path option provided to [Manager](#classesmanagermd)

▪ **data**: *object*

is the data to create [DataFile](#classesdatafilemd) from.

▪ **options**: *object*

are options

Name | Type | Description |
------ | ------ | ------ |
`defaultFormat?` | [FileFormat](#enumsfileformatmd) | is the default format to be used if file format cannot be determined from file name. |
`rootDataPath?` | DataPath | If only some part of the data/config will be used, this is the data path to be used. For example if this is `scripts`, only `script` key of the data is loaded. |

**Returns:** *Promise‹[DataFile](#classesdatafilemd)›*

[DataFile](#classesdatafilemd) instance.

___

###  load

▸ **load**(`path`: string, `options`: object): *Promise‹[DataFile](#classesdatafilemd)›*

*Defined in [manager.ts:44](https://github.com/ozum/edit-config/blob/926f0c9/src/manager.ts#L44)*

Reads data from given file and caches it. If file is not present returns default data to be saved with [DataFile.save](#save) or [[save]} methods.
If same data file requested multiple times returns cached data file. Absolute path of the file is used as cache key.

#### Example
```typescript
manager.load("package.json");
manager.load("eslint", { defaultFormat: "json", cosmiconfig: { options: { packageProp: "eslint" }, searchForm: "some/path" } })
```

**Parameters:**

▪ **path**: *string*

is the path of the file. Could be an absolute path or relative to root path option provided to [Manager](#classesmanagermd)

▪`Default value`  **options**: *object*= {}

are options

Name | Type | Description |
------ | ------ | ------ |
`cosmiconfig?` | boolean &#124; object | is whether to use {@link cosmiconfig https://www.npmjs.com/package/cosmiconfig} to load configuration. Set `true` for default cosmiconfig options or provide an object with `options` for cosmiconfig options and `searchFrom` to provide `cosmiconfig.search()` parameter. |
`defaultData?` | any | is the default data to be used if file does not exist. |
`defaultFormat?` | [FileFormat](#enumsfileformatmd) | is the default format to be used if file format cannot be determined from file name and content. |
`rootDataPath?` | DataPath | If only some part of the data/config will be used, this is the data path to be used. For example if this is `scripts`, only `script` key of the data is loaded. |

**Returns:** *Promise‹[DataFile](#classesdatafilemd)›*

[DataFile](#classesdatafilemd) instance.

___

###  loadAll

▸ **loadAll**(`paths`: string[], `options`: object): *Promise‹[DataFile](#classesdatafilemd)[]›*

*Defined in [manager.ts:83](https://github.com/ozum/edit-config/blob/926f0c9/src/manager.ts#L83)*

**Parameters:**

▪ **paths**: *string[]*

▪`Default value`  **options**: *object*= {}

Name | Type |
------ | ------ |
`defaultData?` | any |
`defaultFormat?` | [FileFormat](#enumsfileformatmd) |

**Returns:** *Promise‹[DataFile](#classesdatafilemd)[]›*

___

###  saveAll

▸ **saveAll**(): *Promise‹void›*

*Defined in [manager.ts:87](https://github.com/ozum/edit-config/blob/926f0c9/src/manager.ts#L87)*

**Returns:** *Promise‹void›*

# Enums


<a name="enumsfileformatmd"></a>

# Enumeration: FileFormat

Data file formats.

## Enumeration members

###  Js

• **Js**: = "js"

*Defined in [types.ts:25](https://github.com/ozum/edit-config/blob/926f0c9/src/types.ts#L25)*

___

###  Json

• **Json**: = "json"

*Defined in [types.ts:23](https://github.com/ozum/edit-config/blob/926f0c9/src/types.ts#L23)*

___

###  Unknown

• **Unknown**: = ""

*Defined in [types.ts:26](https://github.com/ozum/edit-config/blob/926f0c9/src/types.ts#L26)*

___

###  Yaml

• **Yaml**: = "yaml"

*Defined in [types.ts:24](https://github.com/ozum/edit-config/blob/926f0c9/src/types.ts#L24)*


