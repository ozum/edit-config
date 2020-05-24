# edit-config



Read, manipulate, write configuration files.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Synopsis](#synopsis)
- [Details](#details)
- [API](#api)
- [edit-config](#edit-config)
  - [Type aliases](#type-aliases)
    - [PredicateFn](#predicatefn)
- [Classes](#classes)
- [Class: DataFile](#class-datafile)
  - [Hierarchy](#hierarchy)
  - [Properties](#properties)
    - [data](#data)
  - [Methods](#methods)
    - [delete](#delete)
    - [get](#get)
    - [getModifiedKeys](#getmodifiedkeys)
    - [has](#has)
    - [merge](#merge)
    - [orderKeys](#orderkeys)
    - [reload](#reload)
    - [save](#save)
    - [set](#set)
    - [`Static` load](#static-load)
- [Class: Manager](#class-manager)
  - [Hierarchy](#hierarchy-1)
  - [Constructors](#constructors)
    - [constructor](#constructor)
  - [Methods](#methods-1)
    - [load](#load)
    - [loadAll](#loadall)
    - [saveAll](#saveall)
- [Enums](#enums)
- [Enumeration: FileFormat](#enumeration-fileformat)
  - [Enumeration members](#enumeration-members)
    - [Json](#json)
    - [Yaml](#yaml)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# Synopsis

```ts
import { DataFile, Manager, get, has, isEqual } from "edit-config";

// Optional logger. Default logger is console.
const winstonLogger = createLogger({
  level: "debug",
  format: format.combine(format.colorize(), format.splat(), format.simple()),
  transports: [new transports.Console()],
});

// Create manager and load files.
const manager = new Manager({ root: ".", logger: winstonLogger });
const [packageJson, tsconfig] = await manager.loadAll(["package.json", "tsconfig.json"]);

packageJson.set("scripts.build", "tsc");
packageJson.set("scripts.build", "tsc", (value) => value === undefined);
packageJson.merge("scripts", { build: "tsc", test: "jest" }, (value, key, data, path, rootData) => rootData.get("scripts") === undefined);

tsconfig.set("compilerOptions.target", "esnext");

await manager.saveAll();
```

It is possible to use `DataFile` directly without manager.

```ts
const packageJson = await DataFile.load("package.json");
```


# Details

`Manager` and `DataFile` classes proivdes utility methods for loading, manipulating and saving `JSON` and `YAML` configuration files.

**Highlights:**

* `load()` and `loadAll()` do not throw even files do not exist. Instead return default data (if provided), or empty object.
* Data manipulation operations do not write to disk until `save()` or `saveAll()` called.
* `Manager.load()` and `Manager.loadAll()` methods cache loaded files and return cached results in consequencing calls. Use `DataFile.reload()` to reload from disk.
<!-- usage -->

<!-- commands -->

# API


<a name="readmemd"></a>

# edit-config

## Type aliases

###  PredicateFn

Ƭ **PredicateFn**: *function*

Defined in types.ts:39

#### Type declaration:

▸ (`value`: any, `key`: Key, `data`: object, `path`: Key[], `rootData`: [DataFile](#classesdatafilemd)): *boolean*

Callback function to test whether operation should be performed. If result is false, operation is not performed.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`value` | any | is the value to be modified. |
`key` | Key | is the key of the changed value. |
`data` | object | is the object/array to get value from. |
`path` | Key[] | is the full data path of the value in root data. |
`rootData` | [DataFile](#classesdatafilemd) | is the root data array/object. |

# Classes


<a name="classesdatafilemd"></a>

# Class: DataFile

Manages and edit a configuration data file.

## Hierarchy

* **DataFile**

## Properties

###  data

• **data**: *object*

Defined in data-file.ts:28

Actual data

## Methods

###  delete

▸ **delete**(`path`: DataPath, `predicateFn?`: [PredicateFn](#predicatefn)): *this*

Defined in data-file.ts:122

Deletes the property at `path` of file data.

#### Example
```typescript
const packageJson = targetModule.getDataFileSync("package.json"); // `DataFile` instance
packageJson
  .delete("script.build")
  .delete(["scripts", "test"], (value) => value !== "jest");
```

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`path` | DataPath | is data path of the property to delete. |
`predicateFn?` | [PredicateFn](#predicatefn) | is the function to test whether operation should be performed. If result is false, operation is not performed.  |

**Returns:** *this*

___

###  get

▸ **get**(`path`: DataPath, `defaultValue?`: any): *any*

Defined in data-file.ts:82

Gets the value at `path` of file data. If the resolved value is undefined, the `defaultValue` is returned in its place.

#### Example
```typescript
const packageJson = await DataFile.get("package.json");
packageJson.get("script.build");
packageJson.get(["script", "build"]);
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

Defined in data-file.ts:188

Returns deleted and modified keys (paths) in data file. Keys may be filtered by required condition.

#### Example
```typescript
dataFile.getModifiedKeys({ include: "scripts", exclude: ["scripts.validate", "scripts.docs"] });
```

**Parameters:**

▪`Default value`  **__namedParameters**: *object*= {}

Name | Type | Description |
------ | ------ | ------ |
`exclude` | undefined &#124; string &#124; string[] | is string or array of strings, of which keys starting with is excluded. |
`include` | undefined &#124; string &#124; string[] | is string or array of strings, of which keys starting with is included. |

**Returns:** *object*

modified keys

* **deleted**: *string[]*

* **set**: *string[]*

___

###  has

▸ **has**(`path`: DataPath): *boolean*

Defined in data-file.ts:66

Returns whether given `path` exists in file data.

#### Example
```typescript
const packageJson = await DataFile.get("package.json");
packageJson.has("script.build");
packageJson.has(["script", "build"]);
```

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`path` | DataPath | is data path of the property to check. |

**Returns:** *boolean*

whether path exists.

___

###  merge

▸ **merge**(`value`: any, `predicateFn?`: [PredicateFn](#predicatefn)): *this*

Defined in data-file.ts:145

This method is like _.assign except that it recursively merges own and inherited enumerable string keyed properties of source objects
into the destination object. Source properties that resolve to undefined are skipped if a destination value exists.
Array and plain object properties are merged recursively. Other objects and value types are overridden by assignment.
Source objects are applied from left to right. Subsequent sources overwrite property assignments of previous sources.

#### Example
```typescript
const packageJson = targetModule.getDataFileSync("package.json"); // `DataFile` instance
packageJson.assign({ name: "some-module", version: "1.0.0", }, (data) => data.name === "undefined");
```

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`value` | any | is the object to merge given path. |
`predicateFn?` | [PredicateFn](#predicatefn) | is the function to test whether operation should be performed. If result is false, operation is not performed.  |

**Returns:** *this*

▸ **merge**(`path`: DataPath, `value`: any, `predicateFn?`: [PredicateFn](#predicatefn)): *this*

Defined in data-file.ts:160

This method is like _.assign except that it recursively merges own and inherited enumerable string keyed properties of source objects
into the destination object. Source properties that resolve to undefined are skipped if a destination value exists.
Array and plain object properties are merged recursively. Other objects and value types are overridden by assignment.
Source objects are applied from left to right. Subsequent sources overwrite property assignments of previous sources.

#### Example
```typescript
const packageJson = targetModule.getDataFileSync("package.json"); // `DataFile` instance
packageJson.assign("scripts", { build: "tsc", test: "jest", }, (scripts) => scripts.build !== "someCompiler");
```

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`path` | DataPath | is data path of the property to delete. |
`value` | any | is the object to merge given path. |
`predicateFn?` | [PredicateFn](#predicatefn) | is the function to test whether operation should be performed. If result is false, operation is not performed.  |

**Returns:** *this*

___

###  orderKeys

▸ **orderKeys**(`pathOrOptions?`: DataPath, `optionsOrVoid?`: undefined | object): *this*

Defined in data-file.ts:209

When keys/values added which are previously does not exist, they are added to the end of the file during file write.
This method allows reordering of the keys in given path. `keys` are placed at the beginning in given order whereas remaining keys
of the object comes in their order of position.

#### Example
```typescript
const packageJson = targetModule.getDataFileSync("package.json"); // `DataFile` instance
packageJson.orderKeysOf("scripts", ["build", "lint"]); // Other keys come after.
```

**Parameters:**

Name | Type |
------ | ------ |
`pathOrOptions?` | DataPath |
`optionsOrVoid?` | undefined &#124; object |

**Returns:** *this*

___

###  reload

▸ **reload**(): *Promise‹this›*

Defined in data-file.ts:319

Reload data from disk. If file is not present resets data to default data.

**Returns:** *Promise‹this›*

___

###  save

▸ **save**(): *Promise‹void›*

Defined in data-file.ts:224

Saves file.

**Returns:** *Promise‹void›*

___

###  set

▸ **set**(`path`: DataPath, `value`: any, `predicateFn?`: [PredicateFn](#predicatefn)): *this*

Defined in data-file.ts:100

Sets the value at `path` of file data. If a portion of path doesn't exist, it's created.
Arrays are created for missing index properties while objects are created for all other missing properties.

#### Example
```typescript
const packageJson = targetModule.getDataFileSync("package.json"); // `DataFile` instance
packageJson
  .set("script.build", "tsc")
  .set(["scripts", "test"], "jest", (value) => value !== "mocha");
```

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`path` | DataPath | is data path of the property to set. |
`value` | any | is value to set. |
`predicateFn?` | [PredicateFn](#predicatefn) | is the function to test whether operation should be performed. If result is false, operation is not performed.  |

**Returns:** *this*

___

### `Static` load

▸ **load**<**T**>(`path`: string, `__namedParameters`: object): *Promise‹[DataFile](#classesdatafilemd)›*

Defined in data-file.ts:283

Reads data from given file. If file is not present returns default data to be saved with  method.

**Type parameters:**

▪ **T**: *object*

**Parameters:**

▪ **path**: *string*

is ısuhsıu

▪`Default value`  **__namedParameters**: *object*= {} as any

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`defaultData` | T | {} as T | Default data to be used if file does not exist. |
`defaultFormat` | [FileFormat](#enumsfileformatmd) | FileFormat.Json | Default format to be used if file format cannot be determined from file name and content. |
`logger` | Logger | console | Winston compatible Logger to be used when logging. |
`prettierConfig` | undefined &#124; null &#124; object | - | Prettier configuration to be used. If not provided determined automatically. |
`shortPath` | string | "" | Short file path to be used in logs. |

**Returns:** *Promise‹[DataFile](#classesdatafilemd)›*


<a name="classesmanagermd"></a>

# Class: Manager

Manage multiple configuration files.

## Hierarchy

* **Manager**

## Constructors

###  constructor

\+ **new Manager**(`__namedParameters`: object): *[Manager](#classesmanagermd)*

Defined in manager.ts:13

Creates a manager to manage multiple data files.

**Parameters:**

▪`Default value`  **__namedParameters**: *object*= {}

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`logger` | Logger | console as Logger | Winston compatible Logger to be used when logging. |
`root` | string | "" | Root path to be used for all relative file paths |

**Returns:** *[Manager](#classesmanagermd)*

## Methods

###  load

▸ **load**(`path`: string, `options`: object): *Promise‹[DataFile](#classesdatafilemd)›*

Defined in manager.ts:38

Reads data from given file and caches it. If file is not present returns default data to be saved with [DataFile.save](#save) or [[save]} methods.
If same data file requested multiple times returns cached data file. Absolute path of the file is used as cache key.

**Parameters:**

▪ **path**: *string*

is the path of the file. Coul be an absolute path or relative to root path option provided to [Manager](#classesmanagermd)

▪`Default value`  **options**: *object*= {}

are options

Name | Type | Description |
------ | ------ | ------ |
`defaultData?` | any | is the default data to be used if file does not exist. |
`defaultFormat?` | [FileFormat](#enumsfileformatmd) | is the default format to be used if file format cannot be determined from file name and content. |

**Returns:** *Promise‹[DataFile](#classesdatafilemd)›*

[DataFile](#classesdatafilemd) instance.

___

###  loadAll

▸ **loadAll**(`paths`: string[], `options`: object): *Promise‹[DataFile](#classesdatafilemd)[]›*

Defined in manager.ts:49

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

Defined in manager.ts:53

**Returns:** *Promise‹void›*

# Enums


<a name="enumsfileformatmd"></a>

# Enumeration: FileFormat

Data file formats.

## Enumeration members

###  Json

• **Json**: = "json"

Defined in types.ts:26

___

###  Yaml

• **Yaml**: = "yaml"

Defined in types.ts:27


