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
    - [LogLevel](#loglevel)
    - [PredicateFunction](#predicatefunction)
    - [ValueFunction](#valuefunction)
    - [WritableFileFormat](#writablefileformat)
- [Classes](#classes)
- [Class: DataFile ‹**T**›](#class-datafile-%E2%80%B9t%E2%80%BA)
  - [Type parameters](#type-parameters)
  - [Hierarchy](#hierarchy)
  - [Properties](#properties)
    - [data](#data)
    - [found](#found)
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
    - [serialize](#serialize)
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
- [Interfaces](#interfaces)
- [Interface: DataFileFromDataOptions](#interface-datafilefromdataoptions)
  - [Hierarchy](#hierarchy-2)
  - [Properties](#properties-1)
    - [`Optional` defaultFormat](#optional-defaultformat)
    - [`Optional` logger](#optional-logger)
    - [`Optional` prettierConfig](#optional-prettierconfig)
    - [`Optional` readOnly](#optional-readonly)
    - [`Optional` rootDataPath](#optional-rootdatapath)
    - [`Optional` rootDir](#optional-rootdir)
    - [`Optional` saveIfChanged](#optional-saveifchanged)
- [Interface: DataFileLoadOptions](#interface-datafileloadoptions)
  - [Hierarchy](#hierarchy-3)
  - [Properties](#properties-2)
    - [`Optional` cosmiconfig](#optional-cosmiconfig)
    - [`Optional` defaultData](#optional-defaultdata)
    - [`Optional` defaultFormat](#optional-defaultformat-1)
    - [`Optional` logger](#optional-logger-1)
    - [`Optional` prettierConfig](#optional-prettierconfig-1)
    - [`Optional` readOnly](#optional-readonly-1)
    - [`Optional` rootDataPath](#optional-rootdatapath-1)
    - [`Optional` rootDir](#optional-rootdir-1)
    - [`Optional` saveIfChanged](#optional-saveifchanged-1)
- [Interface: Logger](#interface-logger)
  - [Hierarchy](#hierarchy-4)
  - [Properties](#properties-3)
    - [log](#log)
- [Interface: ManagerFromDataOptions](#interface-managerfromdataoptions)
  - [Hierarchy](#hierarchy-5)
  - [Properties](#properties-4)
    - [`Optional` defaultFormat](#optional-defaultformat-2)
    - [`Optional` readOnly](#optional-readonly-2)
    - [`Optional` rootDataPath](#optional-rootdatapath-2)
    - [`Optional` saveIfChanged](#optional-saveifchanged-2)
- [Interface: ManagerLoadOptions](#interface-managerloadoptions)
  - [Hierarchy](#hierarchy-6)
  - [Properties](#properties-5)
    - [`Optional` cosmiconfig](#optional-cosmiconfig-1)
    - [`Optional` defaultData](#optional-defaultdata-1)
    - [`Optional` defaultFormat](#optional-defaultformat-3)
    - [`Optional` readOnly](#optional-readonly-3)
    - [`Optional` rootDataPath](#optional-rootdatapath-3)
    - [`Optional` saveIfChanged](#optional-saveifchanged-3)

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

*Defined in [types.ts:12](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L12)*

Data file format.

___

###  LogLevel

Ƭ **LogLevel**: *"error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly"*

*Defined in [types.ts:9](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L9)*

___

###  PredicateFunction

Ƭ **PredicateFunction**: *function*

*Defined in [types.ts:29](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L29)*

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

*Defined in [types.ts:42](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L42)*

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

*Defined in [types.ts:15](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L15)*

Writeable Data file format.

# Classes


<a name="classesdatafilemd"></a>

# Class: DataFile ‹**T**›

Read, edit and write configuration files.

## Type parameters

▪ **T**: *object*

## Hierarchy

* **DataFile**

## Properties

###  data

• **data**: *T*

*Defined in [data-file.ts:44](https://github.com/ozum/edit-config/blob/48c2ac9/src/data-file.ts#L44)*

Actual data

___

###  found

• **found**: *boolean*

*Defined in [data-file.ts:47](https://github.com/ozum/edit-config/blob/48c2ac9/src/data-file.ts#L47)*

Whether file exists or cosmiconfig configuration found.

## Accessors

###  readOnly

• **get readOnly**(): *boolean*

*Defined in [data-file.ts:99](https://github.com/ozum/edit-config/blob/48c2ac9/src/data-file.ts#L99)*

Whether file can be saved using this library.

**Returns:** *boolean*

## Methods

###  delete

▸ **delete**(`path`: DataPath, `__namedParameters`: object): *this*

*Defined in [data-file.ts:168](https://github.com/ozum/edit-config/blob/48c2ac9/src/data-file.ts#L168)*

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

▪`Default value`  **__namedParameters**: *object*= {}

Name | Type |
------ | ------ |
`condition` | undefined &#124; function |

**Returns:** *this*

___

###  get

▸ **get**(`path`: DataPath, `defaultValue?`: any): *any*

*Defined in [data-file.ts:128](https://github.com/ozum/edit-config/blob/48c2ac9/src/data-file.ts#L128)*

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

*Defined in [data-file.ts:222](https://github.com/ozum/edit-config/blob/48c2ac9/src/data-file.ts#L222)*

Returns deleted and modified keys (paths) in data file. Keys may be filtered by required condition.

#### Example
```typescript
dataFile.getModifiedKeys({ include: "scripts", exclude: ["scripts.validate", "scripts.docs"] });
```

**Parameters:**

▪`Default value`  **__namedParameters**: *object*= {}

Name | Type | Description |
------ | ------ | ------ |
`filter` | undefined &#124; function | is a filter function to test whether to include key and type in result. |

**Returns:** *object*

set and deleted keys

* **deleted**: *StringDataPath[]*

* **set**: *StringDataPath[]*

___

###  has

▸ **has**(`path`: DataPath): *boolean*

*Defined in [data-file.ts:113](https://github.com/ozum/edit-config/blob/48c2ac9/src/data-file.ts#L113)*

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

*Defined in [data-file.ts:194](https://github.com/ozum/edit-config/blob/48c2ac9/src/data-file.ts#L194)*

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

*Defined in [data-file.ts:376](https://github.com/ozum/edit-config/blob/48c2ac9/src/data-file.ts#L376)*

Reload data from disk. If file is not present resets data to default data.

**Returns:** *Promise‹this›*

___

###  save

▸ **save**(`__namedParameters`: object): *Promise‹void›*

*Defined in [data-file.ts:277](https://github.com/ozum/edit-config/blob/48c2ac9/src/data-file.ts#L277)*

Saves file. If this is a partial data uses only related part by utilizing `rootDataPath` option.

**Parameters:**

▪`Default value`  **__namedParameters**: *object*= {}

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`throwOnReadOnly` | boolean | true | Whether to throw if file is read only. |

**Returns:** *Promise‹void›*

___

###  serialize

▸ **serialize**(`wholeFile`: boolean): *Promise‹string›*

*Defined in [data-file.ts:299](https://github.com/ozum/edit-config/blob/48c2ac9/src/data-file.ts#L299)*

Returns data serialized as text.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`wholeFile` | boolean | false | is whether to serialize whole file when `rootDataPath` is set. Reads whole file including `rootDataPath` part and serializes whole file data. |

**Returns:** *Promise‹string›*

serialized data as string.

___

###  set

▸ **set**(`path`: DataPath, `value`: any, `__namedParameters`: object): *this*

*Defined in [data-file.ts:146](https://github.com/ozum/edit-config/blob/48c2ac9/src/data-file.ts#L146)*

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

▪`Default value`  **__namedParameters**: *object*= {}

Name | Type |
------ | ------ |
`condition` | undefined &#124; function |

**Returns:** *this*

___

###  sortKeys

▸ **sortKeys**(`path`: DataPath, `__namedParameters`: object): *this*

*Defined in [data-file.ts:269](https://github.com/ozum/edit-config/blob/48c2ac9/src/data-file.ts#L269)*

When keys/values added which are previously does not exist, they are added to the end of the file during file write.
This method allows reordering of the keys in given path. Required keys may be put at the beginning and of the order.

If you would like sort root object (`this.data`) use `sort` method or, provide use empty array `[]` as path, because `undefined`, '' and `null` are valid object keys.
#### Example
```typescript
dataFile.sortKeys("scripts", { start: ["build", "lint"], end: ["release"] });
dataFile.sortKeys({ start: ["name", "description"], end: ["dependencies", "devDependencies"] });
```

**Parameters:**

▪ **path**: *DataPath*

is data path of the property to order keys of.

▪`Default value`  **__namedParameters**: *object*= {}

Name | Type | Description |
------ | ------ | ------ |
`end` | undefined &#124; string[] | are ordered keys to appear at the end of given path when saved.  |
`start` | undefined &#124; string[] | are ordered keys to appear at the beginning of given path when saved. |

**Returns:** *this*

___

### `Static` fromData

▸ **fromData**(`path`: string, `data`: object, `options`: [DataFileFromDataOptions](#interfacesdatafilefromdataoptionsmd)): *Promise‹[DataFile](#classesdatafilemd)›*

*Defined in [data-file.ts:340](https://github.com/ozum/edit-config/blob/48c2ac9/src/data-file.ts#L340)*

Creates [DataFile](#classesdatafilemd) instance from given data to be saved for given file path.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`path` | string | - | is path of the file. |
`data` | object | - | is the data to create [DataFile](#classesdatafilemd) from. |
`options` | [DataFileFromDataOptions](#interfacesdatafilefromdataoptionsmd) | {} | are options. |

**Returns:** *Promise‹[DataFile](#classesdatafilemd)›*

[DataFile](#classesdatafilemd) instance.

___

### `Static` load

▸ **load**(`path`: string, `options?`: [DataFileLoadOptions](#interfacesdatafileloadoptionsmd)): *Promise‹[DataFile](#classesdatafilemd)›*

*Defined in [data-file.ts:357](https://github.com/ozum/edit-config/blob/48c2ac9/src/data-file.ts#L357)*

Reads data from given file. If file is not present returns default data to be saved with  method.

**`throws`** if file exists but cannot be parsed.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`path` | string | is path of the file. |
`options?` | [DataFileLoadOptions](#interfacesdatafileloadoptionsmd) | are options. |

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

*Defined in [manager.ts:13](https://github.com/ozum/edit-config/blob/48c2ac9/src/manager.ts#L13)*

Creates a manager to manage multiple data files.

**Parameters:**

▪`Default value`  **__namedParameters**: *object*= {} as any

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`logger` | [Logger](#interfacesloggermd) | noLogger | is the winston compatible Logger to be used when logging.  |
`root` | string | process.cwd() | is the root path to be used for all relative file paths. |

**Returns:** *[Manager](#classesmanagermd)*

## Methods

###  fromData

▸ **fromData**(`path`: string, `data`: object, `options`: [ManagerFromDataOptions](#interfacesmanagerfromdataoptionsmd)): *Promise‹[DataFile](#classesdatafilemd)›*

*Defined in [manager.ts:56](https://github.com/ozum/edit-config/blob/48c2ac9/src/manager.ts#L56)*

Creates [DataFile](#classesdatafilemd) instance from given data and returns it. Also caches the data.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`path` | string | - | is the path of the file. Could be an absolute path or relative to root path option provided to [Manager](#classesmanagermd) |
`data` | object | - | is the data to create [DataFile](#classesdatafilemd) from. |
`options` | [ManagerFromDataOptions](#interfacesmanagerfromdataoptionsmd) | {} | are options |

**Returns:** *Promise‹[DataFile](#classesdatafilemd)›*

[DataFile](#classesdatafilemd) instance.

___

###  load

▸ **load**(`path`: string, `options`: [ManagerLoadOptions](#interfacesmanagerloadoptionsmd)): *Promise‹[DataFile](#classesdatafilemd)›*

*Defined in [manager.ts:37](https://github.com/ozum/edit-config/blob/48c2ac9/src/manager.ts#L37)*

Reads data from given file and caches it. If file is not present, returns default data to be saved with [DataFile.save](#save) or [[save]} methods.
If same data file requested multiple times returns cached data file. Absolute path of the file is used as cache key.

#### Example
```typescript
manager.load("package.json");
manager.load("eslint", { defaultFormat: "json", cosmiconfig: { options: { packageProp: "eslint" }, searchForm: "some/path" } })
```

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`path` | string | - | is the path of the file. Could be an absolute path or relative to root path option provided to [Manager](#classesmanagermd). |
`options` | [ManagerLoadOptions](#interfacesmanagerloadoptionsmd) | {} | are options |

**Returns:** *Promise‹[DataFile](#classesdatafilemd)›*

[DataFile](#classesdatafilemd) instance.

___

###  loadAll

▸ **loadAll**(`paths`: string[], `options`: object): *Promise‹[DataFile](#classesdatafilemd)[]›*

*Defined in [manager.ts:72](https://github.com/ozum/edit-config/blob/48c2ac9/src/manager.ts#L72)*

Reads data from all given files and caches them. If same data file requested multiple times returns cached data file. Absolute path of the file is used as cache key.

**Parameters:**

▪ **paths**: *string[]*

are arry of paths of the files. Could be an absolute path or relative to root path option provided to [Manager](#classesmanagermd).

▪`Default value`  **options**: *object*= {}

are options.

Name | Type |
------ | ------ |
`defaultData?` | any |
`defaultFormat?` | [WritableFileFormat](#writablefileformat) |
`readOnly?` | undefined &#124; false &#124; true |

**Returns:** *Promise‹[DataFile](#classesdatafilemd)[]›*

___

###  saveAll

▸ **saveAll**(): *Promise‹void›*

*Defined in [manager.ts:79](https://github.com/ozum/edit-config/blob/48c2ac9/src/manager.ts#L79)*

**Returns:** *Promise‹void›*

# Interfaces


<a name="interfacesdatafilefromdataoptionsmd"></a>

# Interface: DataFileFromDataOptions

[DataFile.fromData](#static-fromdata) options.

## Hierarchy

* [ManagerFromDataOptions](#interfacesmanagerfromdataoptionsmd)

  ↳ **DataFileFromDataOptions**

  ↳ [DataFileLoadOptions](#interfacesdatafileloadoptionsmd)

## Properties

### `Optional` defaultFormat

• **defaultFormat**? : *[WritableFileFormat](#writablefileformat)*

*Inherited from [ManagerFromDataOptions](#interfacesmanagerfromdataoptionsmd).[defaultFormat](#optional-defaultformat)*

*Defined in [types.ts:58](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L58)*

The default format to be used if file format cannot be determined from file name and content.

___

### `Optional` logger

• **logger**? : *[Logger](#interfacesloggermd)*

*Defined in [types.ts:78](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L78)*

Winston compatible Logger to be used when logging.

___

### `Optional` prettierConfig

• **prettierConfig**? : *PrettierConfig*

*Defined in [types.ts:82](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L82)*

Prettier configuration to be used. If not provided determined automatically.

___

### `Optional` readOnly

• **readOnly**? : *undefined | false | true*

*Inherited from [ManagerFromDataOptions](#interfacesmanagerfromdataoptionsmd).[readOnly](#optional-readonly)*

*Defined in [types.ts:62](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L62)*

Whether file can be saved using this library.

___

### `Optional` rootDataPath

• **rootDataPath**? : *DataPath*

*Inherited from [ManagerFromDataOptions](#interfacesmanagerfromdataoptionsmd).[rootDataPath](#optional-rootdatapath)*

*Defined in [types.ts:60](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L60)*

If only some part of the data/config will be used, this is the data path to be used. For example if this is `scripts`, only `script` key of the data is loaded.

___

### `Optional` rootDir

• **rootDir**? : *undefined | string*

*Defined in [types.ts:80](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L80)*

Root directory for file. If provided, relative path is based on this root directory.

___

### `Optional` saveIfChanged

• **saveIfChanged**? : *undefined | false | true*

*Inherited from [ManagerFromDataOptions](#interfacesmanagerfromdataoptionsmd).[saveIfChanged](#optional-saveifchanged)*

*Defined in [types.ts:64](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L64)*

Save only if data is changed. Clones initial data deeply to check during save.


<a name="interfacesdatafileloadoptionsmd"></a>

# Interface: DataFileLoadOptions

[[DatFile.load]] options.

## Hierarchy

  ↳ [DataFileFromDataOptions](#interfacesdatafilefromdataoptionsmd)

  ↳ **DataFileLoadOptions**

## Properties

### `Optional` cosmiconfig

• **cosmiconfig**? : *boolean | object*

*Defined in [types.ts:90](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L90)*

Whether to use [https://www.npmjs.com/package/cosmiconfig](#optional-cosmiconfig) to load configuration. Set `true` for default cosmiconfig options or provide an object with `options` for cosmiconfig options and `searchFrom` to provide `cosmiconfig.search()` parameter.

___

### `Optional` defaultData

• **defaultData**? : *undefined | object*

*Defined in [types.ts:88](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L88)*

If only some part of the data/config will be used, this is the data path to be used. For example if this is `scripts`, only `script` key of the data is loaded.

___

### `Optional` defaultFormat

• **defaultFormat**? : *[WritableFileFormat](#writablefileformat)*

*Inherited from [ManagerFromDataOptions](#interfacesmanagerfromdataoptionsmd).[defaultFormat](#optional-defaultformat)*

*Defined in [types.ts:58](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L58)*

The default format to be used if file format cannot be determined from file name and content.

___

### `Optional` logger

• **logger**? : *[Logger](#interfacesloggermd)*

*Inherited from [DataFileFromDataOptions](#interfacesdatafilefromdataoptionsmd).[logger](#optional-logger)*

*Defined in [types.ts:78](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L78)*

Winston compatible Logger to be used when logging.

___

### `Optional` prettierConfig

• **prettierConfig**? : *PrettierConfig*

*Inherited from [DataFileFromDataOptions](#interfacesdatafilefromdataoptionsmd).[prettierConfig](#optional-prettierconfig)*

*Defined in [types.ts:82](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L82)*

Prettier configuration to be used. If not provided determined automatically.

___

### `Optional` readOnly

• **readOnly**? : *undefined | false | true*

*Inherited from [ManagerFromDataOptions](#interfacesmanagerfromdataoptionsmd).[readOnly](#optional-readonly)*

*Defined in [types.ts:62](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L62)*

Whether file can be saved using this library.

___

### `Optional` rootDataPath

• **rootDataPath**? : *DataPath*

*Inherited from [ManagerFromDataOptions](#interfacesmanagerfromdataoptionsmd).[rootDataPath](#optional-rootdatapath)*

*Defined in [types.ts:60](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L60)*

If only some part of the data/config will be used, this is the data path to be used. For example if this is `scripts`, only `script` key of the data is loaded.

___

### `Optional` rootDir

• **rootDir**? : *undefined | string*

*Inherited from [DataFileFromDataOptions](#interfacesdatafilefromdataoptionsmd).[rootDir](#optional-rootdir)*

*Defined in [types.ts:80](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L80)*

Root directory for file. If provided, relative path is based on this root directory.

___

### `Optional` saveIfChanged

• **saveIfChanged**? : *undefined | false | true*

*Inherited from [ManagerFromDataOptions](#interfacesmanagerfromdataoptionsmd).[saveIfChanged](#optional-saveifchanged)*

*Defined in [types.ts:64](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L64)*

Save only if data is changed. Clones initial data deeply to check during save.


<a name="interfacesloggermd"></a>

# Interface: Logger

Logger

## Hierarchy

* **Logger**

## Properties

###  log

• **log**: *function*

*Defined in [types.ts:6](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L6)*

#### Type declaration:

▸ (...`args`: Array‹any›): *any*

**Parameters:**

Name | Type |
------ | ------ |
`...args` | Array‹any› |


<a name="interfacesmanagerfromdataoptionsmd"></a>

# Interface: ManagerFromDataOptions

[Manager.fromData](#fromdata) options.

## Hierarchy

* **ManagerFromDataOptions**

  ↳ [ManagerLoadOptions](#interfacesmanagerloadoptionsmd)

  ↳ [DataFileFromDataOptions](#interfacesdatafilefromdataoptionsmd)

## Properties

### `Optional` defaultFormat

• **defaultFormat**? : *[WritableFileFormat](#writablefileformat)*

*Defined in [types.ts:58](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L58)*

The default format to be used if file format cannot be determined from file name and content.

___

### `Optional` readOnly

• **readOnly**? : *undefined | false | true*

*Defined in [types.ts:62](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L62)*

Whether file can be saved using this library.

___

### `Optional` rootDataPath

• **rootDataPath**? : *DataPath*

*Defined in [types.ts:60](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L60)*

If only some part of the data/config will be used, this is the data path to be used. For example if this is `scripts`, only `script` key of the data is loaded.

___

### `Optional` saveIfChanged

• **saveIfChanged**? : *undefined | false | true*

*Defined in [types.ts:64](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L64)*

Save only if data is changed. Clones initial data deeply to check during save.


<a name="interfacesmanagerloadoptionsmd"></a>

# Interface: ManagerLoadOptions

[Manager.load](#load) options.

## Hierarchy

* [ManagerFromDataOptions](#interfacesmanagerfromdataoptionsmd)

  ↳ **ManagerLoadOptions**

## Properties

### `Optional` cosmiconfig

• **cosmiconfig**? : *boolean | object*

*Defined in [types.ts:72](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L72)*

Whether to use [https://www.npmjs.com/package/cosmiconfig](#optional-cosmiconfig) to load configuration. Set `true` for default cosmiconfig options or provide an object with `options` for cosmiconfig options and `searchFrom` to provide `cosmiconfig.search()` parameter.

___

### `Optional` defaultData

• **defaultData**? : *any*

*Defined in [types.ts:70](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L70)*

The default data to be used if file does not exist.

___

### `Optional` defaultFormat

• **defaultFormat**? : *[WritableFileFormat](#writablefileformat)*

*Inherited from [ManagerFromDataOptions](#interfacesmanagerfromdataoptionsmd).[defaultFormat](#optional-defaultformat)*

*Defined in [types.ts:58](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L58)*

The default format to be used if file format cannot be determined from file name and content.

___

### `Optional` readOnly

• **readOnly**? : *undefined | false | true*

*Inherited from [ManagerFromDataOptions](#interfacesmanagerfromdataoptionsmd).[readOnly](#optional-readonly)*

*Defined in [types.ts:62](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L62)*

Whether file can be saved using this library.

___

### `Optional` rootDataPath

• **rootDataPath**? : *DataPath*

*Inherited from [ManagerFromDataOptions](#interfacesmanagerfromdataoptionsmd).[rootDataPath](#optional-rootdatapath)*

*Defined in [types.ts:60](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L60)*

If only some part of the data/config will be used, this is the data path to be used. For example if this is `scripts`, only `script` key of the data is loaded.

___

### `Optional` saveIfChanged

• **saveIfChanged**? : *undefined | false | true*

*Inherited from [ManagerFromDataOptions](#interfacesmanagerfromdataoptionsmd).[saveIfChanged](#optional-saveifchanged)*

*Defined in [types.ts:64](https://github.com/ozum/edit-config/blob/48c2ac9/src/types.ts#L64)*

Save only if data is changed. Clones initial data deeply to check during save.


